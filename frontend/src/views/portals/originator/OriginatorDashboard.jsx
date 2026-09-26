import { useState } from 'react';
import { LayoutDashboard, FileText, School, User, LogOut, Menu, X, ChevronDown, Truck, MonitorPlay, ClipboardList, History } from 'lucide-react';
import { endSession } from '../../../api';

// Custom Hook
import useOriginatorData from './hooks/useOriginatorData';

// Tab Components
import OriginatorOverviewTab from './components/OriginatorOverviewTab';
import OriginatorDocumentsTab from './components/OriginatorDocumentsTab';
import RequestFacilitiesPage from '../../shared/components/RequestFacilitiesPage';

// Shared Components
import UserProfileTab from '../../shared/components/UserProfileTab';
import FloatingChat from '../../shared/components/FloatingChat';
import ChangePasswordModal from '../../shared/modals/ChangePasswordModal';
import PWAInstallBanner from '../../shared/components/PWAInstallBanner';
import { formatOfficeLabel } from '../../../utils/officeLabel';
import NotificationDropdown from '../../shared/components/NotificationDropdown';
import SubmissionOverviewTab from '../../shared/components/SubmissionOverviewTab';
import useSubmissionAccess from '../../shared/hooks/useSubmissionAccess';
import CollaborativeSubmissionsTab from '../../shared/components/CollaborativeSubmissionsTab';
import SubmissionActivityHistoryTab from '../../shared/components/SubmissionActivityHistoryTab';

// Modals
import DocumentSubmissionModal from './modals/DocumentSubmissionModal';
import NewSubmissionQrModal from './modals/NewSubmissionQrModal';

