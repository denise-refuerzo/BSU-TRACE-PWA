import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { LogOut } from 'lucide-react';

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

//--shared component
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
  
  // Master State to control which portal view is active
  const [activeSidebar, setActiveSidebar] = useState('dashboard'); // 'dashboard' | 'accounts' | 'matrix' | 'analytics'

  // Initialize Custom Hooks
  const { data: dashboardData } = useAdminDashboard();
  const accountProps = useAccountManagement();
  const matrixProps = useRolesPermissions();

  // Dynamic Header Title based on active tab
  const getHeaderTitle = () => {
    switch (activeSidebar) {
      case 'accounts': return "Account Management & Access Controller";
      case 'matrix': return "Roles & Permissions Matrix Dashboard Node";
      case 'analytics': return "Operational & Service Analytics Engine";
      default: return "Infrastructure Overview Dashboard Controller";
    }
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
    <div className="flex h-screen w-screen bg-[#FDFBF9] overflow-hidden text-neutral-800 font-sans">
      
      <PWAInstallBanner />

      {/* Sidebar Navigation Panel */}
      <div className="w-64 bg-[#2D1F1E] text-neutral-300 flex flex-col justify-between p-4 shrink-0">
        <div>
        <div className="flex items-center gap-3 border-b border-neutral-700 pb-4 mb-6">
            <img 
              src="/bsu-logo.png" 
              alt="Batangas State University Logo" 
              className="h-15 w-auto object-contain drop-shadow-sm" 
            />
            <div>
              <h1 className="font-bold text-white text-sm">BSU - Trace</h1>
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">ICT Admin</span>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <button 
              type="button" 
              onClick={() => setActiveSidebar('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'dashboard' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              type="button" 
              onClick={() => setActiveSidebar('accounts')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'accounts' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              Accounts
            </button>
            <button 
              type="button" 
              onClick={() => setActiveSidebar('matrix')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'matrix' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              Roles & Matrix
            </button>
            
            <button 
              type="button" 
              onClick={() => setActiveSidebar('analytics')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'analytics' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              Operational Analytics 
            </button>
          </nav>
        </div>
        <div className="border-t border-neutral-700 pt-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Panel Content Scroll Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        <header className="h-16 border-b border-neutral-200/80 bg-white px-8 flex items-center justify-between shadow-xs shrink-0">
          <div className="text-neutral-900 font-black text-xs uppercase tracking-wider font-mono">
            {getHeaderTitle()}
          </div>
          <div className="flex items-center gap-2 border-l pl-4 border-neutral-200 text-xs">
            <span className="font-bold text-neutral-900">{adminName}</span>
            <span className="bg-neutral-100 px-2 py-0.5 rounded text-[10px] uppercase text-neutral-500 font-bold">ICT Root</span>
          </div>
        </header>

        <main className="p-8 max-w-5xl w-full mx-auto space-y-8">
          
          {/* RENDER TAB CONTEXT BASED ON SIDEBAR STATE */}
          {activeSidebar === 'dashboard' && <DashboardOverviewTab data={dashboardData} />}
          
          {activeSidebar === 'accounts' && <AccountManagementTab {...accountProps} />}
          
          {activeSidebar === 'matrix' && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-2xl font-black tracking-tight text-neutral-900">System Permissions & Workflow Engineering</h2>
                <p className="text-xs text-gray-500">Configure dynamic tracking routes, security matrix parameters, and registration building locations.</p>
              </div>

              {/* Sub-tab Controller for Matrix View */}
              <div className="flex border-b border-neutral-200 gap-2">
                <button type="button" onClick={() => matrixProps.setActiveTab('routes')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${matrixProps.activeTab === 'routes' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}>🗺️ Interactive Visualizer</button>
                <button type="button" onClick={() => matrixProps.setActiveTab('infrastructure')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${matrixProps.activeTab === 'infrastructure' ? 'border-red-800 text-red-800' : 'border-transparent text-gray-400 hover:text-neutral-700'}`}>🏢 Campus Infrastructure</button>
              </div>

              {/* RENDER MATRIX SUB-COMPONENTS */}
              {matrixProps.activeTab === 'routes' && <InteractiveVisualizerTab {...matrixProps} />}
              {matrixProps.activeTab === 'infrastructure' && <CampusInfrastructureTab {...matrixProps} />}
            </div>
          )}

          {activeSidebar === 'analytics' && <OperationalAnalytics />}
        </main>
      </div>

      {/* GLOBAL MODALS */}
      <ManageAccountModal 
        selectedUser={accountProps.selectedUser}
        setSelectedUser={accountProps.setSelectedUser}
        handleUpdateAccount={accountProps.handleUpdateAccount}
        offices={accountProps.offices}
      />
    </div>
  );
}