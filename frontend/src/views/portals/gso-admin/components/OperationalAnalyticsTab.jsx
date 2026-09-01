// Modernized OperationalAnalyticsTab.jsx[cite: 16]
import React from 'react';
import { Download, Database, ShieldCheck, Search, Lightbulb, Zap, Truck, Package, BarChart2, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts';

export default function OperationalAnalyticsTab({
  auditStartDate,
  setAuditStartDate,
  auditEndDate,
  setAuditEndDate,
  handleGenerateAuditReport,
  isAnalyticsLoading,
  bottleneckSearch,
  setBottleneckSearch,
  bottleneckSort,
  setBottleneckSort,
  processedBottleneckData,
  equipmentInventory,
  demandTimeFilter,
  setDemandTimeFilter,
  chartReadyDemandData,
  transitionDate,
  systemHealth,
  routePerf
}) {
  const isDbHealthy = systemHealth?.database_connection === 'HEALTHY';

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Operational Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Data-driven insights for administrative evaluation and resource planning.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <input 
              type="date" 
              value={auditStartDate} 
              onChange={e => setAuditStartDate(e.target.value)} 
              className="text-xs border-none bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer focus:ring-0" 
            />
            <span className="text-gray-400 font-bold text-xs">-</span>
            <input 
              type="date" 
              value={auditEndDate} 
              onChange={e => setAuditEndDate(e.target.value)} 
              className="text-xs border-none bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer focus:ring-0" 
            />
          </div>
          
          <button 
            onClick={handleGenerateAuditReport}
            className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs uppercase tracking-wide rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <Download size={16} strokeWidth={2.5} /> Generate Full Audit Report
          </button>
        </div>
      </div>

      {isAnalyticsLoading ? (
         <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
           <svg className="animate-spin h-8 w-8 text-[#D32F2F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           <span className="text-gray-500 font-bold text-sm tracking-wide uppercase">Fetching ML Models & Processing Data...</span>
         </div>
      ) : (
        <>
          {/* SYSTEM HEALTH KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Database Connection */}
            <div className={`bg-white border-t-4 border-x border-b border-gray-200 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all ${isDbHealthy ? 'border-t-emerald-500' : 'border-t-[#D32F2F]'}`}>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Database Connection</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase shadow-sm ${
                  isDbHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-[#D32F2F] border border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isDbHealthy ? 'bg-emerald-500' : 'bg-[#D32F2F] animate-pulse'}`}></span>
                  {systemHealth?.database_connection || 'UNKNOWN'}
                </span>
              </div>
              <div className={`p-3 rounded-xl shadow-sm ${isDbHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[#D32F2F]'}`}>
                <Database size={24} strokeWidth={2.5} />
              </div>
            </div>

            {/* Data Integrity Score */}
            <div className="bg-white border-t-4 border-t-blue-500 border-x border-b border-gray-200 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Data Integrity Score</p>
                <h3 className="text-3xl font-black text-gray-900">
                  {systemHealth?.data_quality_audit?.integrity_score_percentage || 0}%
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                <ShieldCheck size={24} strokeWidth={2.5} />
              </div>
            </div>

            {/* Records Scanned */}
            <div className="bg-white border-t-4 border-t-amber-500 border-x border-b border-gray-200 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Records Scanned</p>
                <h3 className="text-3xl font-black text-gray-900">
                  {systemHealth?.data_quality_audit?.audit_details?.total_records_scanned || 0}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shadow-sm">
                <Search size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* MAIN CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Bottleneck Analytical Evaluation Process */}
            <div className="lg:col-span-2 bg-white border-t-4 border-t-purple-500 border-x border-b border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-5 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <BarChart2 className="text-purple-600" size={18} strokeWidth={2.5} />
                    Descriptive Analytics: Bottleneck Evaluation
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Visualizing document processing dwell times across campus units.</p>
                </div>
                
                {/* Search & Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search Office..." 
                      value={bottleneckSearch} 
                      onChange={e => setBottleneckSearch(e.target.value)} 
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 w-36 bg-gray-50 shadow-sm" 
                    />
                  </div>
                  <select 
                    value={bottleneckSort} 
                    onChange={e => setBottleneckSort(e.target.value)} 
                    className="px-2 py-1.5 text-xs font-bold text-gray-700 border border-gray-300 rounded-lg outline-none bg-gray-50 shadow-sm cursor-pointer"
                  >
                    <option value="desc">Highest Delay</option>
                    <option value="asc">Lowest Delay</option>
                  </select>
                </div>
              </div>
              
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedBottleneckData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                    <XAxis type="number" tick={{fontSize: 10}} unit="h" axisLine={false} tickLine={false} />
                    <YAxis dataKey="office_name" type="category" tick={{fontSize: 10, fill: '#4b5563', fontWeight: 600}} width={140} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="dwell_time_hours" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={24} name="Dwell Time (Hours)" />
                  </BarChart>
                </ResponsiveContainer>
                {processedBottleneckData.length === 0 && (
                  <div className="text-center text-sm text-gray-400 font-bold -mt-32">No offices match your search.</div>
                )}
              </div>
            </div>

            {/* CARD 2: Prescriptive Analytics */}
            <div className="bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col h-[400px]">
              <div className="mb-6 pb-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Package className="text-[#D32F2F]" size={18} strokeWidth={2.5} />
                  Prescriptive Analytics
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Current event equipment inventory status.</p>
              </div>
              
              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {equipmentInventory.map(item => {
                  const percentAvailable = Math.round((item.current_stock / item.capacity) * 100) || 0;
                  const percentLoaned = 100 - percentAvailable;
                  
                  return (
                    <div key={item.asd_id} className="group">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-gray-900">{item.asset_name}</span>
                        <span className="text-gray-500">{item.capacity} Total</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-5 flex overflow-hidden border border-gray-200 shadow-inner relative">
                        <div 
                          className="h-full flex items-center justify-center text-[9px] font-black text-white bg-[#D32F2F] transition-all duration-500" 
                          style={{ width: `${percentAvailable}%` }}
                        >
                          {percentAvailable > 15 ? `${percentAvailable}% Avail` : ''}
                        </div>
                        <div 
                          className="h-full flex items-center justify-center text-[9px] font-black text-red-900 bg-red-100 transition-all duration-500 border-l border-white/30" 
                          style={{ width: `${percentLoaned}%` }}
                        >
                          {percentLoaned > 15 ? `${percentLoaned}% Loaned` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {equipmentInventory.length === 0 && <div className="text-sm text-gray-400 font-bold text-center mt-10">No equipment data available.</div>}
              </div>

              <div className="mt-4 bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm shrink-0">
                <p className="text-xs font-black text-[#D32F2F] flex items-center gap-1.5 mb-1.5 uppercase tracking-wider">
                  <Lightbulb size={14} /> System Insight
                </p>
                <p className="text-xs text-red-900 font-medium leading-relaxed">Stock levels are currently stable based on historical borrowing patterns.</p>
              </div>
            </div>
          </div>

          {/* PREDICTIVE ANALYTICS CHART */}
          <div className="bg-white border-t-4 border-t-indigo-500 border-x border-b border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 pb-5 border-b border-gray-100 gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="text-indigo-600" size={18} strokeWidth={2.5} />
                  Predictive Analytics: Van Scheduling & Facility Demand
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Holt-Winters exponential smoothing forecast vs. historical baseline.</p>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-2">Timeline:</span>
                <select 
                  value={demandTimeFilter} 
                  onChange={e => setDemandTimeFilter(Number(e.target.value))} 
                  className="px-2 py-1 text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer border-none focus:ring-0"
                >
                  <option value={3}>Last 3 Months</option>
                  <option value={6}>Last 6 Months</option>
                  <option value={9}>Last 9 Months</option>
                  <option value={12}>Last 12 Months</option>
                </select>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartReadyDemandData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVehicle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFacility" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                  
                  {transitionDate && (
                    <ReferenceLine 
                      x={transitionDate} 
                      stroke="#D32F2F" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ position: 'top', value: 'Current Date', fill: '#D32F2F', fontSize: 10, fontWeight: '900', offset: 10 }} 
                    />
                  )}

                  <Area type="monotone" dataKey="van_hist" name="Van Scheduling" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVehicle)" connectNulls />
                  <Area type="monotone" dataKey="fac_hist" name="Campus Facilities" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFacility)" connectNulls />
                  
                  <Area type="monotone" dataKey="van_fore" name="Van Forecast" legendType="none" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="5 5" fill="none" connectNulls />
                  <Area type="monotone" dataKey="fac_fore" name="Facility Forecast" legendType="none" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="5 5" fill="none" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LOWER GRID: EFFICIENCY TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            {/* Document Routing Efficiency Table */}
            <div className="bg-white border-t-4 border-t-rose-500 border-x border-b border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[450px]">
              <div className="p-5 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                  <Zap className="w-5 h-5 text-rose-500" strokeWidth={2.5} />
                  Document Routing Efficiency
                </h3>
                <p className="text-xs text-gray-500 mt-1">Calculated duration documents spend traveling prescribed routes.</p>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-gray-50/30">
                {routePerf?.document_routes?.map((route, idx) => (
                  <div key={idx} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                    <div className="flex items-center gap-3 max-w-[70%]">
                      <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Zap size={14} />
                      </div>
                      <span className="font-bold text-sm text-gray-900 truncate group-hover:text-rose-600 transition-colors">{route.route_name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-black text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md shadow-sm">
                        {route.avg_completion_hours} hrs
                      </span>
                      <span className="text-[9px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">Avg. Completion</span>
                    </div>
                  </div>
                ))}

                {(!routePerf?.document_routes || routePerf.document_routes.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                    <Zap className="w-8 h-8 text-gray-300 mb-3" />
                    <p className="text-sm font-bold text-gray-600">No Routing Data</p>
                    <p className="text-xs text-gray-500 mt-1">No completed document routing cycles logged yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Van Scheduling Turnaround Table */}
            <div className="bg-white border-t-4 border-t-blue-500 border-x border-b border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[450px]">
              <div className="p-5 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                  <Truck className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  Van Scheduling Turnaround Metrics
                </h3>
                <p className="text-xs text-gray-500 mt-1">Monitors trip counts and turnaround duration for campus vans.</p>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-gray-50/30">
                {routePerf?.vehicle_scheduling?.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Truck size={14} />
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

                {(!routePerf?.vehicle_scheduling || routePerf.vehicle_scheduling.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-3">
                      <Truck className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">No Van Trips Logged</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Completed van schedules will automatically populate metrics here.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}