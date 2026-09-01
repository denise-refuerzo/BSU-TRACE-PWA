import React from 'react';
import { Filter, Search, Clock, FileText, User } from 'lucide-react';

export default function ProcessorHistoryTab({
  search,
  setSearch,
  setHistoryPage,
  historyFilter,
  setHistoryFilter,
  currentHistoryPageRows,
  filteredHistoryLogs,
  historyPage,
  totalHistoryTabPages,
  handleOpenPipelineDetails
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Office Transaction History</h2>
        <p className="text-sm text-gray-500 mt-1">Audit log of all processing events inside your office sector.</p>
      </div>

      {/* AUDIT TRAIL LEDGER CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Audit Trail Ledger
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by user, title, or ID..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setHistoryPage(1); }} 
                className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white font-medium shadow-sm transition-all" 
              />
            </div>

            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={historyFilter} 
                onChange={e => { setHistoryFilter(e.target.value); setHistoryPage(1); }} 
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none pr-2"
              >
                <option value="All">All Actions</option>
                <option value="Scanned In">Scanned In</option>
                <option value="Scanned Out">Scanned Out</option>
                <option value="Ad-Hoc Detour Routed">Ad-Hoc Detour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Executed By</th>
                <th className="p-4">Document Title</th>
                <th className="p-4 text-center">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentHistoryPageRows.map((log, index) => {
                const rawTimestamp = log.action_timestamp;
                let formattedTime = 'N/A';
                
                if (rawTimestamp) {
                  const localizedString = String(rawTimestamp).replace(/(\+00:00|\+00|Z)$/i, '');
                  const d = new Date(localizedString);
                  
                  formattedTime = d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) + ', ' +
                  d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                }

                const actionType = log.action_type;
                const isScannedIn = actionType === 'Scanned In';
                const isScannedOut = actionType === 'Scanned Out';
                const isAdhoc = actionType === 'Ad-Hoc Detour Routed';

                return (
                  <tr key={log.history_id || index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                        isScannedIn ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        isScannedOut ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isAdhoc ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {actionType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                          {log.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-gray-900">{log.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <FileText size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[280px]">{log.title}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleOpenPipelineDetails(log, true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 hover:text-[#D32F2F] hover:border-red-200 transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredHistoryLogs.length === 0 && (
            <div className="p-12 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm font-bold text-gray-600">No tracking entries match</p>
                <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms or filter rules.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalHistoryTabPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs">
            <span className="font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{historyPage}</span> of <span className="font-bold text-gray-900">{totalHistoryTabPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(prev => prev - 1)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Previous
              </button>
              <button 
                disabled={historyPage === totalHistoryTabPages}
                onClick={() => setHistoryPage(prev => prev + 1)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}