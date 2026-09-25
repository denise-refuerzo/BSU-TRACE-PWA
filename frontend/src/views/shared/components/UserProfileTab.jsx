import React, { useState, useEffect } from 'react';
import ProfilePicture from './ProfilePicture';
import { Building, User, ShieldCheck, Landmark, Download, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import Swal from 'sweetalert2';
import { fetchWithAuth } from '../../../api'; 

export default function UserProfileTab({
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  facultyId,
  officeName,
  twoFaEnabled,
  setTwoFaEnabled, 
  handleUpdateProfile,
  setShowPassModal
}) {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const userId = localStorage.getItem('userId');

  // --- 2FA Modal States ---
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pending2FAState, setPending2FAState] = useState(null); // true = turning ON, false = turning OFF
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // --- 2FA Countdown States ---
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [otpClock, setOtpClock] = useState(Date.now());

  useEffect(() => {
    if (!show2FAModal) return;
    const timer = setInterval(() => setOtpClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [show2FAModal]);

  const secondsLeft = Math.max(0, Math.ceil(((otpExpiresAt || 0) - otpClock) / 1000));
  const resendSeconds = Math.max(0, Math.ceil(((resendAvailableAt || 0) - otpClock) / 1000));
  const formatCountdown = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  // --- Handle Checkbox Toggle ---
  const handle2FAToggle = async (checked) => {
    // Both turning ON and OFF now require an OTP verification
    try {
      Swal.fire({
        title: 'Sending Code...',
        text: 'Please wait while we dispatch your verification email.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const requestRes = await fetchWithAuth(`/api/users/${userId}/request-profile-otp`, { method: 'POST' });
      if (!requestRes.ok) throw new Error('Failed to dispatch email.');

      // Setup modal state
      setPending2FAState(checked); // Remember if they checked or unchecked the box
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setResendAvailableAt(Date.now() + 60 * 1000);
      setOtpCode('');
      setError('');
      setShow2FAModal(true);
      Swal.close();

    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Network Error', text: 'Failed to communicate with authentication server.' });
    }
  };

  // --- Verify OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Direct the request to the correct endpoint based on what the user is trying to do
      const endpoint = pending2FAState 
        ? `/api/profile/${userId}/verify-enable-2fa` 
        : `/api/profile/${userId}/verify-disable-2fa`;

      const verifyRes = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode })
      });

      const data = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(data.error || 'The verification code was incorrect.');
      }

      // Success
      if (setTwoFaEnabled) setTwoFaEnabled(pending2FAState);
      setShow2FAModal(false);
      
      if (pending2FAState) {
        Swal.fire({ icon: 'success', title: 'Secured!', text: 'Email Two-Factor Authentication is now active.', confirmButtonColor: '#D32F2F' });
      } else {
        Swal.fire({ icon: 'success', title: 'Disabled', text: 'Two-Factor Authentication has been turned off.', confirmButtonColor: '#D32F2F' });
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Resend OTP ---
  const handleResendOTP = async () => {
    setError(''); 
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/users/${userId}/request-profile-otp`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Unable to resend verification code');
      
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setResendAvailableAt(Date.now() + 60 * 1000);
      Swal.fire({title: 'New code sent', text: 'A fresh verification code was sent to your university email.', icon: 'success', confirmButtonColor: '#D32F2F'});
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* 2FA MODAL OVERLAY */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-opacity duration-300">  
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6 transform transition-all scale-100">  
            <div className="w-16 h-16 bg-red-50 text-[#D32F2F] rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>  
            <div>
              <h4 className="text-xl font-bold text-gray-900">Security Verification</h4>  
              <p className="text-sm text-gray-500 mt-2">Enter the 6-digit OTP code sent to your university email to {pending2FAState ? 'enable' : 'disable'} 2FA.</p>  
            </div>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}  
            <form onSubmit={handleVerifyOTP} className="space-y-5">  
              <input 
                type="text" 
                maxLength={6} 
                required 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}  
                placeholder="000000" 
                className="w-full border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] rounded-xl focus:border-[#D32F2F] focus:ring-2 focus:ring-red-100 focus:outline-none transition-all" 
              />
              <p className={`text-xs ${secondsLeft ? 'text-gray-500' : 'text-red-600'} font-medium`}>{secondsLeft ? `Code expires in ${formatCountdown(secondsLeft)}` : 'This code has expired. Request a new code.'}</p>
              <button type="button" disabled={isSubmitting || resendSeconds > 0} onClick={handleResendOTP} className="text-sm text-[#D32F2F] font-semibold hover:underline disabled:opacity-50">{resendSeconds ? `Resend available in ${formatCountdown(resendSeconds)}` : 'Resend code'}</button>
              <div className="flex gap-3 pt-2">  
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => { setShow2FAModal(false); setOtpCode(''); setError(''); }} 
                  className="w-1/2 border border-gray-300 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>  
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-1/2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-sm font-medium rounded-lg py-2.5 transition-colors shadow-md disabled:opacity-70 flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : 'Confirm'}
                </button>  
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-neutral-900 leading-none">Profile Settings</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">Manage your administrative credentials and security preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Header Profile Banner */}
        <div className="lg:col-span-3 bg-white border border-neutral-200 p-6 rounded-2xl flex flex-wrap items-center gap-6 shadow-sm">
          <ProfilePicture name={profileName} />
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-neutral-900">{profileName || 'Portal User'}</h3>
              <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">Authority</span>
            </div>
            <p className="text-xs text-neutral-400 font-bold flex items-center gap-1.5">
              <Building size={12} /> Unit Sector • {officeName}
            </p>
            <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Security Seal Status: Active
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
              <User size={16} className="text-red-800" />
              <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Personal Information & Recovery Settings</h4>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Full Authority Name</label>
                  <input type="text" required value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none bg-neutral-50 font-bold text-neutral-800 focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">System Recovery Email Address</label>
                  <input type="email" required value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none bg-neutral-50 font-bold text-neutral-800 focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl uppercase tracking-wide transition-all shadow-sm">Save Profiles Changes</button>
              </div>
            </form>
          </div>

          {/* Security Protocols */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-2">
              <ShieldCheck size={16} className="text-red-800" />
              <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Account Security Protocols</h4>
            </div>
            
            <div className="border border-neutral-200 rounded-xl p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
              <div>
                <h5 className="text-xs font-black text-neutral-900">Change Account Password</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Update your administrative account passcode credentials regularly.</p>
              </div>
              <button onClick={() => setShowPassModal(true)} className="text-xs font-black text-red-800 hover:text-red-900 hover:underline px-2">Update</button>
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-4 hover:bg-neutral-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-black text-neutral-900">Secondary Two-Factor Authentication PIN</h5>
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Enforce secondary multi-factor challenge prompt criteria upon account entry checkpoints.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" checked={twoFaEnabled} onChange={e => handle2FAToggle(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-800"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Application Access & PWA Installation */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Download size={16} className="text-red-800" />
              <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Application Access</h4>
            </div>

            {isInstalled ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold">
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                <span>BSU-Trace is installed on this device.</span>
              </div>
            ) : isInstallable ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Install BSU-Trace as a standalone desktop/mobile application for quick launch and offline access.
                </p>
                <button
                  type="button"
                  onClick={installApp}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl uppercase tracking-wide transition-all shadow-sm"
                >
                  <Download size={14} /> Install BSU-Trace App
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 text-xs font-medium">
                Application installation is already complete or not supported in this browser mode.
              </div>
            )}
          </div>

          {/* Institutional Data Panel */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
              <Landmark size={16} className="text-neutral-500" />
              <h4 className="text-xs uppercase font-black text-neutral-900 tracking-wider">Institutional Data Placement</h4>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wide block">Authority Faculty Identifier</span>
                <p className="font-black text-neutral-900 text-sm mt-0.5">{facultyId}</p>
              </div>
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wide block">Campus Assigned Terminal Branch Unit</span>
                <p className="font-bold text-neutral-700 mt-0.5">{officeName}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50/40 border border-red-100 rounded-2xl p-4 text-[11px] leading-relaxed text-neutral-500 font-medium">
            ℹ️ <span className="font-bold text-neutral-800">Note:</span> Maintaining institutional profile bindings and role configurations falls under the jurisdiction of the University Central Registry Database console. Contact <span className="text-red-800 font-bold hover:underline cursor-pointer">Campus IT Support</span> for configuration adjustments.
          </div>
        </div>
      </div>
    </div>
  );
}