import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../api";

// Reusable SweetAlert instance with your custom styling
export const minimalSwal = Swal.mixin({
  customClass: {
    confirmButton: 'px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-800 hover:bg-red-900 shadow-md mx-2',
    cancelButton: 'px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 mx-2',
    popup: 'rounded-3xl border border-neutral-100 shadow-2xl',
    title: 'text-lg font-black text-neutral-900',
    htmlContainer: 'text-sm font-medium text-neutral-500'
  },
  buttonsStyling: false
});

export function useSigneeData() {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('user') || 'Office Signee';
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Data State
  const [pipelineDocs, setPipelineDocs] = useState([]);  
  const [processTypes, setProcessTypes] = useState([]);
  const [officesList, setOfficesList] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [isHistoryDetails, setIsHistoryDetails] = useState(false);
  
  // Profile State
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [facultyId, setFacultyId] = useState('N/A');
  const [departmentName, setDepartmentName] = useState('N/A');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [signeeOfficeName, setSigneeOfficeName] = useState('Loading Office...');
  const [signeeOfficeId, setSigneeOfficeId] = useState(null);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Modal & Action State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [showSendBackForm, setShowSendBackForm] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedAdHocOffice, setSelectedAdHocOffice] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Search, Filter & Pagination State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [historyFilter, setHistoryFilter] = useState('All');
  const [dashboardPage, setDashboardPage] = useState(1);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;

  // Initialization Effect
  useEffect(() => {
    if (!userId || userId === 'undefined') {
      localStorage.clear();
      navigate('/login');
      return;
    }
    fetchSigneeMeta();
    fetchWorkflowTemplates();
    fetchOfficesList();
  }, [userId]);

  // Click Outside Notification Effect
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // API Fetch Functions
  const fetchLiveNotificationFeeds = async () => {
    if (!signeeOfficeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/notifications/${userId}/3/${signeeOfficeId}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        })));
      }
    } catch (err) { console.error(err); }
  };

  const fetchSigneeMeta = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setSigneeOfficeName(data.office_name || 'CICS Office');
        setSigneeOfficeId(data.o_id);
        setProfileName(data.full_name || '');
        setProfileEmail(data.uni_email || '');
        setFacultyId(data.faculty_id || 'NOT ASSIGNED');
        setDepartmentName(data.department_name || 'CICS');
        setTwoFaEnabled(data.two_fa_enabled || false);
        setTwoFaCode(data.two_fa_code || '');

        fetchPipelineDocs(data.o_id);
        fetchOfficeActionHistory(data.o_id);
      }
    } catch (err) { console.error("Error connecting metadata:", err); }
  };

  const fetchPipelineDocs = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/processor/documents/pipeline/${officeId}`);
      const data = await res.json();
      if (res.ok) {
        setPipelineDocs(data);
        const pendingCount = data.filter(d => d.status?.toLowerCase() === 'pending' && !d.time_out).length;
        if (pendingCount > 0) {
          const firstPending = data.find(d => d.status?.toLowerCase() === 'pending' && !d.time_out);
          setNotifications([{ 
            id: 1, 
            title: "Action Required", 
            message: `You have ${pendingCount} incoming files waiting for signature approval.`, 
            time: firstPending ? firstPending.time_in : new Date().toISOString()
          }]);
        }
      }
    } catch (err) { console.error("Pipeline sync error:", err); }
  };

  const fetchOfficeActionHistory = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/processor/history/${officeId}`);
      const data = await res.json();
      if (res.ok) setActionHistory(data);
    } catch (err) { console.error("History transaction log retrieval error:", err); }
  };

  const fetchWorkflowTemplates = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/process-types');
      const data = await res.json();
      if (res.ok) setProcessTypes(data);
    } catch (err) { console.error(err); }
  };

  const fetchOfficesList = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/offices'); 
      const data = await res.json();
      if (res.ok) setOfficesList(data);
    } catch (err) { console.error("Error building office lookup:", err); }
  };

  // Action Handlers
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: profileName, email: profileEmail, twoFaEnabled, twoFaCode: twoFaCode || null })
      });
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Profile Updated', text: 'Profile settings updated.' });
        localStorage.setItem('user', profileName);
        fetchSigneeMeta();
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to synchronize profile changes.' }); 
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return minimalSwal.fire({ icon: 'warning', title: 'Mismatch', text: 'New passwords do not match.' });
    }
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Password Updated', text: 'Security credentials updated cleanly.' });
        setShowPassModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        minimalSwal.fire({ icon: 'error', title: 'Error', text: data.error || 'Password update rejected.' });
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to modify database records.' }); 
    }
  };

  const toggle2FA = async (checked) => {
    if (!checked) {
      try {
        const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: profileName, email: profileEmail, twoFaEnabled: false })
        });
        if (res.ok) {
          setTwoFaEnabled(false);
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

      const requestRes = await fetchWithAuth(`http://localhost:5000/api/users/${userId}/request-profile-otp`, { method: 'POST' });
      if (!requestRes.ok) throw new Error('Failed to dispatch email.');

      const { value: otpCode } = await minimalSwal.fire({
        title: 'Verify Your Email',
        text: `We sent a 6-digit code to ${profileEmail}.`,
        input: 'text',
        inputAttributes: { maxLength: 6, style: 'text-align: center; letter-spacing: 0.5em; font-weight: bold;' },
        showCancelButton: true,
        confirmButtonText: 'Verify & Enable'
      });

      if (otpCode) {
        const verifyRes = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/verify-enable-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpCode })
        });
        if (verifyRes.ok) {
          setTwoFaEnabled(true);
          minimalSwal.fire({ icon: 'success', title: 'Secured!', text: 'Email Two-Factor Authentication is now active.' });
        } else {
          minimalSwal.fire({ icon: 'error', title: 'Invalid Code', text: 'The verification code was incorrect.' });
          setTwoFaEnabled(false); 
        }
      } else {
        setTwoFaEnabled(false);
      }
    } catch (err) {
      minimalSwal.fire({ icon: 'error', title: 'Network Error', text: 'Failed to communicate with authentication server.' });
      setTwoFaEnabled(false);
    }
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

  const handleSignDocument = async () => {
    if (!selectedDoc) return;
    minimalSwal.fire({
      title: 'Confirm Signature',
      text: `This will certify "${selectedDoc.title || selectedDoc.document_title}" and advance it to the next office stage.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Sign Document',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsActionProcessing(true);
        try {
          const res = await fetchWithAuth(`http://localhost:5000/api/signee/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ iniId: selectedDoc.ini_id, currentOfficeId: signeeOfficeId, signeeUserId: parseInt(userId) })
          });
          if (res.ok) {
            minimalSwal.fire({ icon: 'success', title: 'Successfully Signed!', text: 'The document identity seal has been committed. Processors can now check it out.' });
            setShowDetailsModal(false);
            fetchSigneeMeta();
          }
        } catch (err) {
          minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed sequence commitment tracking link.' });
        } finally {
          setIsActionProcessing(false);
        }
      }
    });
  };

  const handleExecuteReturn = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) return;
    setIsActionProcessing(true);
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/signee/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniId: selectedDoc.ini_id, currentOfficeId: signeeOfficeId, signeeUserId: parseInt(userId), reason: returnReason })
      });
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Document Sent Back', text: 'The file has been frozen with Action Required status flags.' });
        setShowDetailsModal(false);
        fetchSigneeMeta();
      }
    } catch (err) {
      minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to commit document updates.' });
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleExecuteAdHocDetour = async (e) => {
    e.preventDefault();
    if (!selectedAdHocOffice) {
      return minimalSwal.fire({ icon: 'warning', title: 'Required', text: 'Please select a destination campus unit.' });
    }
    setIsActionProcessing(true);
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/processor/documents/ad-hoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniId: selectedDoc.ini_id, targetOfficeId: parseInt(selectedAdHocOffice), currentOfficeId: signeeOfficeId, executorUserId: parseInt(userId) })
      });
      if (res.ok) {
        minimalSwal.fire({ icon: 'success', title: 'Detour Routed', text: 'Ad-hoc validation checkpoint successfully injected.' });
        setShowDetailsModal(false);
        fetchSigneeMeta();
      }
    } catch (err) { 
      minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Ad-hoc communication assignment breakdown.' }); 
    } finally { 
      setIsActionProcessing(false); 
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const localizedString = String(timestamp).replace(/(\+00:00|\+00|Z)$/i, '');
    const now = new Date();
    const past = new Date(localizedString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = now - past;
    
    if (elapsed < msPerMinute) return 'Just now';
    else if (elapsed < msPerHour) return `${Math.round(elapsed / msPerMinute)} minutes ago`;   
    else if (elapsed < msPerDay) return `${Math.round(elapsed / msPerHour)} hours ago`;   
    else return `${Math.round(elapsed / msPerDay)} days ago`;   
  };

  // Derived / Filtered Data
  const pendingDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'pending' && !d.time_out);
  const signedDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'signed' || d.status?.toLowerCase() === 'completed');
  const verificationDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'in verification' || ((d.current_step_is_adhoc || d.is_adhoc) && d.current_office !== signeeOfficeName));
  const sentBackDocsList = pipelineDocs.filter(d => d.status?.toLowerCase() === 'action required');

  const filteredDashDocs = pendingDocsList.filter(doc => doc.title?.toLowerCase().includes(search.toLowerCase()) || doc.qr_code?.toLowerCase().includes(search.toLowerCase()));
  const filteredPipelineDocs = pipelineDocs.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(search.toLowerCase()) || doc.qr_code?.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'Pending') return matchesSearch && doc.status?.toLowerCase() === 'pending' && !doc.time_out;
    if (filterStatus === 'Signed') return matchesSearch && (doc.status?.toLowerCase() === 'signed' || doc.status?.toLowerCase() === 'completed');
    if (filterStatus === 'In Verification') return matchesSearch && (doc.status?.toLowerCase() === 'in verification' || ((doc.current_step_is_adhoc || doc.is_adhoc) && doc.current_office !== signeeOfficeName));    
    if (filterStatus === 'Action Required') return matchesSearch && doc.status?.toLowerCase() === 'action required';
    return matchesSearch;
  });
  const filteredHistoryLogs = actionHistory.filter(log => {
    const matchesSearch = log.title?.toLowerCase().includes(search.toLowerCase()) || log.full_name?.toLowerCase().includes(search.toLowerCase()) || log.qr_code?.toLowerCase().includes(search.toLowerCase());
    return historyFilter !== 'All' ? (matchesSearch && log.action_type === historyFilter) : matchesSearch;
  });

  const currentDashDocs = filteredDashDocs.slice((dashboardPage - 1) * itemsPerPage, dashboardPage * itemsPerPage);
  const totalDashPages = Math.ceil(filteredDashDocs.length / itemsPerPage);
  const currentPipeDocs = filteredPipelineDocs.slice((pipelinePage - 1) * itemsPerPage, pipelinePage * itemsPerPage);
  const totalPipePages = Math.ceil(filteredPipelineDocs.length / itemsPerPage);
  const currentHistoryPageRows = filteredHistoryLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const totalHistoryTabPages = Math.ceil(filteredHistoryLogs.length / itemsPerPage);

  const isInVerification = selectedDoc?.status?.toLowerCase() === 'in verification' || ((selectedDoc?.current_step_is_adhoc || selectedDoc?.is_adhoc) && selectedDoc?.current_office !== signeeOfficeName);
  const isAwaitingScanIn = selectedDoc && !selectedDoc.time_in;
  const isActionAltered = selectedDoc && (selectedDoc.status?.toLowerCase() === 'signed' || selectedDoc.status?.toLowerCase() === 'completed' || selectedDoc.status?.toLowerCase() === 'action required');

  return {
    userName, activeTab, setActiveTab, showNotifications, setShowNotifications, notifications,
    notificationRef, handleLogout, profileName, setProfileName, profileEmail, setProfileEmail,
    facultyId, signeeOfficeName, signeeOfficeId, twoFaEnabled, toggle2FA, handleUpdateProfile,
    currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    handleUpdatePassword, showPassModal, setShowPassModal, search, setSearch, filterStatus, setFilterStatus,
    historyFilter, setHistoryFilter, dashboardPage, setDashboardPage, pipelinePage, setPipelinePage,
    historyPage, setHistoryPage, currentDashDocs, totalDashPages, currentPipeDocs, totalPipePages,
    currentHistoryPageRows, totalHistoryTabPages, pendingDocsList, signedDocsList, verificationDocsList,
    sentBackDocsList, filteredDashDocs, filteredPipelineDocs, filteredHistoryLogs, handleOpenDetails,
    selectedDoc, showDetailsModal, setShowDetailsModal, showAdHocForm, setShowAdHocForm, showSendBackForm,
    setShowSendBackForm, returnReason, setReturnReason, selectedAdHocOffice, setSelectedAdHocOffice,
    isActionProcessing, handleSignDocument, handleExecuteReturn, handleExecuteAdHocDetour, officesList,
    isHistoryDetails, isInVerification, isAwaitingScanIn, isActionAltered, formatRelativeTime
  };
}