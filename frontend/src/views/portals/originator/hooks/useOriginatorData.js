import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; 
import { fetchWithAuth } from "../../../../api";

// Extracted minimalSwal configuration for 2FA toggles
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

export default function useOriginatorData() {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('user') || 'Faculty User';
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [edcPredictions, setEdcPredictions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const itemsPerPage = 5;

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const [profile, setProfile] = useState({
    fullName: userName,
    email: 'faculty@batstate-u.edu.ph',
    facultyId: '2024-FAC-1029',
    departmentName: 'CICS Department',
    accountType: 'Faculty User',
    twoFaEnabled: false,
    twoFaCode: ''
  });
  
  const [initialProfile, setInitialProfile] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [generatedQr, setGeneratedQr] = useState('');
  
  const [form, setForm] = useState({ title: '', processTypeId: '', confirmation: false });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [selectedRoutePreview, setSelectedRoutePreview] = useState([]);
  const [estimatedDate, setEstimatedDate] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [recentDocStops, setRecentDocStops] = useState([]);

  // -------------------------
  // INITIALIZATION & ROUTING
  // -------------------------
  useEffect(() => {
    if (!userId || userId === 'undefined') {
      localStorage.clear();
      navigate('/login');
      return;
    }
    fetchDashboardLedger();
    fetchWorkflowTemplates();
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (documents.length > 0 && processTypes.length > 0) {
      const activeDoc = documents[0];
      const match = processTypes.find(p => p.process_name === activeDoc.process_name);
      if (match) {
        const stops = [];
        const departmentToOfficeMap = {
          'College of Informatics and Computing Sciences': 'CICS Office',
          'College of Accountancy, Business, Economics and International Hospitality Management': 'CABEIHM Office',
          'College of Arts and Sciences': 'CAS Office',
          'College of Industrial Technology': 'CE / CIT Office',
          'College of Engineering': 'CE / CIT Office',
          'College of Teacher Education': 'CTE Office'
        };

        for (let i = 1; i <= 7; i++) {
          let stopName = match[`stop_${i}_name`];
          if (stopName === 'ORIGINATING_COLLEGE_DYNAMIC') {
            stopName = departmentToOfficeMap[profile.departmentName] || activeDoc.current_office || 'Origin Unit';
          }
          if (stopName) stops.push(stopName);
        }
        setRecentDocStops(stops);
      } else {
        setRecentDocStops([activeDoc.current_office || 'Origin Unit', activeDoc.next_office || 'Next Stop'].filter(Boolean));
      }
    }
  }, [documents, processTypes, profile.departmentName]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchEDC = async () => {
      try {
        const res = await fetchWithAuth('http://localhost:5000/api/analytics/edc');
        if (res.ok) {
          const data = await res.json();
          setEdcPredictions(data);
        }
      } catch (err) { console.error("Error fetching EDC data:", err); }
    };
    fetchEDC();
  }, []);

  useEffect(() => {
    fetchLiveNotificationFeeds();
    const alertInterval = setInterval(fetchLiveNotificationFeeds, 10000);

    const checkChatBadgeStatus = async () => {
      try {
        const res = await fetchWithAuth('http://localhost:5000/api/chat/active-documents-directory');
        const data = await res.json();
        if (res.ok) {
          const hasAnyActiveOngoingChat = data.some(d => d.hasAnyChat === true);
          setHasUnreadChats(hasAnyActiveOngoingChat);
        }
      } catch (err) { console.error(err); }
    };
    checkChatBadgeStatus();
    const chatBadgeInterval = setInterval(checkChatBadgeStatus, 15000);

    return () => {
      clearInterval(alertInterval);
      clearInterval(chatBadgeInterval);
    };
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    const pendingRedirectId = localStorage.getItem('redirect_target_doc_id');
    if (pendingRedirectId && activeTab !== 'messages') {
      setActiveTab('messages');
    }
  }, [activeTab]);

  // -------------------------
  // API FETCHERS
  // -------------------------
  const fetchLiveNotificationFeeds = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/notifications/${userId}/1/0`);
      const data = await res.json();
      if (res.ok) {
        const alertCollection = data.map(n => ({
          id: n.id,
          ini_id: n.ini_id,
          title: n.title,
          message: n.message,
          time: n.time
        }));
        setNotifications(alertCollection);
      }
    } catch (err) { console.error("Error retrieving notifications:", err); }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`);
      const data = await res.json();
      if (res.ok && data) {
        const loadedProfile = {
          fullName: data.full_name || userName,
          email: data.uni_email || 'faculty@batstate-u.edu.ph',
          facultyId: data.faculty_id || '2024-FAC-1029',
          departmentName: data.department_name || 'CICS Department',
          accountType: data.account_type || 'Faculty User',
          twoFaEnabled: !!data.two_fa_enabled,
          twoFaCode: data.two_fa_code || ''
        };
        setProfile(loadedProfile);
        setInitialProfile(loadedProfile);
      } else {
        setInitialProfile({ ...profile });
      }
    } catch (err) { 
      console.error("Profile load err:", err); 
      setInitialProfile({ ...profile });
    }
  };

  const fetchDashboardLedger = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/documents/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data);
        if (data.length > 0) {
          setNotifications([{ id: 1, title: "Pipeline Active", message: `Tracking is now active for your submission: "${data[0].title}".`, time: "Just now", unread: true }]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchWorkflowTemplates = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/process-types');
      const data = await res.json();
      if (res.ok) setProcessTypes(data);
    } catch (err) { console.error(err); }
  };

  // -------------------------
  // EVENT HANDLERS
  // -------------------------
  const handleNotificationClick = (notif) => {
    setShowNotifications(false);
    if (!notif.ini_id) return;
    localStorage.setItem('redirect_target_doc_id', String(notif.ini_id));
    setActiveTab('documents');
  };

  const saveProfileChanges = async (e) => {
    if (e) e.preventDefault();
    setStatusMsg('');

    if (!profile.fullName.trim() || !profile.email.trim()) {
      return alert("Validation Error: Personal Information fields cannot be left empty.");
    }
    
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setStatusMsg("✅ Profile modifications saved instantly!");
        localStorage.setItem('user', profile.fullName);
        setInitialProfile(profile);
      }
    } catch (err) { alert("Failed sync configuration parameters."); }
  };

  const updatePasswordRequest = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmNew) return alert("New passwords mismatched.");
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("✅ Password record securely altered!");
      setShowPassModal(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) { alert(err.message); }
  };

  const handleProcessChange = (pId) => {
    const selected = processTypes.find(p => p.p_id === parseInt(pId));
    if (selected) {
      const stops = [];
      for (let i = 1; i <= 7; i++) if (selected[`stop_${i}_name`]) stops.push(selected[`stop_${i}_name`]);
      setSelectedRoutePreview(stops);
      setForm({ ...form, processTypeId: pId });
      
      const prediction = edcPredictions.find(e => e.process_id === parseInt(pId));
      if (prediction) {
        const hours = prediction.estimated_hours_to_complete;
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + hours);
        setEstimatedDate(futureDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      } else {
        setEstimatedDate("Estimation pending...");
      }
    } else {
      setSelectedRoutePreview([]);
      setForm({ ...form, processTypeId: '' });
      setEstimatedDate('');
    }
  };

  const submitDocument = async (e) => {
    e.preventDefault();
    let edcPayload = null;
    if (estimatedDate && estimatedDate !== "Estimation pending...") {
      const d = new Date(estimatedDate);
      edcPayload = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: parseInt(userId), 
          title: form.title, 
          processTypeId: parseInt(form.processTypeId), 
          edc: edcPayload
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      
      setGeneratedQr(data.qrCode);
      setShowModal(false);
      setShowQrModal(true);
      setForm({ title: '', processTypeId: '', confirmation: false });
      setSelectedRoutePreview([]);
      setEstimatedDate('');
      fetchDashboardLedger();
    } catch (err) { 
      console.error("Frontend Submit Error:", err); 
      alert("Submission failed: " + err.message);
    }
  };

  const toggleTwoFactorAuth = async (checked) => {
    if (!checked) {
      try {
        const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fullName: profile.fullName, 
            email: profile.email, 
            twoFaEnabled: false,
            twoFaCode: null 
          })
        });
        if (res.ok) {
          setProfile({...profile, twoFaEnabled: false});
          minimalSwal.fire({ icon: 'success', title: 'Disabled', text: 'Two-Factor Authentication is now off.' });
        }
      } catch (err) {
        minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to update security settings.' });
      }
      return;
    }
    
    minimalSwal.fire({
      title: 'Sending Code...',
      text: 'Please wait while we dispatch your verification email.',
      allowOutsideClick: false,
      didOpen: () => { minimalSwal.showLoading(); }
    });

    try {
      const requestRes = await fetchWithAuth(`http://localhost:5000/api/users/${userId}/request-profile-otp`, { method: 'POST' });
      if (!requestRes.ok) throw new Error('Failed to dispatch email.');
      minimalSwal.close();

      const { value: otpCode } = await minimalSwal.fire({
        title: 'Verify Your Email',
        text: `We sent a 6-digit code to ${profile.email}.`,
        input: 'text',
        inputAttributes: { maxLength: 6, style: 'text-align: center; letter-spacing: 0.5em; font-weight: bold;' },
        showCancelButton: true,
        confirmButtonText: 'Verify & Enable',
        cancelButtonText: 'Cancel'
      });

      if (otpCode) {
        const verifyRes = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}/verify-enable-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpCode })
        });

        if (verifyRes.ok) {
          setProfile({...profile, twoFaEnabled: true});
          minimalSwal.fire({ icon: 'success', title: 'Secured!', text: 'Email Two-Factor Authentication is now active.' });
        } else {
          minimalSwal.fire({ icon: 'error', title: 'Invalid Code', text: 'The verification code was incorrect.' });
          setProfile({...profile, twoFaEnabled: false});
        }
      } else {
        setProfile({...profile, twoFaEnabled: false});
      }
    } catch (err) {
      minimalSwal.close();
      minimalSwal.fire({ icon: 'error', title: 'Error', text: 'Failed to communicate with authentication server.' });
      setProfile({...profile, twoFaEnabled: false});
    }
  };

  // -------------------------
  // CALCULATED VARIABLES
  // -------------------------
  const filteredDocuments = documents.filter(doc => {
    return doc.title.toLowerCase().includes(search.toLowerCase()) && (filterStatus === 'All' || doc.status?.toLowerCase() === filterStatus.toLowerCase());
  });

  const indexOfLastDoc = currentPage * itemsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - itemsPerPage;
  const currentLedgerDocs = filteredDocuments.slice(indexOfFirstDoc, indexOfLastDoc);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const pendingCount = documents.filter(d => d.status?.toLowerCase() === 'pending' || d.status?.toLowerCase() === 'in verification').length;
  const mostRecentDoc = documents[0];

  const isProfileChanged = initialProfile 
    ? (JSON.stringify(profile) !== JSON.stringify(initialProfile) && profile.fullName.trim() !== '' && profile.email.trim() !== '')
    : false;

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const localizedString = String(timestamp).replace(/(\+00:00|\+00|Z)$/i, '');
    const now = new Date();
    const past = new Date(localizedString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = now - past;
    
    if (elapsed < msPerMinute) {
       return 'Just now';
    } else if (elapsed < msPerHour) {
       const minutes = Math.round(elapsed / msPerMinute);
       return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;   
    } else if (elapsed < msPerDay) {
       const hours = Math.round(elapsed / msPerHour);
       return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;   
    } else {
       const days = Math.round(elapsed / msPerDay);
       return `${days} ${days === 1 ? 'day' : 'days'} ago`;   
    }
  };

  return {
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
  };
}