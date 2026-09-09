import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../../api';

export function useProcessorData(userId) {
  // --- USER & OFFICE STATE ---
  const [processorOfficeName, setProcessorOfficeName] = useState('Loading Office...');
  const [processorOfficeId, setProcessorOfficeId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [facultyId, setFacultyId] = useState('N/A');
  const [departmentName, setDepartmentName] = useState('N/A');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [officesList, setOfficesList] = useState([]);

  // --- KPI COUNTER STATE ---
  const [expectedIncomingCount, setExpectedIncomingCount] = useState(0);
  const [awaitingScanInCount, setAwaitingScanInCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [inVerificationCount, setInVerificationCount] = useState(0);
  const [completedProcessingCount, setCompletedProcessingCount] = useState(0);

  // --- DOCUMENT DATA STATE ---
  const [pipelineDocs, setPipelineDocs] = useState([]);  
  const [expectedIncomingList, setExpectedIncomingList] = useState([]);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isIncomingLoading, setIsIncomingLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
   
  // --- NOTIFICATIONS & CHAT ---
  const [notifications, setNotifications] = useState([]);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  // --- FILTERS & PAGINATION STATE ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [historyFilter, setHistoryFilter] = useState('All');
  const [dashboardPage, setDashboardPage] = useState(1);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 7; // 7 rows per page

  // --- API FETCHING FUNCTIONS ---
  const fetchLiveNotifications = async (officeId) => {
    if (!userId || !officeId) return;
    try {
      const res = await fetchWithAuth(`/api/notifications/${userId}/2/${officeId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Processor notification fetch error:", err);
    }
  };

  const fetchKpis = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/documents/kpi-metrics/${officeId}`);
      if (res.ok) {
        const kpiData = await res.json();
        setExpectedIncomingCount(kpiData.incomingCount || 0);
        setAwaitingScanInCount(kpiData.awaitingScanInCount || 0);
        setPendingCount(kpiData.pendingCount || 0);
        setInVerificationCount(kpiData.inVerificationCount || 0);
        setCompletedProcessingCount(kpiData.completedProcessingCount || 0);
      }
    } catch (err) {
      console.error("Failed fetching processor KPI metrics", err);
    }
  };

  const fetchExpectedIncomingList = async (officeId) => {
    const targetOffice = officeId || processorOfficeId;
    if (!targetOffice) return;
    setIsIncomingLoading(true);
    try {
      const res = await fetchWithAuth(`/api/processor/documents/expected-list/${targetOffice}`);
      const data = await res.json();
      if (res.ok) setExpectedIncomingList(data);
    } catch (err) {
      console.error("Failed fetching expected incoming list:", err);
    } finally {
      setIsIncomingLoading(false);
    }
  };

  const fetchPipelineDocs = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/documents/pipeline/${officeId}`);
      const data = await res.json();
      if (res.ok) setPipelineDocs(data);
    } catch (err) { 
      console.error("Pipeline sync error:", err); 
    }
  };

  const fetchOfficeActionHistory = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/history/${officeId}`);
      const data = await res.json();
      if (res.ok) setActionHistory(data);
    } catch (err) { 
      console.error("History transaction log retrieval error:", err); 
    }
  };

  const fetchProcessorMeta = async () => {
    try {
      const res = await fetchWithAuth(`/api/profile/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setProcessorOfficeName(data.office_name || 'HRMO');
        setProcessorOfficeId(data.o_id);

        setProfileName(data.full_name || '');
        setProfileEmail(data.uni_email || '');
        setFacultyId(data.faculty_id || 'NOT ASSIGNED');
        setDepartmentName(data.department_name || 'Administration');
        setTwoFaEnabled(data.two_fa_enabled || false);
        setTwoFaCode(data.two_fa_code || '');

        fetchKpis(data.o_id);
        fetchPipelineDocs(data.o_id);
        fetchOfficeActionHistory(data.o_id);
        fetchLiveNotifications(data.o_id);
        fetchExpectedIncomingList(data.o_id);
      }
    } catch (err) { 
      console.error("Error connecting metadata:", err); 
    }
  };

  const fetchWorkflowTemplates = async () => {
    try {
      const res = await fetchWithAuth('/api/process-types');
      const data = await res.json();
      if (res.ok) setProcessTypes(data);
    } catch (err) { console.error(err); }
  };

  const fetchOfficesList = async () => {
    try {
      const res = await fetchWithAuth('/api/offices'); 
      const data = await res.json();
      if (res.ok) setOfficesList(data);
    } catch (err) { console.error("Error building office lookup:", err); }
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    fetchProcessorMeta();
    fetchWorkflowTemplates();
  }, [userId]);

  // Periodic alert and chat polling
  useEffect(() => {
    if (!userId || userId === 'undefined' || !processorOfficeId) return;

    const notifInterval = setInterval(() => {
      fetchLiveNotifications(processorOfficeId);
    }, 10000);

    const checkChatBadgeStatus = async () => {
      try {
        const res = await fetchWithAuth('/api/chat/active-documents-directory');
        const data = await res.json();
        if (res.ok) setHasUnreadChats(data.some(d => d.hasAnyChat === true));
      } catch (err) { console.error(err); }
    };

    checkChatBadgeStatus();
    const chatInterval = setInterval(checkChatBadgeStatus, 15000);

    return () => {
      clearInterval(notifInterval);
      clearInterval(chatInterval);
    };
  }, [userId, processorOfficeId]);

  // --- UNIFIED OFFICE STATUS FILTERING ---
  // Evaluates status relative to THIS office (matching KPI definitions)
  const resolveOfficeStatus = (doc) => {
    if (doc.pdoc_office_time_out || doc.time_out) return 'Completed';
    if (doc.status?.toLowerCase() === 'in verification' || doc.current_step_is_adhoc) return 'In Verification';
    if (!doc.time_in && !doc.pdoc_office_time_in) return 'Awaiting Scan-In';
    return 'Pending';
  };

  // --- FILTER DOCS LIST ---
  const filterDocsList = (docs) => docs.filter(doc => {
    const q = search.toLowerCase();
    const matchesSearch = (doc.title && doc.title.toLowerCase().includes(q)) || 
                          (doc.qr_code && doc.qr_code.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (filterStatus === 'All') return true;

    const hasTimeIn = Boolean(doc.time_in || doc.pdoc_office_time_in);
    const hasTimeOut = Boolean(doc.time_out || doc.pdoc_office_time_out);
    const isVerification = doc.status?.toLowerCase() === 'in verification' || doc.current_step_is_adhoc;

    // 1. Awaiting Scan-In: At this office, but no Time-In yet
    if (filterStatus === 'Awaiting Scan-In') {
      return !hasTimeIn && !hasTimeOut;
    }

    // 2. Pending: Has Time-In and NO Time-Out (INCLUDES In Verification items)
    if (filterStatus === 'Pending') {
      return hasTimeIn && !hasTimeOut;
    }

    // 3. In Verification: Only the subset currently on ad-hoc detour without time-out
    if (filterStatus === 'In Verification') {
      return isVerification && !hasTimeOut;
    }

    // 4. Completed: Has clocked out of this office
    if (filterStatus === 'Completed') {
      return hasTimeOut;
    }

    return true;
  });

  const filteredPipelineDocs = filterDocsList(pipelineDocs);

  const currentDashDocs = filteredPipelineDocs.slice((dashboardPage - 1) * itemsPerPage, dashboardPage * itemsPerPage);
  const totalDashPages = Math.ceil(filteredPipelineDocs.length / itemsPerPage) || 1;

  const currentPipeDocs = filteredPipelineDocs.slice((pipelinePage - 1) * itemsPerPage, pipelinePage * itemsPerPage);
  const totalPipePages = Math.ceil(filteredPipelineDocs.length / itemsPerPage) || 1;

  const filteredHistoryLogs = actionHistory.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch = (log.title && log.title.toLowerCase().includes(q)) || 
                          (log.full_name && log.full_name.toLowerCase().includes(q)) || 
                          (log.qr_code && log.qr_code.toLowerCase().includes(q));
    if (historyFilter !== 'All') return matchesSearch && log.action_type === historyFilter;
    return matchesSearch;
  });

  const currentHistoryPageRows = filteredHistoryLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const totalHistoryTabPages = Math.ceil(filteredHistoryLogs.length / itemsPerPage) || 1;

  return {
    processorOfficeName, processorOfficeId,
    profileName, setProfileName, profileEmail, setProfileEmail,
    facultyId, departmentName, twoFaEnabled, setTwoFaEnabled, twoFaCode, setTwoFaCode,
    expectedIncomingCount, awaitingScanInCount, pendingCount, completedProcessingCount, inVerificationCount,
    expectedIncomingList, isIncomingModalOpen, setIsIncomingModalOpen, isIncomingLoading,
    fetchExpectedIncomingList,
    notifications, setNotifications, hasUnreadChats, setHasUnreadChats,
    processTypes, officesList, pipelineDocs,
    search, setSearch, filterStatus, setFilterStatus, historyFilter, setHistoryFilter,
    dashboardPage, setDashboardPage, pipelinePage, setPipelinePage, historyPage, setHistoryPage,
    filteredDocs: filteredPipelineDocs, currentDashDocs, totalDashPages,
    filteredPipelineDocs, currentPipeDocs, totalPipePages,
    filteredHistoryLogs, currentHistoryPageRows, totalHistoryTabPages,
    resolveOfficeStatus,
    fetchProcessorMeta, fetchOfficesList
  };
}