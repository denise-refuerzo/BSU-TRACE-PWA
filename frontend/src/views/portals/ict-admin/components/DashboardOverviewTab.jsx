import React from 'react';

export default function DashboardOverviewTab({ data }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-900">Operations Control Center</h2>
        <p className="text-xs text-gray-500">Real-time telemetry monitoring background data pipelines, traffic flows, and operational backlogs.</p>
      </div>

      {/* VITAL COUNTERS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Active Document Tracks</p>
            <h3 className="text-2xl font-black mt-1 text-neutral-900">{data.counters.activeTracks}</h3>
          </div>
          <span className="text-2xl p-2 bg-red-50 rounded-xl">📄</span>
        </div>
        <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Registered Personnel</p>
            <h3 className="text-2xl font-black mt-1 text-neutral-900">{data.counters.systemUsers}</h3>
          </div>
          <span className="text-2xl p-2 bg-blue-50 rounded-xl">👥</span>
        </div>
        <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Workflow Blueprints</p>
            <h3 className="text-2xl font-black mt-1 text-neutral-900">{data.counters.workflowBlueprints}</h3>
          </div>
          <span className="text-2xl p-2 bg-purple-50 rounded-xl">🗺️</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: LIVE STREAM AUDIT LOG FEED */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live System-Wide Audit Stream Feed
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Real-time rolling ledger tracing pipeline checkpoints and structural user actions campus-wide.</p>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar divide-y divide-neutral-100">
            {data.liveAuditTrail.map((log) => (
              <div key={log.history_id} className="pt-2.5 first:pt-0 flex justify-between items-start text-xs font-semibold">
                <div className="space-y-0.5 max-w-[75%]">
                  <p className="text-neutral-900 font-bold">
                    {log.operator_name} applied <span className="text-red-800">"{log.action_type}"</span>
                  </p>
                  <p className="text-[11px] text-gray-500 font-normal">
                    Document: <span className="font-semibold text-neutral-700">`{log.document_title}`</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono font-normal">🏬 Location Block: {log.office_name || 'Global Core Node'}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono font-normal whitespace-nowrap">
                  {log.action_timestamp
                    ? new Date(String(log.action_timestamp).replace(/(\+00:00|\+00|Z)$/i, '')).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true // Kept true to match your working block's format
                      })
                    : 'N/A'}
                </span>
              </div>
            ))}
            {data.liveAuditTrail.length === 0 && (
              <p className="text-center text-xs italic text-gray-400 py-8">No transaction execution records have logged across network clusters today.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DELAY CONGESTION ALERTS PANEL */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-black tracking-wider text-red-800 uppercase flex items-center gap-1.5">🚨 Stalled Queue Congestion Alerts</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Identifies critical workflows sitting inside an office destination past 48 hours without release scans.</p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar">
            {data.stalledBottlenecks.map((item, index) => (
              <div key={index} className="p-3 bg-red-50/60 border border-red-100 rounded-xl space-y-1 animate-pulse">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-900 font-bold text-xs truncate max-w-[70%]">{item.document_title}</span>
                  <span className="text-[9px] bg-red-700 text-white font-black px-1.5 py-0.5 rounded font-mono">
                    +{Math.floor(item.hours_stalled)} HOURS
                  </span>
                </div>
                <p className="text-[10px] text-red-900 font-medium">Stuck at: <span className="font-bold underline">{item.office_name}</span></p>
                <p className="text-[9px] text-neutral-400 font-normal font-mono">Arrived: {new Date(item.time_in).toLocaleDateString()} | {new Date(item.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
            {data.stalledBottlenecks.length === 0 && (
              <div className="text-center py-8 bg-emerald-50/40 border border-emerald-100 rounded-xl p-4">
                <span className="text-xl block mb-1">✅</span>
                <p className="text-xs font-bold text-emerald-800 uppercase">Pipelines Nominal</p>
                <p className="text-[10px] text-emerald-600 font-normal mt-0.5">Zero tracking files currently breach operational turnaround velocity schedules.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}