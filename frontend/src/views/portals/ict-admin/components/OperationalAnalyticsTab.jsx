import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../../api';

export default function OperationalAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [routePerf, setRoutePerf] = useState({ document_routes: [], vehicle_scheduling: [] });
  const [systemHealth, setSystemHealth] = useState({
    database_connection: 'CHECKING',
    data_quality_audit: { status: 'PASS', integrity_score_percentage: 100, audit_details: {} }
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const routeRes = await fetchWithAuth('http://localhost:5000/api/analytics/route-performance');
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        setRoutePerf(routeData);
      }

      const healthRes = await fetchWithAuth('http://localhost:5000/api/analytics/system-health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData);
      }
    } catch (err) {
      console.error("Error connecting to analytics engine:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
        <svg className="animate-spin h-8 w-8 text-[#D32F2F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-500 font-bold text-sm tracking-wide uppercase">Fetching ML Models & Processing Data...</span>
      </div>
    );
  }

  const isDbHealthy = systemHealth.database_connection === 'HEALTHY';

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Operational & Service Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Live evaluation of routing efficiency, van scheduling velocity, and database record health.</p>
        </div>
      </div>

      {/* SYSTEM HEALTH KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Connection Status */}
        <div className={`bg-white border-t-4 border-x border-b border-gray-200 p-6 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all ${isDbHealthy ? 'border-t-emerald-500' : 'border-t-[#D32F2F]'}`}>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Database Connection</p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase shadow-sm ${
              isDbHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-[#D32F2F] border border-red-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isDbHealthy ? 'bg-emerald-500' : 'bg-[#D32F2F] animate-pulse'}`}></span>
              {systemHealth.database_connection}
            </span>
          </div>
          <div className={`p-3 rounded-xl shadow-sm ${isDbHealthy ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-[#D32F2F] border border-red-100'}`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4m-16 0c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
        </div>

        {/* Data Integrity Score */}
        <div className="bg-white border-t-4 border-t-blue-500 border-x border-b border-gray-200 p-6 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Data Integrity Score</p>
            <h3 className="text-3xl font-black text-gray-900">
              {systemHealth.data_quality_audit.integrity_score_percentage}%
            </h3>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {/* Records Scanned */}
        <div className="bg-white border-t-4 border-t-amber-500 border-x border-b border-gray-200 p-6 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Records Scanned</p>
            <h3 className="text-3xl font-black text-gray-900">
              {systemHealth.data_quality_audit.audit_details.total_records_scanned || 0}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* DOCUMENT ROUTING EFFICIENCY TABLE */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/80">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Document Routing Efficiency
            </h3>
            <p className="text-xs text-gray-500 mt-1">Calculated duration documents spend traveling along prescribed routes.</p>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-gray-50/30">
            {routePerf.document_routes.map((route, idx) => (
              <div key={idx} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                <div className="flex items-center gap-3 max-w-[70%]">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm text-gray-900 truncate group-hover:text-[#D32F2F] transition-colors">{route.route_name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono font-black text-xs text-[#D32F2F] bg-red-50 border border-red-100 px-2.5 py-1 rounded-md shadow-sm">
                    {route.avg_completion_hours} hrs
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">Avg. Completion</span>
                </div>
              </div>
            ))}

            {routePerf.document_routes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-bold text-gray-600">No Routing Data</p>
                <p className="text-xs text-gray-500 mt-1">No completed document routing cycles logged yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* VAN SCHEDULING PERFORMANCE TABLE */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/80">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Van Scheduling Turnaround Metrics
            </h3>
            <p className="text-xs text-gray-500 mt-1">Monitors trip counts and turnaround duration for campus vans.</p>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-gray-50/30">
            {routePerf.vehicle_scheduling.map((item, idx) => (
              <div key={idx} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{item.asset_name}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-wide">Total Trips: {item.total_trips}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md shadow-sm">
                    {item.avg_turnaround_hours} hrs
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">Avg. Turnaround</span>
                </div>
              </div>
            ))}

            {routePerf.vehicle_scheduling.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">No Van Trips Logged</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Completed van schedules will automatically populate metrics here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}