import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { LayoutDashboard, FileText, History, Bell, User, Camera, LogOut, MessageSquare, Menu, X } from 'lucide-react';
import { fetchWithAuth } from "../../../api";

// --- CUSTOM HOOK ---
import { useProcessorData } from "./hooks/useProcessorData";

// --- EXTRACTED COMPONENTS ---
import ProcessorOverviewTab from "./components/ProcessorOverviewTab";
import ProcessorPipelineTab from "./components/ProcessorPipelineTab";
import ProcessorHistoryTab from "./components/ProcessorHistoryTab";

// --- EXTRACTED MODALS ---
import ScannerModal from "./modals/ScannerModal";
import DocumentDetailsModal from "./modals/DocumentDetailsModal";
import PipelineVerificationModal from "./modals/PipelineVerificationModal";

// --- SHARED COMPONENTS  ---
import UserProfileTab from "../../shared/components/UserProfileTab";
import ChangePasswordModal from "../../shared/modals/ChangePasswordModal";
import OfficeChatHub from "../../shared/OfficeChatHub";
import PWAInstallBanner from '../../shared/components/PWAInstallBanner';

const minimalSwal = Swal.mixin({
  customClass: {
    confirmButton: 'px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-800 hover:bg-red-900 shadow-md mx-2',
    cancelButton: 'px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 mx-2',
    popup: 'rounded-3xl border border-neutral-100 shadow-2xl',
    title: 'text-lg font-black text-neutral-900',
    htmlContainer: 'text-sm font-medium text-neutral-500'
  },
  buttonsStyling: false
});

