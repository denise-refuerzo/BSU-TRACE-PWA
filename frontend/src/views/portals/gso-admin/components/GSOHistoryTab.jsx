import React from 'react';
import { Search, Filter, Eye } from 'lucide-react';

export default function GSOHistoryTab({
  historyFilter,
  setHistoryFilter,
  search,
  setSearch,
  historyPage,
  setHistoryPage,
  currentHistoryPageRows,
  totalHistoryTabPages,
  filteredHistoryLogs,
  handleOpenDetails
}) {
  return (
    <div className="max-w-7xl mx-auto bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-left animate-in fade-in duration-200">
      <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-sm font-black text-neutral-950 tracking-tight">Audit Trail Ledger</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border border-neutral-300 rounded-lg px-2 py-1.5 bg-neutral-50">
            <Filter size={14} className="text-neutral-400" />
            <select value={historyFilter} onChange={e => { setHistoryFilter(e.target.value); setHistoryPage(1); }} className="bg-transparent text-xs outline-none cursor-pointer font-bold text-neutral-600">
              <option value="All">All Actions</option>
              <option value="Scanned In">Scanned In</option>
              <option value="Scanned Out">Scanned Out</option>
              <option value="Approved & Signed">Approved & Signed</option>
              <option value="Ad-Hoc Detour Routed">Ad-Hoc Detour</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
            <input type="text" placeholder="Search history records..." value={search} onChange={e => { setSearch(e.target.value); setHistoryPage(1); }} className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none w-56 bg-neutral-50 font-medium" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-200 font-black uppercase text-[10px] tracking-wider">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Action Event</th>
              <th className="p-4">Executed By</th>
              <th className="p-4">Document Title</th>
              <th className="p-4 text-center">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-medium">
            {currentHistoryPageRows.map((log, index) => {
              const rawTimestamp = log.action_timestamp; 
              let formattedTime = 'N/A';
              
              if (rawTimestamp) {
                const localizedString = String(rawTimestamp).replace(/(\+00:00|\+00|Z)$/i, '');
                const d = new Date(localizedString);
                formattedTime = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              }

              return (
                <tr key={log.history_id || index} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="p-4 font-mono text-neutral-600">{formattedTime}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                      log.action_type === 'Scanned In' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                      log.action_type === 'Scanned Out' ? 'bg-green-50 text-green-800 border-green-100' :
                      log.action_type === 'Ad-Hoc Detour Routed' ? 'bg-purple-50 text-purple-800 border-purple-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                    }`}>{log.action_type}</span>
                  </td>
                  <td className="p-4 text-neutral-900 font-bold">{log.full_name}</td>
                  <td className="p-4 text-neutral-700 font-semibold">{log.title}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenDetails(log, true)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-red-800 inline-flex items-center"><Eye size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredHistoryLogs.length === 0 && <div className="p-12 text-center text-neutral-400 font-medium">📜 No logging entries match criteria filters.</div>}
      </div>

      {totalHistoryTabPages > 1 && (
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs px-6">
          <span className="text-neutral-500 font-medium">Showing page <b>{historyPage}</b> of {totalHistoryTabPages}</span>
          <div className="flex gap-1">
            <button disabled={historyPage === 1} onClick={() => setHistoryPage(prev => prev - 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40">Previous</button>
            <button disabled={historyPage === totalHistoryTabPages} onClick={() => setHistoryPage(prev => prev + 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}