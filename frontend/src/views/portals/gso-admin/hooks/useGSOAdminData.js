import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from "../../../../api";


export function useGSOAdminData() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('user') || 'Admin User';

  // --- 1. Notification & Chat States ---
  const [notifications, setNotifications] = useState([]);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  // --- 2. Workspace & Profile States ---
  const [gsoOfficeName, setGsoOfficeName] = useState('Loading Office...');
  const [gsoOfficeId, setGsoOfficeId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [facultyId, setFacultyId] = useState('N/A');
  const [departmentName, setDepartmentName] = useState('N/A');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');

  // --- 3. Dashboard Document States ---
  const [pipelineDocs, setPipelineDocs] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [officesList, setOfficesList] = useState([]);
  const [expectedIncomingCount, setExpectedIncomingCount] = useState(0);

  // --- 4. Resource & Asset States ---
  const [assetsList, setAssetsList] = useState([]);
  const [equipmentInventory, setEquipmentInventory] = useState([]);
  const [assetBlackouts, setAssetBlackouts] = useState([]);

  // --- 5. Procurement States ---
  const [reservationsList, setReservationsList] = useState([]);
  const [logisticsList, setLogisticsList] = useState([]);

  // --- 6. Analytics States ---
  const [bottleneckData, setBottleneckData] = useState([]);
  const [peakDemandData, setPeakDemandData] = useState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [routePerf, setRoutePerf] = useState({ document_routes: [], vehicle_scheduling: [] });
  const [systemHealth, setSystemHealth] = useState({
    database_connection: 'CHECKING',
    data_quality_audit: { status: 'PASS', integrity_score_percentage: 100, audit_details: {} }
  });

  // --- FETCH FUNCTIONS ---

  const fetchGSOMeta = async () => {
    try {
      const res = await fetchWithAuth(`/api/profile/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setGsoOfficeName(data.office_name || 'General Services Office');
        setGsoOfficeId(data.o_id);
        setProfileName(data.full_name || '');
        setProfileEmail(data.uni_email || '');
        setFacultyId(data.faculty_id || 'NOT ASSIGNED');
        setDepartmentName(data.department_name || 'GSO');
        setTwoFaEnabled(data.two_fa_enabled || false);
        setTwoFaCode(data.two_fa_code || '');

        fetchPipelineDocs(data.o_id);
        fetchOfficeActionHistory(data.o_id);
        fetchExpectedIncomingCount(data.o_id);
        fetchGSOCombinedNotificationFeeds(data.o_id);
      }
    } catch (err) { console.error("Error connecting metadata:", err); }
  };

  const fetchExpectedIncomingCount = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/documents/expected-count/${officeId}`);
      const data = await res.json();
      if (res.ok) setExpectedIncomingCount(data.count);
    } catch (err) { console.error("Expected incoming sync error:", err); }
  };

  const fetchGSOCombinedNotificationFeeds = async (officeId) => {
    if (!officeId) return;
    try {
      const procRes = await fetchWithAuth(`/api/notifications/${userId}/2/${officeId}`);
      const procData = await procRes.json();
  
      const signRes = await fetchWithAuth(`/api/notifications/${userId}/3/${officeId}`);
      const signData = await signRes.json();
  
      if (procRes.ok && signRes.ok) {
        const combined = [
          ...procData.map(n => ({ ...n, roleSource: 'Processor' })),
          ...signData.map(n => ({ ...n, roleSource: 'Signee' }))
        ];
        combined.sort((a, b) => new Date(b.time) - new Date(a.time));
        setNotifications(combined.slice(0, 10));
      }
    } catch (err) { console.error("Error aggregating combined GSO alerts trail:", err); }
  };

  const fetchPipelineDocs = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/documents/pipeline/${officeId}`);
      const data = await res.json();
      if (res.ok) setPipelineDocs(data);
    } catch (err) { console.error("Pipeline sync error:", err); }
  };

  const fetchOfficeActionHistory = async (officeId) => {
    if (!officeId) return;
    try {
      const res = await fetchWithAuth(`/api/processor/history/${officeId}`);
      const data = await res.json();
      if (res.ok) setActionHistory(data);
    } catch (err) { console.error("History log retrieval error:", err); }
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

  const fetchProcurementData = async () => {
    try {
      const resBookings = await fetchWithAuth('/api/procurement/reservations');
      if (resBookings.ok) setReservationsList(await resBookings.json());
      
      const resLogistics = await fetchWithAuth('/api/procurement/logistics');
      if (resLogistics.ok) setLogisticsList(await resLogistics.json());
    } catch (err) { console.error("Error fetching procurement data:", err); }
  };

  const fetchOperationalAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const resBottlenecks = await fetchWithAuth('/api/analytics/bottlenecks');
      if (resBottlenecks.ok) setBottleneckData(await resBottlenecks.json());
      
      const resPeak = await fetchWithAuth('/api/analytics/peak-demand');
      if (resPeak.ok) {
        const rawPeakData = await resPeak.json();
        const formattedPeakData = rawPeakData.map(item => ({
          ...item,
          vehicle_demand: Number(item.vehicle_demand || 0), 
          facility_demand: Number(item.facility_demand || 0)
        }));
        setPeakDemandData(formattedPeakData);
      }

      if (equipmentInventory.length === 0) fetchInventoryMetrics();
    } catch (err) { console.error("Error fetching analytics:", err); } 
    finally { setIsAnalyticsLoading(false); }
  };

  const fetchBlackouts = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/blackouts');
      const data = await res.json();
      if (res.ok) setAssetBlackouts(data);
    } catch (err) { console.error(err); }
  };

  const fetchMasterAssets = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/assets');
      const data = await res.json();
      if (res.ok) setAssetsList(data);
    } catch (err) { console.error("Error pulling master assets:", err); }
  };

  const fetchInventoryMetrics = async () => {
    try {
      const res = await fetchWithAuth('/api/resources/inventory');
      const data = await res.json();
      if (res.ok) setEquipmentInventory(data);
    } catch (err) { console.error(err); }
  };

  const fetchSystemAnalyticsData = async () => {
    try {
      const routeRes = await fetchWithAuth('/api/analytics/route-performance');
      if (routeRes.ok) setRoutePerf(await routeRes.json());

      const healthRes = await fetchWithAuth('/api/analytics/system-health');
      if (healthRes.ok) setSystemHealth(await healthRes.json());
    } catch (err) { console.error("Error connecting to analytics engine:", err); }
  };

  // --- USE EFFECTS ---

  useEffect(() => {
    if (!userId || userId === 'undefined') {
      localStorage.clear();
      navigate('/login');
      return;
    }
    fetchGSOMeta();
    fetchWorkflowTemplates();
    fetchOfficesList();
    fetchProcurementData();
    fetchInventoryMetrics();
    fetchSystemAnalyticsData(); // Merged from OperationalAnalytics.jsx
  }, [userId, navigate]);

  // Poll for unread chats
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    const checkChatBadgeStatus = async () => {
      try {
        const res = await fetchWithAuth('/api/chat/active-documents-directory');
        const data = await res.json();
        if (res.ok) setHasUnreadChats(data.some(d => d.hasAnyChat === true));
      } catch (err) { console.error(err); }
    };

    checkChatBadgeStatus();
    const chatInterval = setInterval(checkChatBadgeStatus, 15000);
    return () => clearInterval(chatInterval);
  }, [userId]);

  return {
    userId, userName, gsoOfficeName, gsoOfficeId, profileName, setProfileName, profileEmail, setProfileEmail,
    facultyId, departmentName, twoFaEnabled, setTwoFaEnabled, twoFaCode,
    notifications, setNotifications, hasUnreadChats, setHasUnreadChats,
    pipelineDocs, actionHistory, processTypes, officesList, expectedIncomingCount,
    assetsList, equipmentInventory, assetBlackouts,
    reservationsList, logisticsList,
    bottleneckData, peakDemandData, isAnalyticsLoading, routePerf, systemHealth,
    fetchGSOMeta, fetchProcurementData, fetchOperationalAnalytics, fetchBlackouts, fetchMasterAssets, fetchInventoryMetrics, fetchSystemAnalyticsData
  };
}