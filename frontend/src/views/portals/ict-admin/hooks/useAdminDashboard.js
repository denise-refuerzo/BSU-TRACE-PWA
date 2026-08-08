import { useState, useEffect } from 'react';
import { fetchWithAuth } from "../../../../api";

export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    counters: { activeTracks: 0, systemUsers: 0, workflowBlueprints: 0 },
    liveAuditTrail: [],
    stalledBottlenecks: []
  });

  useEffect(() => {
    fetchDashboardMetrics();
    // Establish a live pooling cycle to auto-refresh feeds every 30 seconds
    const interval = setInterval(fetchDashboardMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/admin/dashboard-metrics');
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