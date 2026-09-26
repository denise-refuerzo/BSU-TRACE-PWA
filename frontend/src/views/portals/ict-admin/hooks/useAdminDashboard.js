import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth } from "../../../../api";
import { createRealtimeClient } from '../../../../utils/realtimeClient';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export function useAdminDashboard(enabled = true) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    counters: { activeTracks: 0, systemUsers: 0, workflowBlueprints: 0 },
    liveAuditTrail: [],
    stalledBottlenecks: []
  });
  
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/dashboard-metrics');
      const payload = await res.json();
      if (res.ok) setData(payload);
    } catch (err) {
      console.error("Error gathering ecosystem infrastructure parameters:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const initial = window.setTimeout(fetchDashboardMetrics, 0);
    const socket = createRealtimeClient(SOCKET_URL, { secure: true, reconnection: true });
    const subscribe = () => socket.emit('join-ict-admin-room');
    socket.on('connect', subscribe);
    socket.on('system-metrics-updated', fetchDashboardMetrics);
    return () => { window.clearTimeout(initial); socket.disconnect(); };
  }, [enabled, fetchDashboardMetrics]);

  return { loading, data };
}
