import React, { useEffect } from 'react';
import { LayoutDashboard, FileText, School, Bell, User, MessageSquare } from 'lucide-react';

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

// Modals
import DocumentSubmissionModal from './modals/DocumentSubmissionModal';
import NewSubmissionQrModal from './modals/NewSubmissionQrModal';

export default function OriginatorDashboard() {
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

  return (
    <div className="flex h-screen w-screen bg-[#FAF8F5] text-neutral-800 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-[#2D1F1E] text-neutral-300 flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 border-b border-neutral-700 pb-4 mb-6">
            <div className="bg-red-700 p-2 rounded-lg text-white font-bold text-xl">🎓</div>
            <div>
              <h1 className="font-bold text-white text-sm">BSU Portal</h1>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Institutional Management</span>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <LayoutDashboard size={18} /> Home
            </button>
            <button onClick={() => setActiveTab('documents')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'documents' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <FileText size={18} /> Documents
            </button>
            <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'resources' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <School size={18} /> School Resources
            </button>
            <button onClick={() => { setActiveTab('messages'); setHasUnreadChats(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${activeTab === 'messages' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
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
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-400 hover:bg-red-950/40 hover:text-red-400 font-semibold rounded-lg transition-colors">
            <span>🚪</span> Logout Session
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white px-8 flex items-center justify-between shadow-sm flex-shrink-0 relative">
          <h2 className="text-lg font-bold text-neutral-800 capitalize">{activeTab} Management Hub</h2>
          <div className="flex items-center gap-4 text-neutral-600">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-neutral-100 relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden">
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
        <div className="flex-1 overflow-y-auto p-8">
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

      {/* SHARED PASSWORD MODAL */}
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

      {/* DOCUMENT SUBMISSION MODAL */}
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

      {/* NEW SUBMISSION QR SUCCESS MODAL */}
      {showQrModal && ( 
        <NewSubmissionQrModal 
          generatedQr={generatedQr}
          setShowQrModal={setShowQrModal}
        />
      )}

    </div>
  );
}