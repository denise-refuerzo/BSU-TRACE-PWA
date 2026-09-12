import React, { useState } from 'react';
import { LayoutDashboard, FileText, School, User, MessageSquare, LogOut, Menu, X } from 'lucide-react';

// Custom Hook
import useOriginatorData from './hooks/useOriginatorData';

// Tab Components
import OriginatorOverviewTab from './components/OriginatorOverviewTab';
import OriginatorDocumentsTab from './components/OriginatorDocumentsTab';
import OriginatorResourcesTab from './components/OriginatorResourcesTab';

// Shared Components
import UserProfileTab from '../../shared/components/UserProfileTab';
import OfficeChatHub from '../../shared/OfficeChatHub';
import ChangePasswordModal from '../../shared/modals/ChangePasswordModal';
import PWAInstallBanner from '../../shared/components/PWAInstallBanner';
import NotificationDropdown from '../../shared/components/NotificationDropdown';

// Modals
import DocumentSubmissionModal from './modals/DocumentSubmissionModal';
import NewSubmissionQrModal from './modals/NewSubmissionQrModal';

export default function OriginatorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetChatDoc, setTargetChatDoc] = useState(null);
  const [activeNotificationDocId, setActiveNotificationDocId] = useState(null);
  
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

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
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
    setActiveTab('messages');
    setHasUnreadChats(false);
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Originator</span>
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
            <button onClick={() => handleTabSelect('documents')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab === 'documents' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <FileText size={18} /> Documents
            </button>
            <button onClick={() => handleTabSelect('resources')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab === 'resources' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <School size={18} /> School Resources
            </button>
            <button onClick={() => { handleTabSelect('messages'); setHasUnreadChats(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${activeTab === 'messages' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <MessageSquare size={18} /> Chat with Offices
              </div>
              {hasUnreadChats && (
                <span className="w-2 h-2 bg-red-600 rounded-full mr-1 animate-pulse"></span>
              )}
            </button>
          </nav>
        </div>

        <div className="border-t border-neutral-700 pt-4">
          <button onClick={() => { sessionStorage.removeItem('bsu_pwa_banner_dismissed'); localStorage.clear(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-400 hover:bg-red-950/40 hover:text-red-400 font-semibold rounded-lg transition-colors cursor-pointer">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white px-4 md:px-8 flex items-center justify-between shadow-xs flex-shrink-0 relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base md:text-lg font-bold text-neutral-800 capitalize truncate">{activeTab} Management Hub</h2>
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

          {activeTab === 'messages' && (
            <OfficeChatHub 
              userId={userId} 
              roleId={1} 
              targetDoc={targetChatDoc}
              onClearTargetDoc={() => setTargetChatDoc(null)}
            />
          )}

          {activeTab === 'resources' && (
            <OriginatorResourcesTab userId={userId} />
          )}
        </div>
      </div>

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