import React from 'react';

export default function DashboardOverviewTab({ data }) {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Operations Control Center</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time telemetry monitoring for data pipelines, traffic flows, and backlogs.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          System Online
        </div>
      </div>

      {/* VITAL COUNTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Counter 1 */}
        <div className="bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-300 p-6 rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Active Tracks</p>
            <h3 className="text-3xl font-black text-gray-900">{data.counters.activeTracks}</h3>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 text-[#D32F2F] rounded-xl shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Counter 2 */}
        <div className="bg-white border-t-4 border-t-blue-600 border-x border-b border-gray-300 p-6 rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Registered Personnel</p>
            <h3 className="text-3xl font-black text-gray-900">{data.counters.systemUsers}</h3>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        {/* Counter 3 */}
        <div className="bg-white border-t-4 border-t-amber-500 border-x border-b border-gray-300 p-6 rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-0.5">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Workflow Blueprints</p>
            <h3 className="text-3xl font-black text-gray-900">{data.counters.workflowBlueprints}</h3>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: LIVE STREAM AUDIT LOG FEED */}
        <div className="lg:col-span-2 bg-white border border-gray-300 rounded-2xl shadow-md overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-200 bg-gray-50/80">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Live Audit Stream Feed
            </h3>
            <p className="text-xs text-gray-600 mt-1">Real-time rolling ledger tracing pipeline checkpoints campus-wide.</p>
          </div>

          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
              {data.liveAuditTrail.map((log) => (
                <div key={log.history_id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-red-100 text-[#D32F2F] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md z-10">
                    <span className="text-xs font-black">{log.operator_name.charAt(0).toUpperCase()}</span>
                  </div>
                  
                  {/* Inner Audit Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-300 shadow-md hover:shadow-lg transition-shadow relative z-20">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate pr-2">
                        {log.operator_name}
                      </p>
                      <span className="text-[10px] text-gray-500 font-mono font-bold whitespace-nowrap bg-gray-100 border border-gray-200 px-2 py-0.5 rounded shrink-0">
                        {log.action_timestamp
                          ? new Date(String(log.action_timestamp).replace(/(\+00:00|\+00|Z)$/i, '')).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 break-words">
                      applied <span className="font-bold text-[#D32F2F]">"{log.action_type}"</span> to <span className="font-semibold text-gray-800">`{log.document_title}`</span>
                    </p>
                    
                    {/* FIXED: Office Name Wrapper */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 font-mono font-medium bg-gray-100 border border-gray-200 p-1.5 rounded-md max-w-full">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">{log.office_name || 'Global Core Node'}</span>
                    </div>

                  </div>
                </div>
              ))}
              
              {data.liveAuditTrail.length === 0 && (
                <div className="relative z-10 flex flex-col items-center justify-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-sm">
                  <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  <p className="text-sm font-bold text-gray-600">No recent transactions</p>
                  <p className="text-xs text-gray-500 mt-1">No execution records logged across network clusters today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DELAY CONGESTION ALERTS PANEL */}
        <div className="bg-white border border-gray-300 rounded-2xl shadow-md overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-200 bg-red-50/50">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Congestion Alerts
            </h4>
            <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed font-medium">Identifies critical workflows sitting inside an office destination past 48 hours without release scans.</p>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-gray-50/50">
            {data.stalledBottlenecks.map((item, index) => (
              /* Inner Bottleneck Card */
              <div key={index} className="bg-white p-4 border-l-4 border-l-[#D32F2F] border-y border-r border-gray-300 rounded-r-xl shadow-md hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-2.5">
                  <span className="text-sm font-bold text-gray-900 truncate pr-2 group-hover:text-[#D32F2F] transition-colors">{item.document_title}</span>
                  <span className="text-[10px] bg-red-100 border border-red-200 text-[#D32F2F] font-black px-2 py-1 rounded-md font-mono whitespace-nowrap shadow-sm shrink-0">
                    +{Math.floor(item.hours_stalled)} HRS
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-700 flex items-center gap-1.5 max-w-full">
                    <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Stuck at: <span className="font-bold text-gray-900 truncate">{item.office_name}</span>
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono font-semibold flex items-center gap-1.5 bg-gray-50 p-1.5 rounded border border-gray-100 max-w-fit">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(item.time_in).toLocaleDateString()} | {new Date(item.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {data.stalledBottlenecks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-black text-emerald-800 uppercase tracking-wide">Pipelines Nominal</p>
                <p className="text-xs text-gray-600 font-medium mt-2 max-w-[200px]">Zero tracking files currently breach operational turnaround velocity schedules.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}