export default function OriginatorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetChatDoc, setTargetChatDoc] = useState(null);
  const [activeNotificationDocId, setActiveNotificationDocId] = useState(null);
  const [facilitiesExpanded, setFacilitiesExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const {
    userId, userName, navigate,
    activeTab, setActiveTab,
    notifications,
    hasUnreadChats, setHasUnreadChats,
    profile, setProfile,
    showModal, setShowModal,
    showQrModal, setShowQrModal,
    showPassModal, setShowPassModal,
    generatedQr,
    form, setForm, passForm, setPassForm,
    selectedRoutePreview, estimatedDate,
    recentDocStops, documents, processTypes,
    workflowsLoading, workflowError, retryWorkflows,
    pendingCount, mostRecentDoc,
    saveProfileChanges, updatePasswordRequest,
    handleProcessChange, submitDocument, toggleTwoFactorAuth,
    fetchDashboardLedger
  } = useOriginatorData();
  const submissionAccess = useSubmissionAccess(userId);

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const openFacilitiesMenu = () => {
    setFacilitiesExpanded(current => activeTab.startsWith('resource-') ? !current : true);
    if (!activeTab.startsWith('resource-')) setActiveTab('resource-gym');
  };

  const openDocumentsMenu = () => {
    const documentTabs = ['documents', 'shared-submissions', 'archived-submissions', 'office-submissions', 'department-submissions'];
    setDocumentsExpanded(current => documentTabs.includes(activeTab) ? !current : true);
    if (!documentTabs.includes(activeTab)) setActiveTab('documents');
  };

  const handleSelectDocumentDetails = (doc) => {
    setActiveNotificationDocId(doc.ini_id);
    setActiveTab('documents');
  };

  const handleNotificationClick = (notif) => {
    if (!notif.ini_id) return;
    setActiveNotificationDocId(notif.ini_id);
    setActiveTab('documents');
  };

  const handleOpenChatWithDoc = (doc) => {
    setTargetChatDoc(doc);
    setIsChatOpen(true);
    setHasUnreadChats(false);
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Faculty</span>
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
            <button onClick={() => handleTabSelect('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Home
            </button>
            <div>
              <button onClick={openDocumentsMenu} aria-expanded={documentsExpanded} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${['documents', 'shared-submissions', 'archived-submissions', 'office-submissions', 'department-submissions'].includes(activeTab) ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                <span className="flex items-center gap-3"><FileText size={18} /> Documents</span><ChevronDown size={15} className={`transition-transform ${documentsExpanded ? 'rotate-180' : ''}`} />
              </button>
              {documentsExpanded && <div className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
                <button onClick={() => handleTabSelect('documents')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${activeTab === 'documents' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Personal Submissions</button>
                <button onClick={() => handleTabSelect('shared-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${activeTab === 'shared-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Shared With Me</button>
                <button onClick={() => handleTabSelect('archived-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${activeTab === 'archived-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Archived</button>
                {submissionAccess.offices.length > 0 && <button onClick={() => handleTabSelect('office-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${activeTab === 'office-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Office Submissions</button>}
                {submissionAccess.departments.length > 0 && <button onClick={() => handleTabSelect('department-submissions')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${activeTab === 'department-submissions' ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>Department Submissions</button>}
              </div>}
            </div>
            <div>
              <button onClick={openFacilitiesMenu} aria-expanded={facilitiesExpanded} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab.startsWith('resource-') ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
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
            <button onClick={() => handleTabSelect('submission-history')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab === 'submission-history' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}><History size={18}/> History</button>
          </nav>
        </div>

        <div className="border-t border-neutral-700 pt-4">
          <button onClick={async () => { await endSession(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-400 hover:bg-red-950/40 hover:text-red-400 font-semibold rounded-lg transition-colors cursor-pointer">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white px-4 md:px-8 flex items-center justify-between shadow-xs flex-shrink-0 relative">
          <div className="flex min-w-0 items-center gap-3 text-left">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-neutral-900 md:text-lg">
                {activeTab === 'resource-gym' ? 'Request Gymnasium' : activeTab === 'resource-room' ? 'Request a Room' : activeTab === 'resource-vehicle' ? 'Request a Vehicle' : activeTab === 'resource-requests' ? 'Submitted Facility Requests' : activeTab === 'documents' ? 'Personal Submissions' : activeTab === 'shared-submissions' ? 'Shared With Me' : activeTab === 'archived-submissions' ? 'Archived Submissions' : activeTab === 'submission-history' ? 'History' : activeTab === 'office-submissions' ? 'Office Submissions' : activeTab === 'department-submissions' ? 'Department Submissions' : activeTab === 'profile' ? 'Profile Management' : 'Home'}
              </h2>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                {formatOfficeLabel(profile.departmentName)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 text-neutral-600">
            <NotificationDropdown 
              userId={userId}
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
            />
            <button onClick={() => setActiveTab('profile')} className={`p-2 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer ${activeTab === 'profile' ? 'bg-neutral-100 text-red-800' : ''}`}>
              <User size={20} />
            </button>
          </div>
        </header>

        {/* DYNAMIC TAB RENDERING */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <OriginatorOverviewTab 
              profile={profile}
              userName={userName}
              documents={documents}
              pendingCount={pendingCount}
              mostRecentDoc={mostRecentDoc}
              recentDocStops={recentDocStops}
              setShowModal={setShowModal}
              setActiveTab={setActiveTab}
              onSelectDocumentDetails={handleSelectDocumentDetails}
            />
          )}

          {activeTab === 'documents' && (
            <OriginatorDocumentsTab 
              userId={userId}
              documents={documents}
              fetchDashboardLedger={fetchDashboardLedger}
              setShowModal={setShowModal}
              processTypes={processTypes}
              onOpenChatWithDoc={handleOpenChatWithDoc}
              targetDocId={activeNotificationDocId}
              onClearTargetDocId={() => setActiveNotificationDocId(null)}
            />
          )}

          {activeTab === 'office-submissions' && <SubmissionOverviewTab type="office" scopes={submissionAccess.offices} />}
          {activeTab === 'department-submissions' && <SubmissionOverviewTab type="department" scopes={submissionAccess.departments} />}
          {activeTab === 'shared-submissions' && <CollaborativeSubmissionsTab mode="shared" onOpenChat={handleOpenChatWithDoc} />}
          {activeTab === 'archived-submissions' && <CollaborativeSubmissionsTab mode="archived" onOpenChat={handleOpenChatWithDoc} />}
          {activeTab === 'submission-history' && <SubmissionActivityHistoryTab onOpenChat={handleOpenChatWithDoc} />}

          {activeTab === 'profile' && (
            <UserProfileTab 
              profileName={profile.fullName}
              setProfileName={(val) => setProfile({ ...profile, fullName: val })}
              profileEmail={profile.email}
              setProfileEmail={(val) => setProfile({ ...profile, email: val })}
              facultyId={profile.facultyId}
              officeName={profile.departmentName}
              twoFaEnabled={profile.twoFaEnabled}
              toggle2FA={toggleTwoFactorAuth}
              handleUpdateProfile={saveProfileChanges}
              setShowPassModal={setShowPassModal}
            />
          )}

          {activeTab === 'resource-gym' && <RequestFacilitiesPage userId={userId} officeName={profile.departmentName} facility="Gymnasium" />}
          {activeTab === 'resource-room' && <RequestFacilitiesPage userId={userId} officeName={profile.departmentName} facility="Multimedia Room" />}
          {activeTab === 'resource-vehicle' && <RequestFacilitiesPage userId={userId} officeName={profile.departmentName} facility="Van" />}
          {activeTab === 'resource-requests' && <RequestFacilitiesPage userId={userId} officeName={profile.departmentName} view="requests" />}
        </div>
      </div>

      <FloatingChat
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        hasUnread={hasUnreadChats}
        onUnreadCleared={() => setHasUnreadChats(false)}
        userId={userId}
        targetDoc={targetChatDoc}
        onClearTargetDoc={() => setTargetChatDoc(null)}
        label="Chat with Offices"
      />

      {/* MODALS */}
      <ChangePasswordModal 
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        currentPassword={passForm.currentPassword}
        setCurrentPassword={(val) => setPassForm({ ...passForm, currentPassword: val })}
        newPassword={passForm.newPassword}
        setNewPassword={(val) => setPassForm({ ...passForm, newPassword: val })}
        confirmPassword={passForm.confirmNew}
        setConfirmPassword={(val) => setPassForm({ ...passForm, confirmNew: val })}
        handleUpdatePassword={updatePasswordRequest}
      />

      {showModal && ( 
        <DocumentSubmissionModal 
          setShowModal={setShowModal}
          submitDocument={submitDocument}
          form={form}
          setForm={setForm}
          handleProcessChange={handleProcessChange}
          processTypes={processTypes}
          estimatedDate={estimatedDate}
          selectedRoutePreview={selectedRoutePreview}
          placeholderSelections={form.placeholderSelections || {}}
          workflowsLoading={workflowsLoading}
          workflowError={workflowError}
          retryWorkflows={retryWorkflows}
        />
      )}

      {showQrModal && ( 
        <NewSubmissionQrModal 
          generatedQr={generatedQr}
          setShowQrModal={setShowQrModal}
        />
      )}

    </div>
  );
}
