import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { LogOut, Menu, X, LayoutDashboard, Users, Network, BarChart3 } from 'lucide-react';

// --- CUSTOM HOOKS ---
import { useAdminDashboard } from './hooks/useAdminDashboard';
import { useAccountManagement } from './hooks/useAccountManagement';
import { useRolesPermissions } from './hooks/useRolesPermissions';

// --- MODULAR TAB COMPONENTS ---
import DashboardOverviewTab from './components/DashboardOverviewTab';
import AccountManagementTab from './components/AccountManagementTab';
import InteractiveVisualizerTab from './components/InteractiveVisualizerTab';
import CampusInfrastructureTab from './components/CampusInfrastructureTab';
import OperationalAnalytics from './components/OperationalAnalyticsTab';

// --- MODALS ---
import ManageAccountModal from './modals/ManageAccountModal';

// -- Shared Component --
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem('user') || 'Admin User';
  
  const [activeSidebar, setActiveSidebar] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: dashboardData } = useAdminDashboard();
  const accountProps = useAccountManagement();
  const matrixProps = useRolesPermissions();

  const getHeaderTitle = () => {
    switch (activeSidebar) {
      case 'accounts': return "Account Management & Access";
      case 'matrix': return "Roles & Permissions Matrix";
      case 'analytics': return "Operational Analytics Engine";
      default: return "Infrastructure Overview Controller";
    }
  };

  const handleTabSelect = (tab) => {
    setActiveSidebar(tab);
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

  return (
    <div className="flex h-screen w-screen bg-[#FDFBF9] overflow-hidden text-neutral-800 font-sans relative">
      
      <PWAInstallBanner />

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation Panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2D1F1E] text-neutral-300 flex flex-col justify-between p-4 shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
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
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">ICT Admin</span>
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
            <button 
              type="button" 
              onClick={() => handleTabSelect('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'dashboard' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              type="button" 
              onClick={() => handleTabSelect('accounts')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'accounts' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <Users size={18} /> Accounts
            </button>
            <button 
              type="button" 
              onClick={() => handleTabSelect('matrix')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'matrix' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <Network size={18} /> Roles & Matrix
            </button>
            <button 
              type="button" 
              onClick={() => handleTabSelect('analytics')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'analytics' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <BarChart3 size={18} /> Operational Analytics 
            </button>
          </nav>
        </div>

        <div className="border-t border-neutral-700 pt-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative min-w-0">
        <header className="h-16 border-b border-neutral-200/80 bg-white px-4 md:px-8 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="text-neutral-900 font-black text-xs uppercase tracking-wider font-mono truncate">
              {getHeaderTitle()}
            </div>
          </div>

          <div className="flex items-center gap-2 border-l pl-3 md:pl-4 border-neutral-200 text-xs">
            <span className="font-bold text-neutral-900 truncate max-w-[120px] md:max-w-none">{adminName}</span>
            <span className="bg-neutral-100 px-2 py-0.5 rounded text-[10px] uppercase text-neutral-500 font-bold">ICT Root</span>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6 md:space-y-8">
          {activeSidebar === 'dashboard' && <DashboardOverviewTab data={dashboardData} />}
          {activeSidebar === 'accounts' && <AccountManagementTab {...accountProps} />}
          
          {activeSidebar === 'matrix' && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-neutral-900">System Permissions & Workflow Engineering</h2>
                <p className="text-xs text-gray-500">Configure dynamic tracking routes, security matrix parameters, and registration building locations.</p>
              </div>

              <div className="flex border-b border-neutral-200 gap-2 overflow-x-auto">
                <button type="button" onClick={() => matrixProps.setActiveTab('routes')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${matrixProps.activeTab === 'routes' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}>🗺️ Interactive Visualizer</button>
                <button type="button" onClick={() => matrixProps.setActiveTab('infrastructure')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${matrixProps.activeTab === 'infrastructure' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}>🏢 Campus Infrastructure</button>
              </div>

              {matrixProps.activeTab === 'routes' && <InteractiveVisualizerTab {...matrixProps} />}
              {matrixProps.activeTab === 'infrastructure' && <CampusInfrastructureTab {...matrixProps} />}
            </div>
          )}

          {activeSidebar === 'analytics' && <OperationalAnalytics />}
        </main>
      </div>

      <ManageAccountModal 
        selectedUser={accountProps.selectedUser}
        setSelectedUser={accountProps.setSelectedUser}
        handleUpdateAccount={accountProps.handleUpdateAccount}
        offices={accountProps.offices}
      />
    </div>
  );
}