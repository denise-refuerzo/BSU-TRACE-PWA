import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchWithAuth } from "../../../../api";

const SOCKET_URL = 'https://bsu-trace-pwa.onrender.com';

export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    counters: { activeTracks: 0, systemUsers: 0, workflowBlueprints: 0 },
    liveAuditTrail: [],
    stalledBottlenecks: []
  });
  
  const socketRef = useRef(null);

  useEffect(() => {
    fetchDashboardMetrics();

    // REAL-TIME: Connect to WebSocket for live ICT metrics
    socketRef.current = io(SOCKET_URL, {
      secure: true,
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      // Join the global ICT admin room
      socketRef.current.emit('join-ict-admin-room');
    });

    // Listen for system-wide updates broadcasted by the backend
    socketRef.current.on('system-metrics-updated', () => {
      fetchDashboardMetrics();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/dashboard-metrics');
      const payload = await res.json();
      if (res.ok) setData(payload);
    } catch (err) {
      console.error("Error gathering ecosystem infrastructure parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  return { loading, data };
}