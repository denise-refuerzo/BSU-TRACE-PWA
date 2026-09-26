import React from 'react';

export default function DashboardOverviewTab({ data }) {
  return (
    <div className="space-y-4 max-w-full mx-auto text-left animate-in fade-in duration-200 h-[calc(100dvh-100px)] flex flex-col overflow-hidden pb-2 md:pb-4">

      {/* VITAL COUNTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white dark:bg-[#180e10] border-t-4 border-t-[#D32F2F] dark:border-t-red-500 border-x border-b border-gray-200 dark:border-[#42292f] p-7 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider mb-0.5">Active Tracks</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{data.counters.activeTracks}</h3>
          </div>
          <div className="p-2.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-[#D32F2F] dark:text-red-400 rounded-lg shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#180e10] border-t-4 border-t-blue-600 dark:border-blue-500 border-x border-b border-gray-200 dark:border-[#42292f] p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider mb-0.5">Registered Personnel</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{data.counters.systemUsers}</h3>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#180e10] border-t-4 border-t-amber-500 border-x border-b border-gray-200 dark:border-[#42292f] p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider mb-0.5">Workflow Blueprints</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{data.counters.workflowBlueprints}</h3>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-lg shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
        </div>
      </div>

      {/* KANBAN-STYLE TELEMETRY LANES */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory custom-scrollbar pb-2">
        
        {/* LEFT LANE: LIVE STREAM AUDIT LOG FEED */}
        <div className="w-[85vw] sm:w-80 md:w-auto md:flex-2 shrink-0 flex flex-col bg-white dark:bg-[#180e10] rounded-xl border border-gray-200 dark:border-[#42292f] overflow-hidden transition-opacity snap-start">
          <div className="p-3 border-b border-gray-200 dark:border-[#42292f] bg-gray-50 dark:bg-[#1c1113] shrink-0">
            <h3 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Live Audit Stream Feed
            </h3>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30 dark:bg-[#120b0c]">
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-700 before:to-transparent">
              {data.liveAuditTrail.map((log) => (
                <div key={log.history_id} className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-[#180e10] bg-red-100 dark:bg-red-900/40 text-[#D32F2F] dark:text-red-400 shrink-0 shadow-sm z-10">
                    <span className="text-[10px] font-black">{log.operator_name.charAt(0).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex-1 bg-white dark:bg-[#1c1113] p-3 rounded-xl border border-gray-200 dark:border-[#42292f] shadow-sm hover:shadow-md transition-shadow relative z-20">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2">{log.operator_name}</p>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-mono font-bold whitespace-nowrap bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded shrink-0">
                        {log.action_timestamp ? new Date(String(log.action_timestamp).replace(/(\+00:00|\+00|Z)$/i, '')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-2 break-words leading-tight">
                      applied <span className="font-bold text-[#D32F2F] dark:text-red-400">"{log.action_type}"</span> to <span className="font-semibold text-gray-800 dark:text-gray-200">`{log.document_title}`</span>
                    </p>
                    
                    <div className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 font-mono font-medium bg-gray-50 dark:bg-[#180e10] border border-gray-100 dark:border-gray-800 p-1 rounded max-w-full">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <span className="truncate">{log.office_name || 'Global Core Node'}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {data.liveAuditTrail.length === 0 && (
                <div className="relative z-10 flex flex-col items-center justify-center py-8 bg-white dark:bg-[#1c1113] rounded-xl border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400">No recent transactions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT LANE: DELAY CONGESTION ALERTS */}
        <div className="w-[85vw] sm:w-80 md:w-auto md:flex-1 shrink-0 flex flex-col bg-white dark:bg-[#180e10] rounded-xl border border-gray-200 dark:border-[#42292f] overflow-hidden transition-opacity snap-start">
          <div className="p-3 border-b border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-900/20 shrink-0">
            <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <svg className="w-4 h-4 text-[#D32F2F] dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Congestion Alerts
            </h4>
          </div>

          <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-gray-50/50 dark:bg-[#120b0c]">
            {data.stalledBottlenecks.map((item, index) => (
              <div key={index} className="bg-white dark:bg-[#1c1113] p-3 border-l-4 border-l-[#D32F2F] dark:border-l-red-500 border-y border-r border-gray-200 dark:border-[#42292f] rounded-r-lg shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate pr-2 group-hover:text-[#D32F2F] dark:group-hover:text-red-400 transition-colors">{item.document_title}</span>
                  <span className="text-[9px] bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-[#D32F2F] dark:text-red-300 font-black px-1.5 py-0.5 rounded font-mono whitespace-nowrap shadow-sm shrink-0">
                    +{Math.floor(item.hours_stalled)} HRS
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 flex items-center gap-1 max-w-full">
                    <svg className="w-3 h-3 text-gray-500 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="font-bold text-gray-900 dark:text-white truncate">{item.office_name}</span>
                  </p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-mono font-semibold flex items-center gap-1 bg-gray-50 dark:bg-[#180e10] p-1 rounded border border-gray-100 dark:border-gray-800 max-w-fit">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(item.time_in).toLocaleDateString()} | {new Date(item.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {data.stalledBottlenecks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white dark:bg-[#1c1113] rounded-xl border border-gray-200 dark:border-[#42292f] shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Pipelines Nominal</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}