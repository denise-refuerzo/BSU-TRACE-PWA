import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, Archive, ShoppingCart, BarChart3, History, Bell, User, LogOut, QrCode, MessageSquare 
} from 'lucide-react';
import { fetchWithAuth } from '../../../api';

// Custom Hook
import { useGSOAdminData } from './hooks/useGSOAdminData';

// Tab Components
import GSODashboardTab from './components/GSODashboardTab';
import GSOResourcesTab from './components/GSOResourcesTab';
import GSOProcurementTab from './components/GSOProcurementTab';
import GSOHistoryTab from './components/GSOHistoryTab';
import OperationalAnalyticsTab from './components/OperationalAnalyticsTab';

// Shared Components
import UserProfileTab from '../../shared/components/UserProfileTab';
import OfficeChatHub from '../../shared/OfficeChatHub';
import PWAInstallBanner from '../../shared/components/PWAInstallBanner';

// Modals
import QRScannerModal from './modals/QRScannerModal';
import AddAssetModal from './modals/AddAssetModal';
import ChangePasswordModal from '../../shared/modals/ChangePasswordModal';
import MasterChecklistModal from './modals/MasterChecklistModal';
import DocumentAuditModal from './modals/DocumentAuditModal';
import EditAssetModal from './modals/EditAssetModal';
import ExportLogsModal from './modals/ExportLogsModal';
import FacilityBlackoutModal from './modals/FacilityBlackoutModal';
import InventoryActionModal from './modals/InventoryActionModal';
import BookingRequirementsModal from './modals/BookingRequirementsModal';

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

