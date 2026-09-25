import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { LayoutDashboard, FileText, History, User, Camera, Link2, LogOut, Menu, X, School, Smartphone, ChevronDown, Truck, MonitorPlay, ClipboardList } from 'lucide-react';
import { endSession, fetchWithAuth } from "../../../api";

// --- CUSTOM HOOK ---
import { useProcessorData } from "./hooks/useProcessorData";

// --- EXTRACTED COMPONENTS ---
import ProcessorOverviewTab from "./components/ProcessorOverviewTab";
import RegistrationManagementPage from './components/RegistrationManagementPage';

// --- EXTRACTED MODALS ---
import ScannerModal from "./modals/ScannerModal";
import DocumentTrackingModal from '../../shared/modals/DocumentTrackingModal';
import OfficeSubmissionsTab from "./components/OfficeSubmissionsTab";
import RequestFacilitiesPage from '../../shared/components/RequestFacilitiesPage';

// --- SHARED COMPONENTS ---
import UserProfileTab from "../../shared/components/UserProfileTab";
import ChangePasswordModal from "../../shared/modals/ChangePasswordModal";
import FloatingChat from '../../shared/components/FloatingChat';
import PWAInstallBanner from '../../shared/components/PWAInstallBanner';
import NotificationDropdown from '../../shared/components/NotificationDropdown';
import IncomingDocumentsModal from '../../shared/modals/IncomingDocumentsModal';
import CompanionScannerModal from '../../shared/modals/CompanionScannerModal';
import SubmissionOverviewTab from '../../shared/components/SubmissionOverviewTab';
import useSubmissionAccess from '../../shared/hooks/useSubmissionAccess';
import CollaborativeSubmissionsTab from '../../shared/components/CollaborativeSubmissionsTab';
import SubmissionActivityHistoryTab from '../../shared/components/SubmissionActivityHistoryTab';
import OfficeDocumentsTab from '../../shared/components/OfficeDocumentsTab';

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
  const userId = localStorage.getItem('userId');
  
  // --- CORE UI STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [facilitiesExpanded, setFacilitiesExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetDoc, setChatTargetDoc] = useState(null);
  const [activeNotificationDocId, setActiveNotificationDocId] = useState(null);
  
  // --- MODAL & ACTION STATE ---
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isHistoryDetails, setIsHistoryDetails] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const scanBusy = useRef(false);
  const [scanMode, setScanMode] = useState('time-in');
  const [simulatedQrInput, setSimulatedQrPayload] = useState('');
  
  // --- PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const processorData = useProcessorData(userId);
  const submissionAccess = useSubmissionAccess(userId);
  const documentTabs = ['documents', 'submissions', 'office-submissions', 'department-submissions', 'shared-submissions', 'archived-submissions'];

  useEffect(() => {
    if (!userId || userId === 'undefined') {
      localStorage.clear();
      navigate('/login');
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (!submissionAccess.loading && !submissionAccess.canRequestRegistration && activeTab === 'registration-management') {
      const timer = window.setTimeout(() => setActiveTab('dashboard'), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, submissionAccess.canRequestRegistration, submissionAccess.loading]);

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const openDocumentsMenu = () => {
    setDocumentsExpanded(current => documentTabs.includes(activeTab) ? !current : true);
    if (!documentTabs.includes(activeTab)) setActiveTab('documents');
  };

  const openFacilitiesMenu = () => {
    setFacilitiesExpanded(current => activeTab.startsWith('resource-') ? !current : true);
    if (!activeTab.startsWith('resource-')) setActiveTab('resource-gym');
  };

  const handleLogout = () => {
    minimalSwal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to securely end your session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Sign Out'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await endSession();
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

  // Row click transition: switches view to 'documents' and opens the Document Verification Detail modal
  const handleRowDocumentClick = (doc) => {
    setActiveTab('documents');
    handleOpenPipelineDetails(doc, false);
  };

  // Notification click: switches view to 'documents' and deep-links to that specific document's modal
  const handleNotificationClick = async (notif) => {
    setActiveTab('documents');

    const targetIniId = notif.ini_id;
    const allKnownDocs = processorData.pipelineDocs || [];

    // 1. Try finding in loaded pipeline documents
    let matchedDoc = allKnownDocs.find(d => 
      (targetIniId && d.ini_id === targetIniId) || 
      (notif.doc_title && d.title?.toLowerCase() === notif.doc_title?.toLowerCase())
    );

    // 2. If found, open the verification modal immediately
    if (matchedDoc) {
      handleOpenPipelineDetails(matchedDoc, false);
      return;
    }

    // 3. Fallback: If the document isn't in pipelineDocs yet, fetch it directly
    if (targetIniId) {
      try {
        const res = await fetchWithAuth(`/api/processor/documents/${processorData.processorOfficeId}`);
        const freshDocs = await res.json();
        const docFromFresh = Array.isArray(freshDocs) ? freshDocs.find(d => d.ini_id === targetIniId) : null;
        if (docFromFresh) {
          handleOpenPipelineDetails(docFromFresh, false);
        }
      } catch (err) {
        console.error("Error opening notification document:", err);
      }
    }
  };

  const executeSimulatedScanner = async (e, scannedCode = null) => {
    if (e) e.preventDefault();
    const targetQr = scannedCode || simulatedQrInput;

    if (!targetQr || !targetQr.trim()) {
      return minimalSwal.fire({ icon: 'warning', title: 'Input Required', text: 'Please type or scan a valid reference token string first.' });
    }
    
    if (scanBusy.current) return;
    scanBusy.current = true;
    const targetUrl = scanMode === 'time-in' 
      ? '/api/documents/scan-in' 
      : '/api/documents/scan-out';

    try {
      const res = await fetchWithAuth(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: targetQr })
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
    } finally { scanBusy.current = false; }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/profile/${userId}`, {
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
      const res = await fetchWithAuth(`/api/profile/${userId}/password`, {
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
        const res = await fetchWithAuth(`/api/profile/${userId}`, {
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

      const requestRes = await fetchWithAuth(`/api/users/${userId}/request-profile-otp`, { method: 'POST' });
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
        const verifyRes = await fetchWithAuth(`/api/profile/${userId}/verify-enable-2fa`, {
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

  return (
    <div className="trace-portal flex h-screen w-screen bg-[#FAF8F5] text-neutral-800 font-sans overflow-hidden relative">
      
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Office Portal</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
          
          <nav className="space-y-1 text-sm">
            <button onClick={() => { handleTabSelect('dashboard'); processorData.setSearch(''); processorData.setFilterStatus('All'); processorData.setDashboardPage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <div>
              <button onClick={openDocumentsMenu} aria-expanded={documentsExpanded} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors cursor-pointer ${documentTabs.includes(activeTab) ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                <span className="flex items-center gap-3"><FileText size={18} /> Documents</span>
                <ChevronDown size={15} className={`transition-transform ${documentsExpanded ? 'rotate-180' : ''}`} />
              </button>
              {documentsExpanded && (
                <div className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
                  <button onClick={() => { handleTabSelect('documents'); processorData.setSearch(''); processorData.setFilterStatus('All'); processorData.setPipelinePage(1); }} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'documents' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Active Documents</button>
                  <button onClick={() => handleTabSelect('submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Personal Submissions</button>
                  {submissionAccess.offices.length > 0 && <button onClick={() => handleTabSelect('office-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'office-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Office Submissions</button>}
                  {submissionAccess.departments.length > 0 && <button onClick={() => handleTabSelect('department-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'department-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Department Submissions</button>}
                  <button onClick={() => handleTabSelect('shared-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'shared-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Shared With Me</button>
                  <button onClick={() => handleTabSelect('archived-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === 'archived-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Archived</button>
                </div>
              )}
            </div>
            <div>
              <button onClick={openFacilitiesMenu} aria-expanded={facilitiesExpanded} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab.startsWith('resource-') ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                <span className="flex items-center gap-3"><School size={18} /> Request Facilities</span>
                <ChevronDown size={15} className={`transition-transform ${facilitiesExpanded ? 'rotate-180' : ''}`} />
              </button>
              {facilitiesExpanded && (
                <div className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
                  {[
                    { id: 'resource-gym', label: 'Gymnasium', icon: School },
                    { id: 'resource-room', label: 'Rooms', icon: MonitorPlay },
                    { id: 'resource-vehicle', label: 'Vehicles', icon: Truck },
                    { id: 'resource-requests', label: 'Submitted Requests', icon: ClipboardList }
                  ].map(item => (
                    <button key={item.id} onClick={() => handleTabSelect(item.id)} className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === item.id ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                      <item.icon size={14} /> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {submissionAccess.canRequestRegistration && <button onClick={() => handleTabSelect('registration-management')} className={`w-full flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'registration-management' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <Link2 size={16} className="shrink-0" /> Registration Management
            </button>}
            <button onClick={() => { handleTabSelect('history'); processorData.setSearch(''); processorData.setHistoryFilter('All'); processorData.setHistoryPage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'history' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <History size={18} /> History
            </button>
          </nav>
        </div>

        <div className="space-y-3">
          {/* COMPANION SCANNER BUTTON */}
          <button 
            onClick={() => { setShowCompanionModal(true); setIsSidebarOpen(false); }}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider cursor-pointer"
          >
            <Smartphone size={16} /> Mobile Scanner
          </button>
          
          <button 
            onClick={() => { setScanMode('time-in'); setShowScannerModal(true); setIsSidebarOpen(false); }}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider cursor-pointer"
          >
            <Camera size={16} /> Web Scanner
          </button>
          
          <div className="border-t border-neutral-700 pt-3">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors cursor-pointer">
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
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-base md:text-lg font-black text-neutral-900 truncate">
                 {activeTab === 'profile' ? 'Profile Management Hub' : activeTab === 'registration-management' ? 'Registration Management' : activeTab === 'resource-gym' ? 'Request Gymnasium' : activeTab === 'resource-room' ? 'Request a Room' : activeTab === 'resource-vehicle' ? 'Request a Vehicle' : activeTab === 'resource-requests' ? 'Submitted Facility Requests' : activeTab === 'submissions' ? 'Personal Submissions' : activeTab === 'shared-submissions' ? 'Shared With Me' : activeTab === 'archived-submissions' ? 'Archived Submissions' : activeTab === 'office-submissions' ? 'Office Submissions' : activeTab === 'department-submissions' ? 'Department Submissions' : activeTab === 'documents' ? 'Active Documents' : activeTab === 'history' ? 'History' : 'Office Dashboard'}
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide truncate">Assigned: {processorData.processorOfficeName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 text-neutral-600">
            <NotificationDropdown 
              userId={userId}
              notifications={processorData.notifications}
              onNotificationClick={handleNotificationClick}
            />
            
            <button 
              onClick={() => setActiveTab(activeTab === 'profile' ? 'dashboard' : 'profile')} 
              className={`p-2 rounded-full transition-colors cursor-pointer ${activeTab === 'profile' ? 'bg-red-50 text-red-700' : 'hover:bg-neutral-100'}`}
            >
              <User size={20} />
            </button>
          </div>
        </header>

        {/* TAB RENDERING */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <ProcessorOverviewTab 
              {...processorData} 
              setActiveTab={setActiveTab}
              handleRowDocumentClick={handleRowDocumentClick}
              handleOpenPipelineDetails={handleOpenPipelineDetails} 
            />
          )}
          {activeTab === 'documents' && (
            <OfficeDocumentsTab
              {...processorData} 
              setActiveTab={setActiveTab}
              targetDocId={activeNotificationDocId}
              onClearTargetDocId={() => setActiveNotificationDocId(null)}
              setIsIncomingModalOpen={processorData.setIsIncomingModalOpen}
              handleOpenPipelineDetails={handleOpenPipelineDetails} 
            />
          )}
          {activeTab === 'submissions' && <OfficeSubmissionsTab officeId={processorData.processorOfficeId} processTypes={processorData.processTypes} onProcessed={processorData.fetchProcessorMeta} onOpenChat={doc => { setChatTargetDoc(doc); setIsChatOpen(true); processorData.setHasUnreadChats(false); }} />}
          {activeTab === 'shared-submissions' && <CollaborativeSubmissionsTab mode="shared" onOpenChat={doc => { setChatTargetDoc(doc); setIsChatOpen(true); processorData.setHasUnreadChats(false); }} />}
          {activeTab === 'archived-submissions' && <CollaborativeSubmissionsTab mode="archived" onOpenChat={doc => { setChatTargetDoc(doc); setIsChatOpen(true); processorData.setHasUnreadChats(false); }} />}
          {activeTab === 'office-submissions' && <SubmissionOverviewTab type="office" scopes={submissionAccess.offices} />}
          {activeTab === 'department-submissions' && <SubmissionOverviewTab type="department" scopes={submissionAccess.departments} />}
          {activeTab === 'resource-gym' && <RequestFacilitiesPage userId={userId} officeName={processorData.processorOfficeName} facility="Gymnasium" />}
          {activeTab === 'resource-room' && <RequestFacilitiesPage userId={userId} officeName={processorData.processorOfficeName} facility="Multimedia Room" />}
          {activeTab === 'resource-vehicle' && <RequestFacilitiesPage userId={userId} officeName={processorData.processorOfficeName} facility="Van" />}
          {activeTab === 'resource-requests' && <RequestFacilitiesPage userId={userId} officeName={processorData.processorOfficeName} view="requests" />}
          {activeTab === 'registration-management' && <RegistrationManagementPage userId={userId} access={submissionAccess} />}
          {activeTab === 'history' && (
            <SubmissionActivityHistoryTab title="History" includeOfficeActivity onOpenChat={doc => { setChatTargetDoc(doc); setIsChatOpen(true); processorData.setHasUnreadChats(false); }} />
          )}
          {activeTab === 'profile' && (
            <UserProfileTab 
              {...processorData} 
              handleUpdateProfile={handleUpdateProfile}
              setTwoFaEnabled={processorData.setTwoFaEnabled}
              toggle2FA={toggle2FA}
              setShowPassModal={setShowPassModal}
              roleLabel="Office Staff"
            />
          )}
        </div>
      </div>

      <FloatingChat
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        hasUnread={processorData.hasUnreadChats}
        onUnreadCleared={() => processorData.setHasUnreadChats(false)}
        userId={userId}
        officeId={processorData.processorOfficeId}
        targetDoc={chatTargetDoc}
        onClearTargetDoc={() => setChatTargetDoc(null)}
        label="Chat Inbox"
      />

      {/* MODALS RENDERING */}
      {showScannerModal && (
        <ScannerModal 
          setShowScannerModal={setShowScannerModal}
          scanMode={scanMode} setScanMode={setScanMode}
          simulatedQrInput={simulatedQrInput} setSimulatedQrPayload={setSimulatedQrPayload}
          executeSimulatedScanner={executeSimulatedScanner}
        />
      )}

      {showCompanionModal && (
        <CompanionScannerModal 
          onClose={() => setShowCompanionModal(false)} 
          onScanSuccess={processorData.fetchProcessorMeta} 
        />
      )}

      {showPipelineModal && selectedDoc && (
        <DocumentTrackingModal
          selectedDoc={selectedDoc}
          isHistoryDetails={isHistoryDetails}
          officesList={processorData.officesList}
          processorOfficeId={processorData.processorOfficeId}
          onClose={() => setShowPipelineModal(false)}
          onRefresh={processorData.fetchProcessorMeta}
          onOpenChat={doc => { setChatTargetDoc(doc); setIsChatOpen(true); processorData.setHasUnreadChats(false); }}
        />
      )}
 
      {showPassModal && (
        <ChangePasswordModal 
          isOpen={showPassModal}
          onClose={() => setShowPassModal(false)}
          currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
          newPassword={newPassword} setNewPassword={setNewPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          handleUpdatePassword={handleUpdatePassword}
        />
      )}

      {processorData.isIncomingModalOpen && (
        <IncomingDocumentsModal 
          isOpen={processorData.isIncomingModalOpen}
          onClose={() => processorData.setIsIncomingModalOpen(false)}
          documents={processorData.expectedIncomingList}
          isLoading={processorData.isIncomingLoading}
        />
      )}

    </div>
  );
}
