import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Terms & Conditions States
  const [showTerms, setShowTerms] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);
  
  // 2FA Flow States
  const [require2FA, setRequire2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Forgot Password Workspace States  
  const [showForgotModal, setShowForgotModal] = useState(false);  
  const [forgotStep, setForgotStep] = useState(1); 
  const [forgotUsername, setForgotUsername] = useState('');  
  const [maskedEmail, setMaskedEmail] = useState('');  
  const [typedEmail, setTypedEmail] = useState('');  
  const [resetCode, setResetCode] = useState('');  
  const [newPassword, setNewPassword] = useState('');  
  const [confirmPassword, setConfirmPassword] = useState('');  
  const [forgotError, setForgotError] = useState('');  
  const [forgotSuccess, setForgotSuccess] = useState('');  

  // Password Visibility States
  const [showSignInPassword, setShowSignInPassword] = useState(false);  
  const [showNewPassword, setShowNewPassword] = useState(false);  
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);  

  // --- STEP 1: INITIAL LOGIN CONTROLLER ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })  
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');  
      }

      if (data.two_fa_enabled) {
        setTempUserId(data.u_id);
        setRequire2FA(true);  
        Swal.fire({
          title: 'Verification Required',
          text: 'A 6-digit verification code has been sent to your university email.',
          icon: 'info',
          confirmButtonColor: '#D32F2F'
        });
        setIsSubmitting(false);
        return; 
      }

      setPendingLoginData(data);
      setShowTerms(true);
      
    } catch (err) {
      setError(err.message);  
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STEP 2: 2FA OTP VERIFICATION CONTROLLER ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, otpCode: otpCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setPendingLoginData(data);
      setShowTerms(true);
      setRequire2FA(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FINAL ROUTING ---
  const completeLogin = (data) => {
    sessionStorage.removeItem('bsu_pwa_banner_dismissed');
    localStorage.setItem('token', data.token);  
    localStorage.setItem('user', data.fullName);  
    const cleanUserId = String(data.userId || data.u_id).split(':')[0].trim();  
    localStorage.setItem('userId', cleanUserId);  

    const role = data.role || data.a_id;
    if (role === 5) {
      navigate('/admin/dashboard');  
    } else if (role === 2) {
      navigate('/processor/dashboard');   
    } else if (role === 3) {
      navigate('/signee/dashboard');   
    } else if (role === 4) {
      navigate('/gso-dashboard'); 
    } else {
      navigate('/dashboard');    
    }
  };

  // FORGOT PASSWORD STEP 1: Verify Username exists  
  const handleIdentifyUser = async (e) => {
    e.preventDefault();  
    setForgotError('');  
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/identify`, {
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ username: forgotUsername })  
      });
      const data = await res.json();  
      if (!res.ok) throw new Error(data.error || 'User verification failed.');  
      
      setMaskedEmail(data.maskedEmail);  
      setForgotStep(2);  
    } catch (err) {
      setForgotError(err.message);  
    } finally {
      setIsSubmitting(false);
    }
  };

  // FORGOT PASSWORD STEP 2 & 3: Match Email precisely and request OTP dispatch  
  const handleVerifyEmail = async (e) => {
    e.preventDefault();  
    setForgotError('');  
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify-email`, {
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ username: forgotUsername, fullEmail: typedEmail })  
      });
      const data = await res.json();  
      if (!res.ok) throw new Error(data.error || 'Email challenge failed.');  
      
      setForgotStep(3);  
    } catch (err) {
      setForgotError(err.message);  
    } finally {
      setIsSubmitting(false);
    }
  };

  // FORGOT PASSWORD STEP 4: Reset Password Commitment  
  const handleResetPassword = async (e) => {
    e.preventDefault();  
    setForgotError('');  
    
    if (newPassword !== confirmPassword) {
      setForgotError('New passwords do not match.');  
      return;  
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ username: forgotUsername, code: resetCode, newPassword })  
      });
      const data = await res.json();  
      if (!res.ok) throw new Error(data.error || 'Password adjustment sequence failed.');  
      
      setForgotSuccess(data.message);  
      setForgotStep(4);  
    } catch (err) {
      setForgotError(err.message);  
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);  
    setForgotStep(1);  
    setForgotUsername('');  
    setMaskedEmail('');  
    setTypedEmail('');  
    setResetCode('');  
    setNewPassword('');  
    setConfirmPassword('');  
    setForgotError('');  
    setForgotSuccess('');  
    setShowSignInPassword(false);  
    setShowNewPassword(false);  
    setShowConfirmPassword(false);  
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex font-sans antialiased selection:bg-[#D32F2F] selection:text-white">
      
      {/* 2FA CONDITIONAL OVERLAY FORM */}
      {require2FA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">  
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6 transform transition-all scale-100">  
            <div className="w-16 h-16 bg-red-50 text-[#D32F2F] rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>  
            <div>
              <h4 className="text-xl font-bold text-gray-900">Security Verification</h4>  
              <p className="text-sm text-gray-500 mt-2">Enter the 6-digit OTP code sent to your university email.</p>  
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
              <div className="flex gap-3 pt-2">  
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => { setRequire2FA(false); setOtpCode(''); setError(''); setTempUserId(null); }} 
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

      {/* ORIGINAL TERMS & CONDITIONS OVERLAY */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all scale-100">
            
            <div className="bg-gray-50 border-b border-gray-200 py-5 px-6 shrink-0 flex items-center gap-4">
              <img src="/bsu-logo.png" alt="BSU" className="h-10 w-auto" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">BSU-Trace Terms & Conditions</h2>
                <p className="text-xs text-[#D32F2F] font-semibold uppercase tracking-wider mt-0.5">Smart Campus Resource Management System</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6 text-sm text-gray-600 leading-relaxed custom-scrollbar">
              <section>
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#D32F2F] flex items-center justify-center text-xs">1</span>
                  Introduction and Scope
                </h3>
                <p className="pl-8 text-justify">Welcome to BSU-Trace. By logging into and utilizing this system, you agree to comply with the terms and privacy notices outlined below. BSU-Trace is designed to optimize administrative document tracking, manage facility reservations (including the Multimedia Room and Assemblyman Rafael R. Recto Gymnasium), and coordinate van scheduling for Batangas State University - Lipa Campus staff.</p>
              </section>

              <section>
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#D32F2F] flex items-center justify-center text-xs">2</span>
                  Data Collection and Privacy Notice
                </h3>
                <div className="pl-8 text-justify">
                  <p className="mb-2">In accordance with institutional guidelines, BSU-Trace collects and processes specific administrative data to ensure operational efficiency:</p>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600 marker:text-[#D32F2F]">
                    <li><strong>Digital Audit Trail:</strong> The system utilizes a QR-hybrid tracking mechanism to monitor the physical movement of documents. Scanning events ("Receive" and "Release") are logged with timestamps to provide transparent tracking.</li>
                    <li><strong>Data Integrity:</strong> Your interaction logs, routing configurations, and van scheduling requests are securely stored to facilitate institutional resource management.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#D32F2F] flex items-center justify-center text-xs">3</span>
                  Analytical Processing and Usage
                </h3>
                <div className="pl-8 text-justify">
                  <p className="mb-2">To continuously improve campus operations, BSU-Trace applies data-driven intelligence to historical administrative logs:</p>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600 marker:text-[#D32F2F]">
                    <li><strong>Bottleneck Analysis:</strong> The system conducts an analytical evaluation process on document "dwell times" at various offices. This identifies constraints and operational friction without automated intervention, allowing governance to address delays proactively.</li>
                    <li><strong>Predictive Forecasting:</strong> Historical scheduling data is used to forecast peak demand for van scheduling and facility usage, ensuring optimal distribution of institutional assets.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#D32F2F] flex items-center justify-center text-xs">4</span>
                  User Responsibilities and Limitations
                </h3>
                <div className="pl-8 text-justify">
                  <p className="mb-2">As a user of BSU-Trace, you acknowledge the following constraints:</p>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600 marker:text-[#D32F2F]">
                    <li>The system strictly handles official business for BSU staff; student-related requests fall outside its scope.</li>
                    <li>All digital resource reservations remain in a <em className="font-semibold text-gray-800">provisional state</em> until hard-copy documents with required "wet signatures" are physically verified by the General Services Office (GSO).</li>
                    <li>Users are expected to provide accurate status updates and qualitative remarks when processing or returning documents for correction.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#D32F2F] flex items-center justify-center text-xs">5</span>
                  User Consent
                </h3>
                <p className="pl-8 text-justify">By proceeding, you consent to the collection, processing, and analytical evaluation of your administrative transactions within the BSU-Trace ecosystem. If you decline, you will be securely logged out of the portal.</p>
              </section>
            </div>

            <div className="flex gap-4 p-5 border-t border-gray-200 shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                type="button" 
                onClick={() => {
                  setShowTerms(false);
                  setPendingLoginData(null);
                }} 
                className="w-1/2 border border-gray-300 py-3 text-sm font-bold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wider"
              >
                Decline
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setShowTerms(false);
                  completeLogin(pendingLoginData);
                }} 
                className="w-1/2 bg-[#D32F2F] hover:bg-[#b71c1c] shadow-md text-white text-sm font-bold rounded-lg py-3 transition-colors uppercase tracking-wider"
              >
                Accept & Continue
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIONE FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Account Recovery</h3>
              <button 
                onClick={closeForgotModal} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {/* Stepper Indicator */}
              <div className="flex items-center justify-center mb-8">
                {[1, 2, 3, 4].map((step) => (
                  <React.Fragment key={step}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${forgotStep >= step ? 'bg-[#D32F2F] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {step === 4 && forgotStep === 4 ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> : step}
                    </div>
                    {step < 4 && (
                      <div className={`w-12 h-1 ${forgotStep > step ? 'bg-[#D32F2F]' : 'bg-gray-100'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="space-y-6">
                
                {forgotStep === 1 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      To locate your account, enter your username exactly as registered. <span className="font-semibold">Usernames are case-sensitive.</span>
                    </p>
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotStep === 1 && (
                  <form onSubmit={handleIdentifyUser} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University Username</label>
                      <input 
                        type="text" 
                        required 
                        value={forgotUsername} 
                        onChange={e => setForgotUsername(e.target.value)} 
                        placeholder="e.g. jdelacruz" 
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-sm font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-70 flex justify-center items-center cursor-pointer"
                    >
                      {isSubmitting ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Find Account'}
                    </button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyEmail} className="space-y-5">
                    <p className="text-sm text-gray-600 leading-normal">
                      An account matching your username was found. Please verify your identity by entering the full email address associated with this account:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <span className="text-base font-mono font-bold text-gray-800">{maskedEmail}</span>
                    </div>
                    <div>
                      <input 
                        type="email" 
                        required 
                        value={typedEmail} 
                        onChange={e => setTypedEmail(e.target.value)} 
                        placeholder="Enter full email address" 
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      * Check your Spam folder if you don't see the email within a few minutes.
                    </p>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-sm font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-70 flex justify-center items-center cursor-pointer"
                    >
                      {isSubmitting ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Send Recovery Code'}
                    </button>
                  </form>
                )}

                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit Verification Code</label>
                      <input 
                        type="text" 
                        maxLength={6} 
                        required 
                        value={resetCode} 
                        onChange={e => setResetCode(e.target.value.replace(/\D/g, ""))} 
                        placeholder="000000" 
                        className="w-full px-4 py-3 text-center font-mono font-bold text-lg tracking-[0.5em] border border-gray-300 rounded-lg focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          required 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showNewPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            ) : (
                              <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showConfirmPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            ) : (
                              <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-sm font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-70 flex justify-center items-center cursor-pointer mt-6"
                    >
                      {isSubmitting ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Reset Password'}
                    </button>
                  </form>
                )}

                {forgotStep === 4 && (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Password Reset Successful</h4>
                    <p className="text-sm text-gray-600 px-4">{forgotSuccess}</p>
                    <button 
                      type="button" 
                      onClick={closeForgotModal} 
                      className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-sm font-bold py-3 rounded-lg shadow-md transition-colors mt-4"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT SCREEN LAYOUT CONTAINER */}
      <div className="w-full flex">
        
        {/* LEFT SIDE: BRANDING / HERO (Hidden on smaller screens) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#D32F2F] text-white flex-col justify-between overflow-hidden">
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center opacity-30 mix-blend-multiply"
            style={{ backgroundImage: "url('/BSU.webp')" }}
          />
          {/* Red/Gold Accent Shapes */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#D32F2F] to-[#b71c1c] opacity-90 z-10"></div>
          <div className="absolute top-0 right-0 w-64 h-full bg-[#F8B825] opacity-20 transform skew-x-12 translate-x-20 z-10"></div>
          
          <div className="relative z-20 flex flex-col p-12 h-full justify-between">
            <div>
              <div className="bg-white p-3 inline-block rounded-2xl shadow-lg mb-10">
                <img src="/bsu-logo.png" alt="BatStateU Logo" className="h-16 w-auto" />
              </div>
              <h1 className="text-5xl font-black tracking-tight leading-tight mb-4 uppercase">
                BSU-Trace <br/> Portal
              </h1>
              <p className="text-red-100 text-lg max-w-md font-medium leading-relaxed">
                Smart Campus Resource Management System. Integrated Document Tracking & Van Scheduling tailored for Batangas State University.
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-6 opacity-90">
                <div className="h-1 w-12 bg-[#F8B825] rounded-full"></div>
                <p className="font-semibold tracking-wide uppercase text-sm">The National Engineering University</p>
              </div>
              <p className="text-sm text-red-200">
                &copy; {new Date().getFullYear()} Batangas State University - Lipa Campus. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
          
          {/* Mobile Header (Only shows when left side is hidden) */}
          <div className="absolute top-8 left-8 right-8 flex lg:hidden items-center gap-3 border-b border-gray-100 pb-4">
            <img src="/bsu-logo.png" alt="BSU Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight uppercase">BSU-Trace</h1>
              <p className="text-xs text-[#D32F2F] font-semibold">Batangas State University</p>
            </div>
          </div>

          <div className="w-full max-w-md mt-16 lg:mt-0">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h2>
              <p className="text-gray-500">Sign in to your account to continue.</p>
            </div>

            {error && !require2FA && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required  
                    placeholder="Enter your university username" 
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(true)} 
                    className="text-xs font-semibold text-[#D32F2F] hover:text-[#b71c1c] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input 
                    type={showSignInPassword ? "text" : "password"}  
                    value={password} 
                    onChange={e => setPassword(e.target.value)}  
                    required
                    placeholder="••••••••" 
                    className="w-full pl-10 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}  
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showSignInPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* SIGN IN BUTTON */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-base py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(211,47,47,0.39)] hover:shadow-[0_6px_20px_rgba(211,47,47,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <p className="text-sm text-gray-500">
                Need help? <a href="mailto:helpdesk@g.batstate-u.edu.ph" className="font-semibold text-[#D32F2F] hover:underline">Contact IT Support</a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}