export default function GSOAdminDashboard() {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize Custom Hook Data
  const {
    userId, userName, gsoOfficeName, gsoOfficeId, profileName, setProfileName, profileEmail, setProfileEmail,
    facultyId, departmentName, twoFaEnabled, setTwoFaEnabled, twoFaCode,
    notifications, setNotifications, hasUnreadChats, setHasUnreadChats,
    pipelineDocs, actionHistory, processTypes, officesList, expectedIncomingCount,
    assetsList, equipmentInventory, assetBlackouts,
    reservationsList, logisticsList,
    bottleneckData, peakDemandData, isAnalyticsLoading, routePerf, systemHealth,
    fetchGSOMeta, fetchProcurementData, fetchOperationalAnalytics, fetchBlackouts, fetchMasterAssets, fetchInventoryMetrics, fetchSystemAnalyticsData
  } = useGSOAdminData();

  // Tab Sync Listener
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchOperationalAnalytics();
      fetchSystemAnalyticsData();
    } else if (activeTab === 'resources') {
      fetchMasterAssets();
      fetchBlackouts();
      fetchInventoryMetrics();
    } else if (activeTab === 'procurement') {
      fetchProcurementData();
    }
  }, [activeTab]);

  // --- UI STATES ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [historyFilter, setHistoryFilter] = useState('All');
  const [dashboardPage, setDashboardPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [isHistoryDetails, setIsHistoryDetails] = useState(false);
  const itemsPerPage = 5;

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [showSendBackForm, setShowSendBackForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedAdHocOffice, setSelectedAdHocOffice] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanMode, setScanMode] = useState('time-in');
  const [simulatedQrInput, setSimulatedQrPayload] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);

  // Resource States
  const todayObj = new Date();
  const todayString = todayObj.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({ assetName: '', assetTypeId: '1', quantity: 1, isConfirmed: false });
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryModalMode, setInventoryModalMode] = useState('LEND');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [selectedEditAsset, setSelectedEditAsset] = useState(null);
  const [assetSchedule, setAssetSchedule] = useState([]);
  const [activeCalendarTab, setActiveCalendarTab] = useState('Gymnasium');
  const [blackoutForm, setBlackoutForm] = useState({ asd_id: '', start_time: '', end_time: '', reason: '' });
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Procurement States
  const [showChecklistMakerModal, setShowChecklistMakerModal] = useState(false);
  const [activeChecklistTab, setActiveChecklistTab] = useState('Vehicle');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetTab, setPrintTargetTab] = useState('Vehicle'); 
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');
  const [procSearch, setProcSearch] = useState({ vehicle: '', multimedia: '', gym: '', logistics: '' });
  const [procFilter, setProcFilter] = useState({ vehicle: 'All', multimedia: 'All', gym: 'All', logistics: 'All' });
  const [procPage, setProcPage] = useState({ vehicle: 1, multimedia: 1, gym: 1, logistics: 1 });
  const itemsPerProcPage = 5;

  const [bottleneckSort, setBottleneckSort] = useState('desc');
  const [bottleneckSearch, setBottleneckSearch] = useState('');
  const [demandTimeFilter, setDemandTimeFilter] = useState(3);
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  
  const [inventoryForm, setInventoryForm] = useState({
    requestorName: '', department: '', purpose: '', duration: '', quantityNeeded: '', returnDate: '', returnTime: '', isDamaged: false, damageNotes: ''
  });

  const [showActiveChecklistModal, setShowActiveChecklistModal] = useState(false);
  const [activeChecklistBooking, setActiveChecklistBooking] = useState(null);
  const [activeChecklistItems, setActiveChecklistItems] = useState([]);
  const [masterChecklistItems, setMasterChecklistItems] = useState([]);
  const [newChecklistName, setNewChecklistName] = useState('');

  // Password Update States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- DERIVED DATA ---
  const pendingDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'pending' && d.time_in !== null && !d.time_out);
  const archivedDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'action required');
  const completedDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'signed' || d.status?.toLowerCase() === 'completed' || d.time_out !== null);

  const filteredMasterDocs = pipelineDocs.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(search.toLowerCase()) || doc.qr_code?.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'Incoming') return matchesSearch && doc.time_in === null && !doc.time_out;
    if (filterStatus === 'Pending') return matchesSearch && doc.status?.toLowerCase() === 'pending' && doc.time_in !== null && !doc.time_out;
    if (filterStatus === 'Archived') return matchesSearch && doc.status?.toLowerCase() === 'action required';
    if (filterStatus === 'Completed') return matchesSearch && (doc.time_out !== null || doc.status?.toLowerCase() === 'signed' || doc.status?.toLowerCase() === 'completed');
    return matchesSearch;
  });

  const currentDashDocs = filteredMasterDocs.slice((dashboardPage - 1) * itemsPerPage, dashboardPage * itemsPerPage);
  const totalDashPages = Math.ceil(filteredMasterDocs.length / itemsPerPage);

  const filteredHistoryLogs = actionHistory.filter(log => {
    const matchesSearch = log.title?.toLowerCase().includes(search.toLowerCase()) || 
                          log.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          log.qr_code?.toLowerCase().includes(search.toLowerCase());
    return historyFilter !== 'All' ? (matchesSearch && log.action_type === historyFilter) : matchesSearch;
  });

  const currentHistoryPageRows = filteredHistoryLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const totalHistoryTabPages = Math.ceil(filteredHistoryLogs.length / itemsPerPage);

  // Procurement Processing
  const processProcurementData = (type, dataArray, searchKey, filterKey, pageKey) => {
    let filtered = type !== 'Logistics' ? dataArray.filter(item => item.booking_type === type) : dataArray;
    if (procSearch[searchKey]) {
      const lowerSearch = procSearch[searchKey].toLowerCase();
      filtered = filtered.filter(item => 
        (item.requestor?.toLowerCase().includes(lowerSearch)) ||
        (item.requestor_name?.toLowerCase().includes(lowerSearch)) ||
        (item.asset_name?.toLowerCase().includes(lowerSearch))
      );
    }
    if (procFilter[filterKey] !== 'All') filtered = filtered.filter(item => item.status === procFilter[filterKey]);
    const totalPages = Math.ceil(filtered.length / itemsPerProcPage) || 1;
    const currentPage = procPage[pageKey];
    const paginatedData = filtered.slice((currentPage - 1) * itemsPerProcPage, currentPage * itemsPerProcPage);
    return { filteredData: filtered, paginatedData, totalPages };
  };

  const vehicleData = processProcurementData('Vehicle', reservationsList, 'vehicle', 'vehicle', 'vehicle');
  const multimediaData = processProcurementData('Room', reservationsList, 'multimedia', 'multimedia', 'multimedia');
  const gymData = processProcurementData('Gymnasium', reservationsList, 'gym', 'gym', 'gym');
  const logData = processProcurementData('Logistics', logisticsList, 'logistics', 'logistics', 'logistics');

  // Analytics Processing
  const processedBottleneckData = [...(bottleneckData || [])]
    .filter(d => (d.office_name || '').toLowerCase().includes((bottleneckSearch || '').toLowerCase()))
    .sort((a, b) => bottleneckSort === 'desc' ? b.dwell_time_hours - a.dwell_time_hours : a.dwell_time_hours - b.dwell_time_hours)
    .slice(0, 5);

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - demandTimeFilter);
  const cutoffString = cutoffDate.toISOString().split('T')[0];
  const timeFilteredDemand = peakDemandData.filter(d => d.type === 'forecast' || d.date >= cutoffString);
  const transitionDate = timeFilteredDemand.find((d, i, arr) => d.type === 'historical' && arr[i + 1]?.type === 'forecast')?.date;

  const chartReadyDemandData = timeFilteredDemand.map(d => {
    const isForecast = d.type === 'forecast';
    const isTransition = d.date === transitionDate;
    return {
      ...d,
      van_hist: (!isForecast || isTransition) ? d.vehicle_demand : null,
      fac_hist: (!isForecast || isTransition) ? d.facility_demand : null,
      van_fore: (isForecast || isTransition) ? d.vehicle_demand : null,
      fac_fore: (isForecast || isTransition) ? d.facility_demand : null,
    };
  });

  const isAwaitingScanIn = selectedDoc && !selectedDoc.time_in;
  const isInVerification = selectedDoc?.status?.toLowerCase() === 'in verification' || ((selectedDoc?.current_step_is_adhoc || selectedDoc?.is_adhoc) && selectedDoc?.current_office !== gsoOfficeName);
  const isActionAltered = selectedDoc && (selectedDoc.status?.toLowerCase() === 'signed' || selectedDoc.status?.toLowerCase() === 'completed' || selectedDoc.status?.toLowerCase() === 'action required' || selectedDoc.time_out);

  // --- MASTER CHECKLIST HANDLERS ---
  useEffect(() => {
    if (showChecklistMakerModal) {
      const fetchTemplates = async () => {
        const typeMapping = { 'Vehicle': 'Vehicle', 'Multimedia Room': 'Room', 'Gymnasium': 'Gymnasium' };
        const targetType = typeMapping[activeChecklistTab] || activeChecklistTab;
        try {
          const res = await fetchWithAuth(`http://localhost:5000/api/procurement/templates/${targetType}`);
          if (res.ok) setMasterChecklistItems(await res.json());
        } catch (err) { console.error("Error fetching templates:", err); }
      };
      fetchTemplates();
    }
  }, [showChecklistMakerModal, activeChecklistTab]);

  const handleAddMasterChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistName.trim()) return;
    const typeMapping = { 'Vehicle': 'Vehicle', 'Multimedia Room': 'Room', 'Gymnasium': 'Gymnasium' };
    const targetType = typeMapping[activeChecklistTab] || activeChecklistTab;

    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/procurement/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingType: targetType, itemName: newChecklistName.trim() })
      });
      if (res.ok) {
        setNewChecklistName('');
        const updated = await fetchWithAuth(`http://localhost:5000/api/procurement/templates/${targetType}`);
        if (updated.ok) setMasterChecklistItems(await updated.json());
      }
    } catch (err) { console.error("Error adding template item:", err); }
  };

  const handleDeleteMasterChecklistItem = async (templateId) => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/procurement/templates/${templateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMasterChecklistItems(prev => prev.filter(item => item.template_id !== templateId));
      }
    } catch (err) { console.error("Error deleting template item:", err); }
  };

  // --- BOOKING CHECKLIST HANDLERS ---
  const handleViewChecklist = async (booking) => {
    setActiveChecklistBooking(booking);
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/procurement/checklists/${booking.booking_id}/${booking.booking_type}`);
      if (res.ok) {
        setActiveChecklistItems(await res.json());
        setShowActiveChecklistModal(true);
      }
    } catch (err) { console.error("Error fetching checklist:", err); }
  };

  const handleToggleChecklistItem = async (checkId, currentStatus) => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/procurement/checklists/${checkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !currentStatus, bookingId: activeChecklistBooking.booking_id })
      });
      if (res.ok) {
        setActiveChecklistItems(prev => prev.map(item => 
          item.check_id === checkId ? { ...item, is_checked: !currentStatus } : item
        ));
        fetchProcurementData();
      }
    } catch (err) { console.error("Error updating checklist:", err); }
  };

  // --- PDF EXPORT GENERATOR ---
  const handleGeneratePDF = () => {
    let dataToPrint = [];
    if (printTargetTab === 'Logistics History') {
      dataToPrint = logisticsList.filter(log => {
        const logDate = new Date(log.borrowed_at).toISOString().split('T')[0];
        const afterStart = printStartDate ? logDate >= printStartDate : true;
        const beforeEnd = printEndDate ? logDate <= printEndDate : true;
        return afterStart && beforeEnd;
      });
    } else {
      const typeMap = { 'Vehicle': 'Vehicle', 'Multimedia Room': 'Room', 'Gymnasium': 'Gymnasium' };
      dataToPrint = reservationsList.filter(res => {
        const isCorrectType = res.booking_type === typeMap[printTargetTab];
        const resDate = new Date(res.reservation_date).toISOString().split('T')[0];
        const afterStart = printStartDate ? resDate >= printStartDate : true;
        const beforeEnd = printEndDate ? resDate <= printEndDate : true;
        return isCorrectType && afterStart && beforeEnd;
      });
    }

    if (dataToPrint.length === 0) {
      return minimalSwal.fire({ icon: 'warning', title: 'No Records', text: 'No records found for the selected date range.' });
    }

    const printWindow = window.open('', '_blank');
    let tableHeaders = '';
    let tableRows = '';

    if (printTargetTab === 'Logistics History') {
      tableHeaders = `
        <tr>
          <th>Asset</th>
          <th>Requestor</th>
          <th>Qty</th>
          <th>Lending Time</th>
          <th>Return Time</th>
          <th>Condition / Notes</th>
        </tr>`;
      tableRows = dataToPrint.map(log => `
        <tr>
          <td><strong>${log.asset_name}</strong></td>
          <td>${log.requestor_name}</td>
          <td>${log.qty_borrowed}</td>
          <td>${log.borrowed_at ? new Date(log.borrowed_at).toLocaleString() : 'N/A'}</td>
          <td>${log.returned_at ? new Date(log.returned_at).toLocaleString() : 'Pending'}</td>
          <td>${log.status === 'Returned' ? (log.condition_on_return === 'Damaged' ? `<span style="color:red; font-weight:bold;">Damaged:</span> ${log.damage_notes || 'No notes'}` : 'Good Condition') : 'Out / Borrowed'}</td>
        </tr>`).join('');
    } else {
      tableHeaders = `
        <tr>
          <th>Requestor</th>
          <th>Purpose</th>
          <th>Target Date & Time</th>
          <th>System Request Made</th>
          <th>Confirmed At</th>
          <th>Status</th>
        </tr>`;
      tableRows = dataToPrint.map(res => `
        <tr>
          <td><strong>${res.requestor || res.requestor_name || 'N/A'}</strong></td>
          <td>${res.purpose}</td>
          <td>${new Date(res.reservation_date).toLocaleDateString()} <br> <small>${res.start_time?.substring(0,5)} - ${res.end_time?.substring(0,5)}</small></td>
          <td>${res.created_at ? new Date(res.created_at).toLocaleString() : 'N/A'}</td>
          <td>${res.updated_at ? new Date(res.updated_at).toLocaleString() : 'Pending'}</td>
          <td style="font-weight:bold; color: ${res.status === 'Confirmed' ? 'green' : '#d97706'}">${res.status}</td>
        </tr>`).join('');
    }

    const htmlContent = `
      <html>
        <head>
          <title>Exported Logs - ${printTargetTab}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #991b1b; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #991b1b; font-size: 24px; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 12px; }
            table { border-collapse: collapse; margin-top: 10px; font-size: 12px; width: 100%; }
            th { background-color: #f87171; color: white; text-align: left; padding: 10px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            td { padding: 10px; border-bottom: 1px solid #e5e5e5; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BSU GSO Procurement Logs</h1>
            <p><strong>Category:</strong> ${printTargetTab}</p>
            <p><strong>Date Filter:</strong> ${printStartDate || 'Beginning of records'} to ${printEndDate || 'Present'}</p>
            <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>${tableHeaders}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  // --- GENERAL EVENT HANDLERS ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleOpenDetails = (doc, fromHistory = false) => {
    setSelectedDoc(doc);
    setIsHistoryDetails(fromHistory);
    setShowSendBackForm(false);
    setShowAdHocForm(false);
    setReturnReason('');
    setSelectedAdHocOffice('');
    setShowDetailsModal(true);
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const localizedString = String(timestamp).replace(/(\+00:00|\+00|Z)$/i, '');
    const now = new Date();
    const past = new Date(localizedString);
    const elapsed = now - past;
    if (elapsed < 60000) return 'Just now';
    else if (elapsed < 3600000) return `${Math.round(elapsed / 60000)} minutes ago`;   
    else if (elapsed < 86400000) return `${Math.round(elapsed / 3600000)} hours ago`;   
    else return `${Math.round(elapsed / 86400000)} days ago`;   
  };

  // --- AUDIT REPORT GENERATOR ---
const handleGenerateAuditReport = () => {
  const printWindow = window.open('', '_blank');
  
  // Filter peak demand data based on selected start and end dates
  const filteredDemand = (peakDemandData || []).filter(d => {
    const dDate = d.date;
    return (!auditStartDate || dDate >= auditStartDate) && (!auditEndDate || dDate <= auditEndDate);
  });

  const htmlContent = `
    <html>
      <head>
        <title>Full Operational Audit Report</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
          .report-header { border-bottom: 2px solid #991b1b; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 40px; }
          h2 { color: #991b1b; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f9fafb; padding: 10px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>BSU GSO Operational Audit</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Range: ${auditStartDate || 'Start'} to ${auditEndDate || 'Present'}</p>
        </div>

        <div class="section">
          <h2>1. Bottleneck Analytics</h2>
          <table>
            <thead><tr><th>Office Name</th><th>Dwell Time (Hours)</th></tr></thead>
            <tbody>
              ${(bottleneckData || []).map(b => `<tr><td>${b.office_name}</td><td>${Number(b.dwell_time_hours || 0).toFixed(2)}h</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>2. Equipment Inventory Status</h2>
          <table>
            <thead><tr><th>Asset</th><th>Total</th><th>Available</th></tr></thead>
            <tbody>
              ${(equipmentInventory || []).map(i => `<tr><td>${i.asset_name}</td><td>${i.capacity}</td><td>${i.current_stock}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>3. Demand Forecast Data</h2>
          <table>
            <thead><tr><th>Date</th><th>Vehicle Demand</th><th>Facility Demand</th></tr></thead>
            <tbody>
              ${filteredDemand.map(d => `<tr><td>${d.date}</td><td>${d.vehicle_demand || 0}</td><td>${d.facility_demand || 0}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

  return (
    <div className="flex h-screen w-screen bg-[#FAF8F5] text-neutral-800 font-sans overflow-hidden">

      <PWAInstallBanner />

      {/* SIDEBAR */}
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
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">GSO Office</span>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <button onClick={() => { setActiveTab('dashboard'); setSearch(''); setFilterStatus('All'); setDashboardPage(1); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <LayoutDashboard size={18} /> GSO Dashboard
            </button>
            <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'resources' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <Archive size={18} /> School Resources
            </button>
            <button onClick={() => setActiveTab('procurement')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'procurement' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <ShoppingCart size={18} /> Procurement
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'analytics' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <BarChart3 size={18} /> Operational Analytics
            </button>
            <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'history' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <History size={18} /> History
            </button>
            <button onClick={() => { setActiveTab('messages'); setHasUnreadChats(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-bold transition-colors ${activeTab === 'messages' ? 'bg-[#3b2a29] text-white border-l-4 border-red-700' : 'text-neutral-400 hover:bg-[#3b2a29] hover:text-white'}`}>
              <div className="flex items-center gap-3"><MessageSquare size={18} /> Chat Inbox</div>
              {hasUnreadChats && <span className="w-2 h-2 bg-red-600 rounded-full mr-1 animate-pulse"></span>}
            </button>
          </nav>
        </div>
        <div className="border-t border-neutral-700 pt-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-red-400 font-semibold transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white px-8 flex items-center justify-end shadow-sm flex-shrink-0 relative">
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
                      <div key={n.id} className="p-4 text-xs border-b last:border-b-0 hover:bg-neutral-50/50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-bold text-neutral-900">{n.title}</p>
                            <span className="text-[8px] bg-red-50 text-red-800 border px-1 rounded uppercase font-black tracking-tight mt-0.5 inline-block">{n.roleSource || 'System'}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">{formatRelativeTime(n.time)}</span>
                        </div>
                        <p className="text-neutral-500 mt-1.5 font-medium leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && <div className="p-6 text-center text-neutral-400 font-bold text-xs">📭 No active system notifications.</div>}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setActiveTab('profile')} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors border">
              <User size={16} />
              <span className="text-xs font-bold text-neutral-800">GSO Admin Portal</span>
            </button>
          </div>
        </header>

        {/* MAIN WORKSPACE TABS */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <GSODashboardTab
              userName={userName}
              gsoOfficeName={gsoOfficeName}
              pipelineDocs={pipelineDocs}
              expectedIncomingCount={expectedIncomingCount}
              pendingDocsList={pendingDocsList}
              archivedDocsList={archivedDocsList}
              completedDocsList={completedDocsList}
              reservationsList={reservationsList}
              equipmentInventory={equipmentInventory}
              search={search} setSearch={setSearch}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              dashboardPage={dashboardPage} setDashboardPage={setDashboardPage}
              filteredMasterDocs={filteredMasterDocs} currentDashDocs={currentDashDocs} totalDashPages={totalDashPages}
              handleOpenDetails={handleOpenDetails} setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'resources' && (
            <GSOResourcesTab
              assetsList={assetsList}
              equipmentInventory={equipmentInventory}
              assetBlackouts={assetBlackouts}
              setShowAddAssetModal={setShowAddAssetModal}
              handleOpenEditModal={() => {}}
              handleDeleteAsset={() => {}}
              setSelectedInventoryItem={setSelectedInventoryItem}
              setShowInventoryModal={setShowInventoryModal}
              setShowBlackoutModal={setShowBlackoutModal}
              activeCalendarTab={activeCalendarTab} setActiveCalendarTab={setActiveCalendarTab}
              currentCalendarDate={currentCalendarDate} setCurrentCalendarDate={setCurrentCalendarDate}
            />
          )}

          {activeTab === 'procurement' && (
            <GSOProcurementTab
              vehicleData={vehicleData} multimediaData={multimediaData} gymData={gymData} logData={logData}
              procSearch={procSearch} setProcSearch={setProcSearch}
              procFilter={procFilter} setProcFilter={setProcFilter}
              procPage={procPage} setProcPage={setProcPage}
              setShowPrintModal={setShowPrintModal}
              setShowChecklistMakerModal={setShowChecklistMakerModal}
              handleViewChecklist={handleViewChecklist}
            />
          )}

          {activeTab === 'analytics' && (
            <OperationalAnalyticsTab
              auditStartDate={auditStartDate} setAuditStartDate={setAuditStartDate}
              auditEndDate={auditEndDate} setAuditEndDate={setAuditEndDate}
              handleGenerateAuditReport={handleGenerateAuditReport}
              isAnalyticsLoading={isAnalyticsLoading}
              bottleneckSearch={bottleneckSearch} setBottleneckSearch={setBottleneckSearch}
              bottleneckSort={bottleneckSort} setBottleneckSort={setBottleneckSort}
              processedBottleneckData={processedBottleneckData}
              equipmentInventory={equipmentInventory}
              demandTimeFilter={demandTimeFilter} setDemandTimeFilter={setDemandTimeFilter}
              chartReadyDemandData={chartReadyDemandData} transitionDate={transitionDate}
              systemHealth={systemHealth} routePerf={routePerf}
            />
          )}

          {activeTab === 'history' && (
            <GSOHistoryTab
              historyFilter={historyFilter} setHistoryFilter={setHistoryFilter}
              search={search} setSearch={setSearch}
              historyPage={historyPage} setHistoryPage={setHistoryPage}
              currentHistoryPageRows={currentHistoryPageRows} totalHistoryTabPages={totalHistoryTabPages}
              filteredHistoryLogs={filteredHistoryLogs} handleOpenDetails={handleOpenDetails}
            />
          )}

          {activeTab === 'messages' && (
            <OfficeChatHub userId={userId} roleId={2} officeId={gsoOfficeId} />
          )}

          {activeTab === 'profile' && (
            <UserProfileTab
              profileName={profileName} setProfileName={setProfileName}
              profileEmail={profileEmail} setProfileEmail={setProfileEmail}
              facultyId={facultyId} officeName={gsoOfficeName}
              twoFaEnabled={twoFaEnabled} toggle2FA={() => {}}
              handleUpdateProfile={() => {}} setShowPassModal={setShowPassModal}
            />
          )}
        </div>

        {/* FLOATING QR SCANNER BUTTON */}
        <button 
          onClick={() => { setScanMode('time-in'); setShowScannerModal(true); }}
          className="absolute bottom-8 right-8 w-14 h-14 bg-red-800 hover:bg-red-900 text-white rounded-2xl shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-40"
        >
          <QrCode size={24} />
        </button>
      </div>

      {/* RENDER MODALS */}
      <QRScannerModal 
        showScannerModal={showScannerModal} setShowScannerModal={setShowScannerModal}
        scanMode={scanMode} setScanMode={setScanMode}
        simulatedQrInput={simulatedQrInput} setSimulatedQrPayload={setSimulatedQrPayload} executeSimulatedScanner={() => {}}
      />
      <AddAssetModal 
        showAddAssetModal={showAddAssetModal} setShowAddAssetModal={setShowAddAssetModal}
        handleAddAssetSubmit={() => {}} assetForm={assetForm} setAssetForm={setAssetForm}
      />
      <ChangePasswordModal 
        isOpen={showPassModal} onClose={() => setShowPassModal(false)}
        currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
        newPassword={newPassword} setNewPassword={setNewPassword}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} handleUpdatePassword={() => {}}
      />
      <DocumentAuditModal 
        showDetailsModal={showDetailsModal} setShowDetailsModal={setShowDetailsModal}
        selectedDoc={selectedDoc} isHistoryDetails={isHistoryDetails}
        isAwaitingScanIn={isAwaitingScanIn} isInVerification={isInVerification} isActionAltered={isActionAltered}
        showAdHocForm={showAdHocForm} setShowAdHocForm={setShowAdHocForm} showSendBackForm={showSendBackForm} setShowSendBackForm={setShowSendBackForm}
        selectedAdHocOffice={selectedAdHocOffice} setSelectedAdHocOffice={setSelectedAdHocOffice}
        officesList={officesList} gsoOfficeId={gsoOfficeId} isActionProcessing={isActionProcessing}
        returnReason={returnReason} setReturnReason={setReturnReason}
        handleExecuteAdHocDetour={() => {}} handleExecuteReturn={() => {}} handleSignDocument={() => {}}
        setScanMode={setScanMode} setShowScannerModal={setShowScannerModal} setSimulatedQrPayload={setSimulatedQrPayload}
      />
      <MasterChecklistModal
        showChecklistMakerModal={showChecklistMakerModal} setShowChecklistMakerModal={setShowChecklistMakerModal}
        activeChecklistTab={activeChecklistTab} setActiveChecklistTab={setActiveChecklistTab}
        masterChecklistItems={masterChecklistItems} 
        handleDeleteMasterChecklistItem={handleDeleteMasterChecklistItem} 
        handleAddMasterChecklistItem={handleAddMasterChecklistItem}
        newChecklistName={newChecklistName} setNewChecklistName={setNewChecklistName}
      />
      <EditAssetModal
        showEditAssetModal={showEditAssetModal} setShowEditAssetModal={setShowEditAssetModal}
        selectedEditAsset={selectedEditAsset} setSelectedEditAsset={setSelectedEditAsset} handleUpdateAsset={() => {}} assetSchedule={assetSchedule}
      />
      <ExportLogsModal
        showPrintModal={showPrintModal} setShowPrintModal={setShowPrintModal}
        printTargetTab={printTargetTab} setPrintTargetTab={setPrintTargetTab} 
        printStartDate={printStartDate} setPrintStartDate={setPrintStartDate} 
        printEndDate={printEndDate} setPrintEndDate={setPrintEndDate} 
        handleGeneratePDF={handleGeneratePDF}
      />
      <FacilityBlackoutModal
        showBlackoutModal={showBlackoutModal} setShowBlackoutModal={setShowBlackoutModal}
        handleApplyBlackout={() => {}} blackoutForm={blackoutForm} setBlackoutForm={setBlackoutForm} assetsList={assetsList} todayString={todayString}
      />
      <InventoryActionModal
        showInventoryModal={showInventoryModal} setShowInventoryModal={setShowInventoryModal}
        selectedInventoryItem={selectedInventoryItem} inventoryModalMode={inventoryModalMode} setInventoryModalMode={setInventoryModalMode} handleInventorySubmit={() => {}} inventoryForm={inventoryForm} setInventoryForm={setInventoryForm} todayString={todayString} isActionProcessing={isActionProcessing}
      />
      <BookingRequirementsModal
        showActiveChecklistModal={showActiveChecklistModal} setShowActiveChecklistModal={setShowActiveChecklistModal}
        activeChecklistBooking={activeChecklistBooking} activeChecklistItems={activeChecklistItems} 
        handleToggleChecklistItem={handleToggleChecklistItem}
      />
    </div>
  );
}