export default function ProcessorDashboard() {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const userId = localStorage.getItem('userId');
  
  // --- CORE UI STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // --- MODAL & ACTION STATE ---
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isHistoryDetails, setIsHistoryDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [scanMode, setScanMode] = useState('time-in');
  const [simulatedQrInput, setSimulatedQrPayload] = useState('');
  
  const [selectedAdHocOffice, setSelectedAdHocOffice] = useState('');
  const [isAdHocProcessing, setIsAdHocProcessing] = useState(false);

  // --- PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const processorData = useProcessorData(userId);

  useEffect(() => {
    if (!userId || userId === 'undefined') {
      localStorage.clear();
      navigate('/login');
    }
  }, [userId, navigate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    minimalSwal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to securely end your session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Sign Out'
    }).then((result) => {
      if (result.isConfirmed) {
        sessionStorage.removeItem('bsu_pwa_banner_dismissed');
        localStorage.clear();
        navigate('/login');
      }
    });
  };

  const handleOpenPipelineDetails = (doc, fromHistory = false) => {
    setSelectedDoc(doc);
    setIsHistoryDetails(fromHistory);
    processorData.fetchOfficesList();
    setShowPipelineModal(true);
  };

  const getRouteStopsArray = (doc) => {
    const match = processorData.processTypes.find(p => p.process_name === doc.process_name);
    if (match) {
      const stops = [];
      for (let i = 1; i <= 7; i++) {
        if (match[`stop_${i}_name`]) stops.push(match[`stop_${i}_name`]);
      }
      return stops;
    }
    return [doc.current_office || 'Active Office'];
  };

  const handleExecuteAdHocDetour = async (e) => {
    e.preventDefault();
    if (!selectedAdHocOffice) {
      return minimalSwal.fire({ icon: 'warning', title: 'Required', text: 'Please select a target verification destination office step first.' });
    }
    
    setIsAdHocProcessing(true);
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/processor/documents/ad-hoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iniId: selectedDoc.ini_id,
          targetOfficeId: parseInt(selectedAdHocOffice),
          currentOfficeId: processorData.processorOfficeId,
          executorUserId: parseInt(userId)
        })
      });
      const data = await res.json();
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Detour Activated', text: data.message });
        setShowPipelineModal(false);
        setSelectedAdHocOffice('');
        processorData.fetchProcessorMeta();
      } else {
        minimalSwal.fire({ icon: 'error', title: 'Error', text: data.error });
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Network Error', text: 'Network communication error routing detour.' }); 
    }
    finally { setIsAdHocProcessing(false); }
  };

  const executeSimulatedScanner = async (e, scannedCode = null) => {
    if (e) e.preventDefault();
    const targetQr = scannedCode || simulatedQrInput;

    if (!targetQr || !targetQr.trim()) {
      return minimalSwal.fire({ icon: 'warning', title: 'Input Required', text: 'Please type or scan a valid reference token string first.' });
    }
    
    const targetUrl = scanMode === 'time-in' 
      ? 'http://localhost:5000/api/documents/scan-in' 
      : 'http://localhost:5000/api/documents/scan-out';

    try {
      const res = await fetchWithAuth(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: targetQr, processorUserId: parseInt(userId) })
      });
      const data = await res.json();
      
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Transaction Approved', text: data.message });
        setShowScannerModal(false);
        setSimulatedQrPayload('');
        processorData.fetchProcessorMeta();
      } else {
        minimalSwal.fire({ icon: 'error', title: 'Rejection', text: data.error || 'Processing verification failed.' });
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Network Error', text: 'Failed to establish server authentication checks.' }); 
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: processorData.profileName,
          email: processorData.profileEmail,
          twoFaEnabled: processorData.twoFaEnabled,
          twoFaCode: processorData.twoFaCode || null
        })
      });
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Profile Updated', text: 'Profile information synchronized successfully!' });
        localStorage.setItem('user', processorData.profileName);
        processorData.fetchProcessorMeta();
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Update Failed', text: 'Failed to save changes.' }); 
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return minimalSwal.fire({ icon: 'warning', title: 'Mismatch', text: 'New passwords do not match.' });
    }
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Password Updated', text: 'Security credentials updated cleanly.' });
        setShowPassModal(false);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        minimalSwal.fire({ icon: 'error', title: 'Error', text: data.error });
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Update Failed', text: 'Failed to change credentials record.' }); 
    }
  };

  const toggle2FA = async (checked) => {
    if (!checked) {
      try {
        const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: processorData.profileName, email: processorData.profileEmail, twoFaEnabled: false })
        });
        if (res.ok) {
          processorData.setTwoFaEnabled(false);
          minimalSwal.fire({ icon: 'success', title: 'Disabled', text: 'Two-Factor Authentication is now off.' });
        }
      } catch (err) {
        minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to update security settings.' });
      }
      return;
    }

    try {
      minimalSwal.fire({
        title: 'Sending Code...',
        text: 'Please wait while we dispatch your verification email.',
        allowOutsideClick: false,
        didOpen: () => { minimalSwal.showLoading(); }
      });

      const requestRes = await fetchWithAuth(`http://localhost:5000/api/users/${userId}/request-profile-otp`, { method: 'POST' });
      if (!requestRes.ok) throw new Error('Failed to dispatch email.');

      const { value: otpCode } = await minimalSwal.fire({
        title: 'Verify Your Email',
        text: `We sent a 6-digit code to ${processorData.profileEmail}.`,
        input: 'text',
        inputAttributes: { maxLength: 6, style: 'text-align: center; letter-spacing: 0.5em; font-weight: bold;' },
        showCancelButton: true,
        confirmButtonText: 'Verify & Enable'
      });

      if (otpCode) {
        const verifyRes = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/verify-enable-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpCode })
        });

        if (verifyRes.ok) {
          processorData.setTwoFaEnabled(true);
          minimalSwal.fire({ icon: 'success', title: 'Secured!', text: 'Email Two-Factor Authentication is now active.' });
        } else {
          minimalSwal.fire({ icon: 'error', title: 'Invalid Code', text: 'The verification code was incorrect.' });
          processorData.setTwoFaEnabled(false); 
        }
      } else {
        processorData.setTwoFaEnabled(false);
      }
    } catch (err) {
      minimalSwal.fire({ icon: 'error', title: 'Network Error', text: 'Failed to communicate with authentication server.' });
      processorData.setTwoFaEnabled(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const localizedString = String(timestamp).replace(/(\+00:00|\+00|Z)$/i, '');
    const now = new Date();
    const past = new Date(localizedString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = now - past;
    
    if (elapsed < msPerMinute) return 'Just now';
    else if (elapsed < msPerHour) {
       const minutes = Math.round(elapsed / msPerMinute);
       return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;   
    } else if (elapsed < msPerDay) {
       const hours = Math.round(elapsed / msPerHour);
       return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;   
    } else {
       const days = Math.round(elapsed / msPerDay);
       return `${days} ${days === 1 ? 'day' : 'days'} ago`;   
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#FAF8F5] text-neutral-800 font-sans overflow-hidden relative">
      
      <PWAInstallBanner />
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2D1F1E] text-neutral-300 flex flex-col justify-between p-4 flex-shrink-0 text-left transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div>
          <div className="flex items-center justify-between border-b border-neutral-700 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/bsu-logo.png" 
                alt="Batangas State University Logo" 
                className="h-10 w-auto object-contain drop-shadow-sm" 
              />
              <div>
                <h1 className="font-bold text-white text-sm">BSU - Trace</h1>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Office Processor</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden"
            >
              <X size={20} />
            </button>
          </div>
          
          <nav className="space-y-1 text-sm">
            <button onClick={() => { handleTabSelect('dashboard'); processorData.setSearch(''); processorData.setFilterStatus('All'); processorData.setDashboardPage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button onClick={() => { handleTabSelect('documents'); processorData.setSearch(''); processorData.setFilterStatus('All'); processorData.setPipelinePage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'documents' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <FileText size={18} /> Documents
            </button>
            <button onClick={() => { handleTabSelect('history'); processorData.setSearch(''); processorData.setHistoryFilter('All'); processorData.setHistoryPage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'history' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <History size={18} /> History
            </button>
            <button onClick={() => { handleTabSelect('messages'); processorData.setHasUnreadChats(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'messages' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <MessageSquare size={18} /> Chat Inbox
              </div>
              {processorData.hasUnreadChats && (
                <span className="w-2 h-2 bg-red-600 rounded-full mr-1 animate-pulse"></span>
              )}
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => { setScanMode('time-in'); setShowScannerModal(true); setIsSidebarOpen(false); }}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider"
          >
            <Camera size={16} /> Scan Document
          </button>
          
          <div className="border-t border-neutral-700 pt-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white px-4 md:px-8 flex items-center justify-between shadow-xs flex-shrink-0 relative">
          <div className="flex items-center gap-3 text-left">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-base md:text-lg font-black text-neutral-900 truncate">
                {activeTab === 'profile' ? 'Profile Management Hub' : activeTab === 'documents' ? 'Office Processing System' : activeTab === 'history' ? 'Office Transaction Ledger' : 'Processor Dashboard'}
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide truncate">Assigned: {processorData.processorOfficeName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 text-neutral-600">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-neutral-100 relative transition-colors">
                <Bell size={20} />
                {processorData.notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
                  <div className="p-4 border-b border-neutral-100 bg-[#FDFBF9] font-bold text-xs uppercase text-neutral-900 tracking-wide">Notifications</div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
                    {processorData.notifications.map(n => (
                      <div key={n.id} className="p-4 text-xs border-b last:border-b-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-neutral-900">{n.title}</p>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                            {formatRelativeTime(n.time)}
                          </span>
                        </div>
                        <p className="text-neutral-500 mt-1">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab(activeTab === 'profile' ? 'dashboard' : 'profile')} 
              className={`p-2 rounded-full transition-colors ${activeTab === 'profile' ? 'bg-red-50 text-red-700' : 'hover:bg-neutral-100'}`}
            >
              <User size={20} />
            </button>
          </div>
        </header>

        {/* TAB RENDERING */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <ProcessorOverviewTab {...processorData} handleOpenPipelineDetails={handleOpenPipelineDetails} />
          )}
          {activeTab === 'documents' && (
            <ProcessorPipelineTab {...processorData} handleOpenPipelineDetails={handleOpenPipelineDetails} />
          )}
          {activeTab === 'history' && (
            <ProcessorHistoryTab {...processorData} handleOpenPipelineDetails={handleOpenPipelineDetails} />
          )}
          {activeTab === 'messages' && (
            <OfficeChatHub userId={userId} roleId={2} officeId={processorData.processorOfficeId} />
          )}
          {activeTab === 'profile' && (
            <UserProfileTab 
              {...processorData} 
              handleUpdateProfile={handleUpdateProfile}
              toggle2FA={toggle2FA}
              setShowPassModal={setShowPassModal}
              roleLabel="Processor"
            />
          )}
        </div>
      </div>

      {/* MODALS RENDERING */}
      {showScannerModal && (
        <ScannerModal 
          setShowScannerModal={setShowScannerModal}
          scanMode={scanMode} setScanMode={setScanMode}
          simulatedQrInput={simulatedQrInput} setSimulatedQrPayload={setSimulatedQrPayload}
          executeSimulatedScanner={executeSimulatedScanner}
        />
      )}

      {showDetailsModal && selectedDoc && (
        <DocumentDetailsModal 
          setShowDetailsModal={setShowDetailsModal} 
          selectedDoc={selectedDoc} 
          getRouteStopsArray={getRouteStopsArray}
        />
      )}

      {showPipelineModal && selectedDoc && (
        <PipelineVerificationModal 
          setShowPipelineModal={setShowPipelineModal}
          selectedDoc={selectedDoc}
          isHistoryDetails={isHistoryDetails}
          getRouteStopsArray={getRouteStopsArray}
          handleExecuteAdHocDetour={handleExecuteAdHocDetour}
          selectedAdHocOffice={selectedAdHocOffice}
          setSelectedAdHocOffice={setSelectedAdHocOffice}
          officesList={processorData.officesList}
          processorOfficeId={processorData.processorOfficeId}
          isAdHocProcessing={isAdHocProcessing}
        />
      )}

      {showPassModal && (
        <ChangePasswordModal 
          setShowPassModal={setShowPassModal}
          currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
          newPassword={newPassword} setNewPassword={setNewPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          handleUpdatePassword={handleUpdatePassword}
        />
      )}

    </div>
  );
}