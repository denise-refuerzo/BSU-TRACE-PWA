import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

    try {
      const response = await fetch('http://localhost:5000/api/login', {
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
          confirmButtonColor: '#800000'
        });
        return; 
      }

      setPendingLoginData(data);
      setShowTerms(true);
      
    } catch (err) {
      setError(err.message);  
    }
  };

  // --- STEP 2: 2FA OTP VERIFICATION CONTROLLER ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login/verify-2fa', {
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
    }
  };

  // --- FINAL ROUTING ---
  const completeLogin = (data) => {
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
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password/identify', {
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
    }
  };

  // FORGOT PASSWORD STEP 2 & 3: Match Email precisely and request OTP dispatch  
  const handleVerifyEmail = async (e) => {
    e.preventDefault();  
    setForgotError('');  
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password/verify-email', {
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ username: forgotUsername, fullEmail: typedEmail })  
      });
      const data = await res.json();  
      if (!res.ok) throw new Error(data.error || 'Email challenge failed.');  
      
      setForgotStep(3);  
    } catch (err) {
      setForgotError(err.message);  
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

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password/reset', {
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
    <div className="min-h-screen w-full bg-[#ebebeb] flex justify-center font-sans antialiased select-none">
      
      {/* 2FA CONDITIONAL OVERLAY FORM */}
      {require2FA && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">  
          <div className="bg-white p-6 rounded shadow-xl max-w-sm w-full text-center space-y-4 border border-gray-200">  
            <div className="w-12 h-12 bg-red-50 text-[#800000] rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>  
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">Security Verification</h4>  
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit OTP code sent to your email.</p>  
            </div>
            {error && <div className="p-2 bg-red-50 text-red-600 text-[11px] rounded border border-red-100">{error}</div>}  
            <form onSubmit={handleVerifyOTP} className="space-y-3">  
              <input 
                type="text" 
                maxLength={6} 
                required 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}  
                placeholder="000000" 
                className="w-full border border-gray-300 px-3 py-2 text-center font-mono text-sm tracking-widest rounded focus:border-[#800000] focus:outline-none" 
              />
              <div className="flex gap-2 pt-2">  
                <button 
                  type="button" 
                  onClick={() => { setRequire2FA(false); setOtpCode(''); setError(''); setTempUserId(null); }} 
                  className="w-1/2 border border-gray-300 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>  
                <button 
                  type="submit" 
                  className="w-1/2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-semibold rounded py-1.5 transition-colors"
                >
                  Confirm
                </button>  
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORIGINAL TERMS & CONDITIONS OVERLAY */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-200 animate-in zoom-in-95 duration-100">
            
            <div className="border-b border-gray-200 pb-4 p-5 text-center shrink-0">
              <h2 className="text-xl font-bold text-[#800000]">BSU-Trace Terms & Conditions</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Smart Campus Resource Management System</p>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-gray-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-[#800000] mb-1 border-l-4 border-[#800000] pl-2">1. Introduction and Scope</h3>
                <p className="text-justify">Welcome to BSU-Trace. By logging into and utilizing this system, you agree to comply with the terms and privacy notices outlined below. BSU-Trace is designed to optimize administrative document tracking, manage facility reservations (including the Multimedia Room and Assemblyman Rafael R. Recto Gymnasium), and coordinate van scheduling for Batangas State University - Lipa Campus staff.</p>
              </div>

              <div>
                <h3 className="font-bold text-[#800000] mb-1 border-l-4 border-[#800000] pl-2">2. Data Collection and Privacy Notice</h3>
                <p className="mb-2 text-justify">In accordance with institutional guidelines, BSU-Trace collects and processes specific administrative data to ensure operational efficiency:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Digital Audit Trail:</strong> The system utilizes a QR-hybrid tracking mechanism to monitor the physical movement of documents. Scanning events ("Receive" and "Release") are logged with timestamps to provide transparent tracking.</li>
                  <li><strong>Data Integrity:</strong> Your interaction logs, routing configurations, and van scheduling requests are securely stored to facilitate institutional resource management.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#800000] mb-1 border-l-4 border-[#800000] pl-2">3. Analytical Processing and Usage</h3>
                <p className="mb-2 text-justify">To continuously improve campus operations, BSU-Trace applies data-driven intelligence to historical administrative logs:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Bottleneck Analysis:</strong> The system conducts an analytical evaluation process on document "dwell times" at various offices. This identifies constraints and operational friction without automated intervention, allowing governance to address delays proactively.</li>
                  <li><strong>Predictive Forecasting:</strong> Historical scheduling data is used to forecast peak demand for van scheduling and facility usage, ensuring optimal distribution of institutional assets.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#800000] mb-1 border-l-4 border-[#800000] pl-2">4. User Responsibilities and Limitations</h3>
                <p className="mb-2 text-justify">As a user of BSU-Trace, you acknowledge the following constraints:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The system strictly handles official business for BSU staff; student-related requests fall outside its scope.</li>
                  <li>All digital resource reservations remain in a <em className="font-semibold">provisional state</em> until hard-copy documents with required "wet signatures" are physically verified by the General Services Office (GSO).</li>
                  <li>Users are expected to provide accurate status updates and qualitative remarks when processing or returning documents for correction.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#800000] mb-1 border-l-4 border-[#800000] pl-2">5. User Consent</h3>
                <p className="text-justify">By proceeding, you consent to the collection, processing, and analytical evaluation of your administrative transactions within the BSU-Trace ecosystem. If you decline, you will be securely logged out of the portal.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border-t border-gray-200 shrink-0 bg-gray-50">
              <button 
                type="button" 
                onClick={() => {
                  setShowTerms(false);
                  setPendingLoginData(null);
                }} 
                className="w-1/2 border border-gray-300 py-2 text-xs font-bold text-gray-700 rounded hover:bg-gray-100 transition-colors uppercase tracking-wider"
              >
                Decline
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setShowTerms(false);
                  completeLogin(pendingLoginData);
                }} 
                className="w-1/2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-bold rounded py-2 transition-colors uppercase tracking-wider"
              >
                Accept
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIONE FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-100">
            
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-800">Forgot Password</h3>
              <button 
                onClick={closeForgotModal} 
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5">
              <div className="border border-gray-200 rounded p-5 space-y-4">
                
                <div className="bg-[#FFF8E7] border border-[#FDE8B3] rounded p-3 flex gap-3 items-start">
                  <svg className="w-5 h-5 text-[#E8A317] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[11px] text-[#A66E00] leading-relaxed">
                  To locate your account, please ensure you enter your username exactly as registered. Please note that usernames are case-sensitive.                  
                  </p>
                </div>

                {forgotError && (
                  <div className="p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                    {forgotError}
                  </div>
                )}

                {forgotStep === 1 && (
                  <form onSubmit={handleIdentifyUser} className="space-y-3">
                    <p className="text-xs text-gray-700 leading-normal">
                      Enter your university username below. An account lookup will be conducted for verification.
                    </p>
                    <input 
                      type="text" 
                      required 
                      value={forgotUsername} 
                      onChange={e => setForgotUsername(e.target.value)} 
                      placeholder="Username" 
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:border-[#0A74B9] focus:outline-none"
                    />
                    <div className="flex justify-center pt-2">
                      <button 
                        type="submit" 
                        className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-medium px-5 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyEmail} className="space-y-3">
                    <p className="text-xs text-gray-700 leading-normal">
                      An account matching your username was found. Please enter your registered email address below for confirmation:
                    </p>
                    <div className="text-center py-1">
                      <span className="text-xs font-mono font-semibold text-gray-700">{maskedEmail}</span>
                    </div>
                    <input 
                      type="email" 
                      required 
                      value={typedEmail} 
                      onChange={e => setTypedEmail(e.target.value)} 
                      placeholder="Email address" 
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:border-[#0A74B9] focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-500 italic">
                      * If you do not receive the email shortly after the submission, please check your Spam folder.
                    </p>
                    <div className="flex justify-center pt-2">
                      <button 
                        type="submit" 
                        className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-medium px-5 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">6-Digit Verification Code</label>
                      <input 
                        type="text" 
                        maxLength={6} 
                        required 
                        value={resetCode} 
                        onChange={e => setResetCode(e.target.value.replace(/\D/g, ""))} 
                        placeholder="000000" 
                        className="w-full px-3 py-1.5 text-center font-mono font-semibold text-sm tracking-widest border border-gray-300 rounded focus:border-[#0A74B9] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">New Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          required 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded text-xs focus:border-[#0A74B9] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Confirm New Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded text-xs focus:border-[#0A74B9] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-center pt-2">
                      <button 
                        type="submit" 
                        className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-medium px-5 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 4 && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-xs text-gray-700">{forgotSuccess}</p>
                    <button 
                      type="button" 
                      onClick={closeForgotModal} 
                      className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-medium px-5 py-1.5 rounded transition-colors"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}

              </div>

              <div className="text-right mt-3">
                <button 
                  type="button" 
                  onClick={closeForgotModal} 
                  className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CENTERED CANVAS CONTAINER WITH DIONE SHADOW EFFECT */}
      <div className="w-full max-w-5xl min-h-screen bg-white shadow-[0_0_25px_rgba(0,0,0,0.12)] border-x border-gray-200 flex flex-col items-center">
        
        {/* HEADER HERO BANNER WITH IMAGE PLACEHOLDERS */}
        <div className="w-full relative bg-[#f9f9f9] border-b border-gray-100 overflow-hidden flex flex-col">
          
          {/* Main Hero Section with Landmark Graphics */}
          <div className="w-full min-h-[190px] md:min-h-[220px] flex items-center justify-between px-6 md:px-12 relative">
            
            {/* Background Texture Overlay */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-left opacity-15"
              style={{ backgroundImage: "url('/BSU.webp')" }}
            />

            {/* Left Header Branding & Title */}
            <div className="z-10 flex flex-col justify-center py-4 max-w-xl">
              <div className="flex items-center gap-3.5 mb-2">
                <img 
                  src="/bsu-logo.png" 
                  alt="BatStateU Seal" 
                  className="h-14 md:h-16 w-auto object-contain"
                />
                <div className="text-left">
                  <h1 className="text-base md:text-xl font-bold tracking-tight text-gray-900 uppercase leading-snug">
                    Batangas State University
                  </h1>
                  <p className="text-xs md:text-sm font-semibold text-[#D32F2F] tracking-normal">
                    The National Engineering University
                  </p>
                </div>
              </div>

              {/* Bold Large Portal Title */}
              <div className="mt-2">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-black uppercase font-sans">
                  BSU - TRACE PORTAL
                </h2>
              </div>
            </div>

            {/* Right Landmark Graphic Image Slot */}
            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-1/3 z-10 overflow-hidden">
              <div 
                className="w-full h-full bg-cover bg-center border-l-2 border-white/60 shadow-inner"
                style={{ 
                  /* Placeholder image path for the campus monument/landmark */
                  backgroundImage: "url('/BSU.webp')",
                  clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)' 
                }}
              />
            </div>
          </div>

          {/* DIONE DIAGONAL MOTTO RIBBON */}
          <div className="w-full relative h-7 flex items-center justify-start px-6 md:px-12 overflow-hidden bg-[#0A74B9] z-20">
            <p className="text-white text-xs font-normal tracking-wide italic z-10">
              Leading Innovations, Transforming Lives, Building the Nation
            </p>
            
            {/* Red and Gold Diagonal Stripes */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-1/3 md:w-1/4 bg-[#D32F2F] z-10"
              style={{ clipPath: 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
            />
            <div 
              className="absolute right-1/3 md:right-1/4 top-0 bottom-0 w-8 bg-[#F8B825] z-10"
              style={{ clipPath: 'polygon(50% 0%, 100% 0%, 50% 100%, 0% 100%)' }}
            />
          </div>
        </div>

        {/* CENTERED LOGIN FORM CONTAINER */}
        <div className="w-full flex-1 flex flex-col items-center justify-start pt-6 pb-16 px-4">
          <div className="w-full max-w-[540px] bg-white border border-gray-200 rounded p-8 sm:p-10 shadow-2xs">
            
            <h3 className="text-base font-normal text-gray-800 pb-3.5 border-b border-gray-200 mb-6">
              <b>Please Login</b>
            </h3>

            {error && !require2FA && (
              <div className="mb-5 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  required  
                  placeholder="Username" 
                  className="w-full px-3.5 py-2 border border-gray-300 rounded text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div className="relative flex items-center">
                <input 
                  type={showSignInPassword ? "text" : "password"}  
                  value={password} 
                  onChange={e => setPassword(e.target.value)}  
                  required
                  placeholder="Password" 
                  className="w-full pl-3.5 pr-10 py-2 border border-gray-300 rounded text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}  
                  className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs select-none cursor-pointer"
                  tabIndex={-1}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              <p className="text-[11px] text-gray-500 italic mt-0.5">
                * Password is case sensitive
              </p>


              {/* SIGN IN BUTTON */}
              <div className="pt-4 flex justify-center">
                <button 
                  type="submit" 
                  className="bg-[#F8B825] hover:bg-[#eab020] text-gray-800 text-xs font-semibold px-8 py-2.5 rounded-full flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Sign in</span>
                </button>
              </div>
            </form>

            {/* BOTTOM UTILITY LINKS */}

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center text-left gap-8 text-xs text-[#5cb85c]">
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)} 
                className="hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 text-[#5cb85c]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Forgot password? Click here</span>
              </button>
              <a 
                href="mailto:helpdesk@g.batstate-u.edu.ph" 
                className="hover:underline flex items-center gap-1.5 text-[#5cb85c]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Contact Us</span>
              </a>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}