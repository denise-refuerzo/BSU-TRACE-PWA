import React from 'react';
import { LayoutDashboard, FileText, History, Bell, User, LogOut } from 'lucide-react';

// Import Custom Hook
import { useSigneeData } from './hooks/useSigneeData';

// Import Tab Components
import SigneeOverviewTab from './components/SigneeOverviewTab';
import SigneeDocumentsTab from './components/SigneeDocumentsTab';
import SigneeHistoryTab from './components/SigneeHistoryTab';
import UserProfileTab from '../../shared/components/UserProfileTab';

// Import Modals
import DocumentDetailsModal from './modals/DocumentDetailsModal';
import ChangePasswordModal from '../../shared/modals/ChangePasswordModal';

export default function SigneeDashboard() {
  // 1. Initialize all state and logic from our custom hook
  const signeeData = useSigneeData();
  
  // Destructure frequently used variables for the layout shell
  const {
    activeTab,
    setActiveTab,
    userName,
    signeeOfficeName,
    notifications,
    showNotifications,
    setShowNotifications,
    notificationRef,
    handleLogout,
    setSearch,
    setDashboardPage,
    setFilterStatus,
    setPipelinePage,
    setHistoryFilter,
    setHistoryPage,
    formatRelativeTime,
    showPassModal,
    setShowPassModal
  } = signeeData;

  return (
    <div className="flex h-screen w-screen bg-[#FAF8F5] text-neutral-800 font-sans overflow-hidden">
      
      {/* 2. Sidebar Navigation */}
      <div className="w-64 bg-[#2D1F1E] text-neutral-300 flex flex-col justify-between p-4 flex-shrink-0 text-left">
        <div>
        <div className="flex items-center gap-3 border-b border-neutral-700 pb-4 mb-6">
            <img 
                src="/bsu-logo.png" 
                alt="Batangas State University Logo" 
                className="h-15 w-auto object-contain drop-shadow-sm" 
              />
            <div>
              <h1 className="font-bold text-white text-sm">BSU - Trace</h1>
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Office Signee</span>
            </div>
          </div>
          
          <nav className="space-y-1 text-sm">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSearch(''); setDashboardPage(1); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('documents'); setSearch(''); setFilterStatus('All'); setPipelinePage(1); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'documents' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <FileText size={18} /> Documents
            </button>
            <button 
              onClick={() => { setActiveTab('history'); setSearch(''); setHistoryFilter('All'); setHistoryPage(1); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'history' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <History size={18} /> History
            </button>
          </nav>
        </div>

        <div className="border-t border-neutral-700 pt-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-200 bg-white px-8 flex items-center justify-between shadow-sm flex-shrink-0 relative">
          <div className="text-left">
            <h2 className="text-lg font-black text-neutral-900 capitalize">
              {activeTab === 'profile' ? 'Profile Management Hub' : `${activeTab} Operational Hub`}
            </h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Assigned: {signeeOfficeName}</p>
          </div>
          
          <div className="flex items-center gap-4 text-neutral-600">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-neutral-100 relative transition-colors">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
                  <div className="p-4 border-b border-neutral-100 bg-[#FDFBF9] font-bold text-xs uppercase text-neutral-900 tracking-wide">Notifications</div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
                      {notifications.map(n => (
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

        {/* Dynamic Tab Rendering */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'dashboard' && <SigneeOverviewTab {...signeeData} />}
          {activeTab === 'documents' && <SigneeDocumentsTab {...signeeData} />}
          {activeTab === 'history' && <SigneeHistoryTab {...signeeData} />}
          {activeTab === 'profile' && (
            <UserProfileTab 
              profileName={signeeData.profileName}
              setProfileName={signeeData.setProfileName}
              profileEmail={signeeData.profileEmail}
              setProfileEmail={signeeData.setProfileEmail}
              facultyId={signeeData.facultyId}
              officeName={signeeData.signeeOfficeName}
              twoFaEnabled={signeeData.twoFaEnabled}
              toggle2FA={signeeData.toggle2FA}
              handleUpdateProfile={signeeData.handleUpdateProfile}
              setShowPassModal={signeeData.setShowPassModal}
            />
          )}
        </div>
      </div>

      {/* 4. Modals */}
      <DocumentDetailsModal {...signeeData} />
      
      <ChangePasswordModal 
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        currentPassword={signeeData.currentPassword}
        setCurrentPassword={signeeData.setCurrentPassword}
        newPassword={signeeData.newPassword}
        setNewPassword={signeeData.setNewPassword}
        confirmPassword={signeeData.confirmPassword}
        setConfirmPassword={signeeData.setConfirmPassword}
        handleUpdatePassword={signeeData.handleUpdatePassword}
      />

    </div>
  );
}