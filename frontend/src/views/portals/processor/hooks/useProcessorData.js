import { useState, useEffect } from 'react';
import { fetchWithAuth } from "../../../../api"; // Adjust path based on your folder depth

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

  // --- DOCUMENT DATA STATE ---
  const [incomingDocs, setIncomingDocs] = useState([]);
  const [expectedIncomingCount, setExpectedIncomingCount] = useState(0);
  const [pipelineDocs, setPipelineDocs] = useState([]);  
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
  const itemsPerPage = 5;

  // --- API FETCHING FUNCTIONS ---
  const fetchExpectedIncomingCount = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/processor/documents/expected-count/${officeId}`);
      const data = await res.json();
      if (res.ok) setExpectedIncomingCount(data.count);
    } catch (err) { console.error("Expected incoming sync error:", err); }
  };

  const fetchIncomingDocumentLogs = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/processor/documents/${officeId}`);
      const data = await res.json();
      if (res.ok) {
        setIncomingDocs(data);
        if (data.length > 0) {
          setNotifications([{ 
            id: 1, 
            title: "New Document Routing", 
            message: `Document "${data[0].title}" entered your office queue. Action required.`, 
            time: data[0].created_at 
          }]);
        }
      }
    } catch (err) { console.error("Frontend document log sync error:", err); }
  };

  const fetchPipelineDocs = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/processor/documents/pipeline/${officeId}`);
      const data = await res.json();
      if (res.ok) setPipelineDocs(data);
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

  const fetchProcessorMeta = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/profile/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setProcessorOfficeName(data.office_name || 'CICS Office');
        setProcessorOfficeId(data.o_id);
        
        setProfileName(data.full_name || '');
        setProfileEmail(data.uni_email || '');
        setFacultyId(data.faculty_id || 'NOT ASSIGNED');
        setDepartmentName(data.department_name || 'CICS');
        setTwoFaEnabled(data.two_fa_enabled || false);
        setTwoFaCode(data.two_fa_code || '');

        fetchIncomingDocumentLogs(data.o_id);
        fetchExpectedIncomingCount(data.o_id);
        fetchPipelineDocs(data.o_id);
        fetchOfficeActionHistory(data.o_id);
      }
    } catch (err) { console.error("Error connecting metadata:", err); }
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

  // --- EFFECTS ---
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    fetchProcessorMeta();
    fetchWorkflowTemplates();
  }, [userId]);

  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    const checkChatBadgeStatus = async () => {
      try {
        const res = await fetchWithAuth('http://localhost:5000/api/chat/active-documents-directory');
        const data = await res.json();
        if (res.ok) setHasUnreadChats(data.some(d => d.hasAnyChat === true));
      } catch (err) { console.error(err); }
    };

    checkChatBadgeStatus();
    const chatInterval = setInterval(checkChatBadgeStatus, 15000);
    return () => clearInterval(chatInterval);
  }, [userId]);

  // --- DERIVED DATA (Filters & Pagination) ---
  const filteredDocs = incomingDocs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || doc.qr_code.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'Awaiting Scan-In') return matchesSearch && (doc.time_in === null || doc.time_in === undefined);
    if (filterStatus === 'Pending') return matchesSearch; 
    if (filterStatus === 'In Verification') return matchesSearch && doc.status?.toLowerCase() === 'in verification';
    return matchesSearch;
  });

  const filteredPipelineDocs = pipelineDocs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || doc.qr_code.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'Awaiting Scan-In') return matchesSearch && (doc.time_in === null || doc.time_in === undefined) && !doc.time_out;
    if (filterStatus === 'Pending') return matchesSearch && !doc.time_out; 
    if (filterStatus === 'In Verification') return matchesSearch && doc.status?.toLowerCase() === 'in verification';
    if (filterStatus === 'Completed') return matchesSearch && doc.time_out !== null && doc.time_out !== undefined; 
    return matchesSearch;
  });

  const filteredHistoryLogs = actionHistory.filter(log => {
    const matchesSearch = log.title.toLowerCase().includes(search.toLowerCase()) || log.full_name.toLowerCase().includes(search.toLowerCase()) || log.qr_code.toLowerCase().includes(search.toLowerCase());
    if (historyFilter !== 'All') return matchesSearch && log.action_type === historyFilter;
    return matchesSearch;
  });

  // Pagination calculations
  const currentDashDocs = filteredDocs.slice((dashboardPage - 1) * itemsPerPage, dashboardPage * itemsPerPage);
  const totalDashPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const currentPipeDocs = filteredPipelineDocs.slice((pipelinePage - 1) * itemsPerPage, pipelinePage * itemsPerPage);
  const totalPipePages = Math.ceil(filteredPipelineDocs.length / itemsPerPage);

  const currentHistoryPageRows = filteredHistoryLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const totalHistoryTabPages = Math.ceil(filteredHistoryLogs.length / itemsPerPage);

  // Stat counts
  const awaitingScanInCount = incomingDocs.filter(d => d.time_in === null || d.time_in === undefined).length;
  const pendingCount = incomingDocs.filter(d => d.time_in !== null && d.time_out === null).length;
  const completedProcessingCount = pipelineDocs.filter(d => d.time_out !== null && d.time_out !== undefined).length;
  const inVerificationCount = pipelineDocs.filter(d => d.status?.toLowerCase() === 'in verification' && (d.time_out === null || d.time_out === undefined)).length;

  return {
    // Expose Data
    processorOfficeName, processorOfficeId,
    profileName, setProfileName, profileEmail, setProfileEmail,
    facultyId, departmentName, twoFaEnabled, setTwoFaEnabled, twoFaCode, setTwoFaCode,
    expectedIncomingCount, awaitingScanInCount, pendingCount, completedProcessingCount, inVerificationCount,
    notifications, setNotifications, hasUnreadChats, setHasUnreadChats,
    processTypes, officesList,
    
    // Expose Filter/Pagination States
    search, setSearch, filterStatus, setFilterStatus, historyFilter, setHistoryFilter,
    dashboardPage, setDashboardPage, pipelinePage, setPipelinePage, historyPage, setHistoryPage,
    
    // Expose Computed Arrays
    filteredDocs, currentDashDocs, totalDashPages,
    filteredPipelineDocs, currentPipeDocs, totalPipePages,
    filteredHistoryLogs, currentHistoryPageRows, totalHistoryTabPages,
    
    // Expose Fetch Triggers
    fetchProcessorMeta, fetchOfficesList
  };
}