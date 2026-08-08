import React from 'react';
import { Download } from 'lucide-react';
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
  // Props merged from OperationalAnalytics.jsx
  systemHealth,
  routePerf
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900">Operational Analytics</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">Data-driven insights for administrative evaluation and resource planning.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={auditStartDate} onChange={e => setAuditStartDate(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5" />
          <input type="date" value={auditEndDate} onChange={e => setAuditEndDate(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5" />
          
          <button 
            onClick={handleGenerateAuditReport}
            className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Download size={14} /> Generate Full Audit Report
          </button>
        </div>
      </div>

      {isAnalyticsLoading ? (
         <div className="flex items-center justify-center h-64 text-neutral-400 font-bold text-sm">
           Fetching ML Models & Processing Data...
         </div>
      ) : (
        <>
          {/* SYSTEM HEALTH KPI ROW (Merged from OperationalAnalytics.jsx) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Database Connection</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  systemHealth?.database_connection === 'HEALTHY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {systemHealth?.database_connection || 'UNKNOWN'}
                </span>
                <span className="text-2xl">🗄️</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Data Integrity Score</p>
              <div className="flex items-center justify-between mt-1">
                <h3 className="text-2xl font-black text-neutral-900">
                  {systemHealth?.data_quality_audit?.integrity_score_percentage || 0}%
                </h3>
                <span className="text-2xl">🛡️</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Records Scanned</p>
              <div className="flex items-center justify-between mt-1">
                <h3 className="text-2xl font-black text-neutral-900">
                  {systemHealth?.data_quality_audit?.audit_details?.total_records_scanned || 0}
                </h3>
                <span className="text-2xl">🔍</span>
              </div>
            </div>
          </div>

          {/* MAIN CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Bottleneck Analytical Evaluation Process */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Descriptive Analytics: Bottleneck Analytical Evaluation Process</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Visualizing document processing dwell times across campus units.</p>
                </div>
                
                {/* Search & Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Search Office..." 
                    value={bottleneckSearch} 
                    onChange={e => setBottleneckSearch(e.target.value)} 
                    className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-red-800 w-36 bg-neutral-50" 
                  />
                  <select 
                    value={bottleneckSort} 
                    onChange={e => setBottleneckSort(e.target.value)} 
                    className="px-2 py-1.5 text-xs font-bold text-neutral-700 border border-neutral-300 rounded-lg outline-none bg-neutral-50 cursor-pointer"
                  >
                    <option value="desc">Highest Delay</option>
                    <option value="asc">Lowest Delay</option>
                  </select>
                </div>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedBottleneckData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f5" />
                    <XAxis type="number" tick={{fontSize: 10}} unit="h" />
                    <YAxis dataKey="office_name" type="category" tick={{fontSize: 10, fill: '#525252'}} width={140} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="dwell_time_hours" fill="#991b1b" radius={[0, 4, 4, 0]} barSize={28} name="Dwell Time (Hours)" />
                  </BarChart>
                </ResponsiveContainer>
                {processedBottleneckData.length === 0 && (
                  <div className="text-center text-xs text-neutral-400 font-bold -mt-32">No offices match your search.</div>
                )}
              </div>
            </div>

            {/* CARD 2: Prescriptive Analytics */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col border-t-4 border-t-red-800">
              <div className="mb-6">
                <h3 className="text-base font-black text-neutral-900">Prescriptive Analytics: Event Equipment</h3>
                <p className="text-[11px] text-neutral-500 font-medium">Current inventory status and loan commitments.</p>
              </div>
              
              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {equipmentInventory.map(item => {
                  const percentAvailable = Math.round((item.current_stock / item.capacity) * 100) || 0;
                  const percentLoaned = 100 - percentAvailable;
                  
                  return (
                    <div key={item.asd_id}>
                      <div className="flex justify-between text-sm font-black mb-1.5">
                        <span className="text-neutral-900">{item.asset_name}</span>
                        <span className="text-neutral-500">{item.capacity} Total</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-xl h-8 flex overflow-hidden border border-neutral-200 shadow-inner">
                        <div 
                          className="h-full flex items-center justify-center text-[10px] font-black text-white bg-red-800 transition-all duration-500" 
                          style={{ width: `${percentAvailable}%` }}
                        >
                          {percentAvailable > 15 ? `${percentAvailable}% Avail` : ''}
                        </div>
                        <div 
                          className="h-full flex items-center justify-center text-[10px] font-black text-red-900 bg-red-100 transition-all duration-500 border-l border-white/20" 
                          style={{ width: `${percentLoaned}%` }}
                        >
                          {percentLoaned > 15 ? `${percentLoaned}% Loaned` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {equipmentInventory.length === 0 && <div className="text-sm text-neutral-400 font-bold text-center mt-10">No equipment data available.</div>}
              </div>

              <div className="mt-4 bg-red-50/50 border border-red-200 p-4 rounded-xl border-l-4 border-l-red-800 shadow-sm">
                <p className="text-[11px] font-black text-red-900 flex items-center gap-1.5 mb-1">💡 System Insight</p>
                <p className="text-[11px] text-red-800 font-medium leading-relaxed">Stock levels are currently stable based on historical borrowing patterns.</p>
              </div>
            </div>
          </div>

          {/* PREDICTIVE ANALYTICS CHART */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm mt-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-black text-neutral-900">Predictive Analytics: Van Scheduling & Facility Demand</h3>
                <p className="text-[10px] text-neutral-500 font-medium">Holt-Winters exponential smoothing forecast vs. historical baseline.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Timeline:</span>
                <select 
                  value={demandTimeFilter} 
                  onChange={e => setDemandTimeFilter(Number(e.target.value))} 
                  className="px-3 py-1.5 text-xs font-bold text-neutral-700 border border-neutral-300 rounded-lg outline-none bg-neutral-50 cursor-pointer"
                >
                  <option value={3}>Last 3 Months</option>
                  <option value={6}>Last 6 Months</option>
                  <option value={9}>Last 9 Months</option>
                  <option value={12}>Last 12 Months</option>
                </select>
              </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartReadyDemandData} margin={{ top: 30, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVehicle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFacility" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#171717' }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  
                  {transitionDate && (
                    <ReferenceLine 
                      x={transitionDate} 
                      stroke="#991b1b" 
                      strokeWidth={1.5}
                      label={{ position: 'top', value: 'Current Date', fill: '#991b1b', fontSize: 10, fontWeight: 'black', offset: 10 }} 
                    />
                  )}

                  <Area type="monotone" dataKey="van_hist" name="Van Scheduling" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicle)" connectNulls />
                  <Area type="monotone" dataKey="fac_hist" name="Campus Facilities" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorFacility)" connectNulls />
                  
                  <Area type="monotone" dataKey="van_fore" name="Van Forecast" legendType="none" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="5 5" fill="none" connectNulls />
                  <Area type="monotone" dataKey="fac_fore" name="Facility Forecast" legendType="none" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="5 5" fill="none" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LOWER GRID: EFFICIENCY TABLES (Merged from OperationalAnalytics.jsx) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-red-800">
                  ⚡ Document Routing Efficiency (Avg. Completion Hours)
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Calculated duration documents spend traveling along prescribed routes.</p>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {routePerf?.document_routes?.map((route, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-800 truncate max-w-[70%]">{route.route_name}</span>
                    <span className="font-mono font-black text-red-800 bg-red-50 border border-red-200 px-2 py-1 rounded">
                      {route.avg_completion_hours} hrs
                    </span>
                  </div>
                ))}

                {(!routePerf?.document_routes || routePerf.document_routes.length === 0) && (
                  <p className="text-center text-xs italic text-gray-400 py-8">No completed document routing cycles logged yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-red-800">
                  🚐 Vehicle Scheduling Turnaround Metrics
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Monitors trip counts and turnaround duration for fleet vehicles.</p>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {routePerf?.vehicle_scheduling?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                    <p className="font-bold text-neutral-800">{item.asset_name}</p>
                      <p className="text-[10px] text-gray-400">Total Trips: {item.total_trips}</p>
                    </div>
                    <span className="font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                      {item.avg_turnaround_hours} hrs
                    </span>
                  </div>
                ))}

                {(!routePerf?.vehicle_scheduling || routePerf.vehicle_scheduling.length === 0) && (
                  <div className="text-center py-8 bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                    <span className="text-xl block mb-1">🚐</span>
                    <p className="text-xs font-bold text-neutral-600 uppercase">No Fleet Trips Logged</p>
                    <p className="text-[10px] text-gray-400 font-normal mt-0.5">Completed vehicle schedules will automatically populate metrics here.</p>
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