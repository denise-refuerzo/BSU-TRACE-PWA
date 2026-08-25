import React, { useState } from 'react';
import { LayoutDashboard, FileText, School, Bell, User, MessageSquare, LogOut, Menu, X } from 'lucide-react';

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

// Modals
import DocumentSubmissionModal from './modals/DocumentSubmissionModal';
import NewSubmissionQrModal from './modals/NewSubmissionQrModal';

export default function OriginatorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const {
    userId, userName, navigate, notificationRef,
    activeTab, setActiveTab,
    search, setSearch, filterStatus, setFilterStatus,
    currentPage, setCurrentPage, itemsPerPage,
    hasUnreadChats, setHasUnreadChats,
    showNotifications, setShowNotifications,
    notifications,
    profile, setProfile, isProfileChanged,
    showModal, setShowModal,
    showQrModal, setShowQrModal,
    showPassModal, setShowPassModal,
    generatedQr,
    form, setForm, passForm, setPassForm,
    selectedRoutePreview, estimatedDate, statusMsg,
    recentDocStops, documents, processTypes,
    filteredDocuments, currentLedgerDocs, totalPages, pendingCount, mostRecentDoc,
    handleNotificationClick, saveProfileChanges, updatePasswordRequest,
    handleProcessChange, submitDocument, toggleTwoFactorAuth,
    formatRelativeTime, fetchDashboardLedger, fetchUserProfile
  } = useOriginatorData();

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
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
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1 text-sm">
            <button onClick={() => handleTabSelect('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Home
            </button>
            <button onClick={() => handleTabSelect('documents')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'documents' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <FileText size={18} /> Documents
            </button>
            <button onClick={() => handleTabSelect('resources')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'resources' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <School size={18} /> School Resources
            </button>
            <button onClick={() => { handleTabSelect('messages'); setHasUnreadChats(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'messages' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
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
          <button onClick={() => { sessionStorage.removeItem('bsu_pwa_banner_dismissed'); localStorage.clear(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-400 hover:bg-red-950/40 hover:text-red-400 font-semibold rounded-lg transition-colors">
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
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base md:text-lg font-bold text-neutral-800 capitalize truncate">{activeTab} Management Hub</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4 text-neutral-600">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-neutral-100 relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-neutral-100 bg-[#FDFBF9] font-bold text-xs uppercase text-neutral-900">Notifications</div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className="p-4 text-xs text-left hover:bg-neutral-50 cursor-pointer transition-colors border-b last:border-b-0"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-neutral-900">{n.title}</p>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                            {formatRelativeTime(n.time)}
                          </span>
                        </div>
                        <p className="text-neutral-500 mt-1">{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-4 text-xs text-neutral-400 text-center font-bold">📭 No active updates.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setActiveTab('profile')} className={`p-2 rounded-full hover:bg-neutral-100 transition-colors ${activeTab === 'profile' ? 'bg-neutral-100 text-red-800' : ''}`}>
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
              currentLedgerDocs={currentLedgerDocs}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              setShowModal={setShowModal}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'documents' && (
            <OriginatorDocumentsTab 
              userId={userId}
              documents={documents}
              fetchDashboardLedger={fetchDashboardLedger}
              setShowModal={setShowModal}
              processTypes={processTypes}
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
            <OfficeChatHub userId={userId} roleId={1} />
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
          setSelectedRoutePreview={(val) => {}}
          setEstimatedDate={(val) => {}}
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