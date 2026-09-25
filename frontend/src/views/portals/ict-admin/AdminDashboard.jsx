import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { endSession } from '../../../api';
import { BarChart3, Building2, ChevronDown, FileText, GitBranch, Landmark, LayoutDashboard, Link2, LogOut, Menu, Network, UserPlus, Users, X } from 'lucide-react';

// --- CUSTOM HOOKS ---
import { useAdminDashboard } from './hooks/useAdminDashboard';
import { useAccountManagement } from './hooks/useAccountManagement';
import { useRolesPermissions } from './hooks/useRolesPermissions';

// --- MODULAR TAB COMPONENTS ---
import DashboardOverviewTab from './components/DashboardOverviewTab';
import AccountManagementTab from './components/AccountManagementTab';
import SystemManagementTab from './components/SystemManagementTab';
import OperationalAnalytics from './components/OperationalAnalyticsTab';
import RegistrationManagementTab from './components/RegistrationManagementTab';

// --- MODALS ---
import ManageAccountModal from './modals/ManageAccountModal';
import OfficeEditModal from './modals/OfficeEditModal';

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
  const [isAccountsManagementOpen, setIsAccountsManagementOpen] = useState(false);
  const [isSystemManagementOpen, setIsSystemManagementOpen] = useState(false);
  const [systemManagementSection, setSystemManagementSection] = useState('offices');

  const { data: dashboardData } = useAdminDashboard(activeSidebar === 'dashboard');
  const accountProps = useAccountManagement(activeSidebar === 'accounts');
  const matrixProps = useRolesPermissions(activeSidebar === 'matrix');

  const accountSectionTitles = {
    registry: 'Account Registry',
    create: 'Create Account',
    registration: 'Registration Management'
  };

  const systemSectionTitles = {
    offices: 'Office Locations',
    departments: 'Departments',
    categories: 'Document Types',
    workflows: 'Document Workflows',
    requests: 'Additional Routing'
  };

  const getHeaderTitle = () => {
    switch (activeSidebar) {
      case 'accounts': return accountSectionTitles[accountProps.activeTab] || 'Accounts Management';
      case 'matrix': return systemSectionTitles[systemManagementSection] || 'System Management';
      case 'analytics': return 'Operational Analytics';
      default: return 'Operations Control Center';
    }
  };

  const handleTabSelect = (tab) => {
    setActiveSidebar(tab);
    setIsSidebarOpen(false);
  };

  const handleSystemManagementSelect = () => {
    if (activeSidebar === 'matrix') {
      setIsSystemManagementOpen(open => !open);
    } else {
      setActiveSidebar('matrix');
      setIsSystemManagementOpen(true);
    }
  };

  const handleAccountsManagementSelect = () => {
    if (activeSidebar === 'accounts') {
      setIsAccountsManagementOpen(open => !open);
    } else {
      setActiveSidebar('accounts');
      accountProps.setActiveTab('registry');
      setIsAccountsManagementOpen(true);
    }
  };

  const handleAccountSectionSelect = section => {
    accountProps.setActiveTab(section);
    setActiveSidebar('accounts');
    setIsAccountsManagementOpen(true);
    setIsSidebarOpen(false);
  };

  const handleSystemManagementSectionSelect = section => {
    setSystemManagementSection(section);
    setActiveSidebar('matrix');
    setIsSystemManagementOpen(true);
    setIsSidebarOpen(false);
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

  return (
    <div className="trace-portal flex h-screen w-screen bg-[#FDFBF9] overflow-hidden text-neutral-800 font-sans relative">
      
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
            <div>
              <button
                type="button"
                onClick={handleAccountsManagementSelect}
                aria-expanded={isAccountsManagementOpen}
                aria-controls="accounts-management-navigation"
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors text-left ${activeSidebar === 'accounts' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
              >
                <Users size={16} className="shrink-0" /> <span className="min-w-0 flex-1">Account Management</span><ChevronDown size={14} className={`shrink-0 transition-transform ${isAccountsManagementOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAccountsManagementOpen && <div id="accounts-management-navigation" className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
                {[
                  { id: 'registry', label: 'Account Registry', icon: FileText },
                  { id: 'create', label: 'Create Account', icon: UserPlus },
                  { id: 'registration', label: 'Registration Management', icon: Link2 }
                ].map(item => {
                  const Icon = item.icon;
                  return <button key={item.id} type="button" onClick={() => handleAccountSectionSelect(item.id)} className={`w-full flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${activeSidebar === 'accounts' && accountProps.activeTab === item.id ? 'bg-red-900/40 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}><Icon size={13} className="shrink-0" /> {item.label}</button>;
                })}
              </div>}
            </div>
            <div>
              <button 
                type="button" 
                onClick={handleSystemManagementSelect}
                aria-expanded={isSystemManagementOpen}
                aria-controls="system-management-navigation"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeSidebar === 'matrix' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
              >
                <Network size={18} /> <span className="flex-1">System Management</span><ChevronDown size={16} className={`transition-transform ${isSystemManagementOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSystemManagementOpen && <div id="system-management-navigation" className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
                {[
                  { id: 'offices', label: 'Office Locations', icon: Building2 },
                  { id: 'departments', label: 'Departments', icon: Landmark },
                  { id: 'categories', label: 'Document Types', icon: FileText },
                  { id: 'workflows', label: 'Document Workflows', icon: GitBranch },
                  { id: 'requests', label: 'Additional Routing', icon: GitBranch }
                ].map(item => {
                  const Icon = item.icon;
                  return <button key={item.id} type="button" onClick={() => handleSystemManagementSectionSelect(item.id)} className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold transition-colors ${activeSidebar === 'matrix' && systemManagementSection === item.id ? 'bg-red-900/40 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}><Icon size={14} /> {item.label}</button>;
                })}
              </div>}
            </div>
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
            <div className="min-w-0 text-left">
              <h2 className="truncate text-base font-black text-neutral-900 md:text-lg">
                {getHeaderTitle()}
              </h2>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                ICT Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l pl-3 md:pl-4 border-neutral-200 text-xs">
            <span className="font-bold text-neutral-900 truncate max-w-[120px] md:max-w-none">{adminName}</span>
            <span className="bg-neutral-100 px-2 py-0.5 rounded text-[10px] uppercase text-neutral-500 font-bold">ICT Root</span>
          </div>
        </header>

        <main className={`w-full space-y-6 p-4 md:p-8 md:space-y-8 ${activeSidebar === 'analytics' ? 'max-w-none' : 'mx-auto max-w-8xl'}`}>
          {activeSidebar === 'dashboard' && <DashboardOverviewTab data={dashboardData} />}
          {activeSidebar === 'accounts' && accountProps.activeTab === 'registration' && <RegistrationManagementTab />}
          {activeSidebar === 'accounts' && accountProps.activeTab !== 'registration' && <AccountManagementTab {...accountProps} />}
          
          {activeSidebar === 'matrix' && <SystemManagementTab key={systemManagementSection} matrixProps={matrixProps} section={systemManagementSection} />}

          {activeSidebar === 'analytics' && <OperationalAnalytics />}
        </main>
      </div>

      <ManageAccountModal 
        selectedUser={accountProps.selectedUser}
        setSelectedUser={accountProps.setSelectedUser}
        handleUpdateAccount={accountProps.handleUpdateAccount}
        offices={accountProps.offices}
        departments={accountProps.departments}
        accounts={accountProps.accounts}
      />
      <OfficeEditModal
        office={matrixProps.editingOffice}
        offices={matrixProps.offices}
        onClose={() => matrixProps.setEditingOffice(null)}
        onSave={matrixProps.saveOfficeEdit}
      />
    </div>
  );
}
