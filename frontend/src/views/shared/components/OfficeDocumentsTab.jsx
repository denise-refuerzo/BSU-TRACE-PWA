import { useEffect, useRef } from 'react';
import { Filter, Search, Inbox, FileText } from 'lucide-react';

export default function OfficeDocumentsTab({
  resolveOfficeStatus,
  search,
  setSearch,
  setPipelinePage,
  filterStatus,
  setFilterStatus,
  currentPipeDocs,
  filteredPipelineDocs,
  pipelineDocs,
  pipelinePage,
  totalPipePages,
  handleOpenPipelineDetails,
  setActiveTab,
  setIsIncomingModalOpen,
  targetDocId = null,
  onClearTargetDocId = null
}) {
  const tableRef = useRef(null);

  // Deep link handler: triggers verification modal and smooth scrolls
  useEffect(() => {
    if (targetDocId && pipelineDocs && pipelineDocs.length > 0) {
      const matched = pipelineDocs.find(d => String(d.ini_id) === String(targetDocId));
      if (matched) {
        handleOpenPipelineDetails(matched, false);
        if (tableRef.current) {
          tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      if (onClearTargetDocId) onClearTargetDocId();
    }
  }, [targetDocId, pipelineDocs, handleOpenPipelineDetails, onClearTargetDocId]);

  const handleFilterChange = (val) => {
    if (val === 'Incoming') {
      if (setActiveTab) setActiveTab('dashboard');
      if (setIsIncomingModalOpen) setIsIncomingModalOpen(true);
      return;
    }
    setFilterStatus(val);
    setPipelinePage(1);
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto text-left animate-in fade-in duration-200">
      
      <p className="text-sm text-gray-500 dark:text-gray-400">Review and process active administrative requests across campus stations.</p>

      {/* ACTIVE REQUESTS MATRIX TABLE */}
      <div 
        ref={tableRef}
        className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl shadow-sm overflow-hidden flex flex-col scroll-mt-6"
      >
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-gray-100 dark:border-[#42292f] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-[#1c1113]">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Active Requests</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by title or ID..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPipelinePage(1); }} 
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white dark:bg-[#1c1113] dark:text-white font-medium shadow-sm transition-all" 
              />
            </div>

            <div className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-[#1c1113] shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => handleFilterChange(e.target.value)} 
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 dark:text-gray-300 appearance-none pr-2"
              >
                <option value="All">All Statuses</option>
                <option value="Incoming">Incoming Docs (Open Modal)</option>
                <option value="Awaiting Scan-In">Awaiting Scan-In</option>
                <option value="Signed">Signed / Ready for Release</option>
                <option value="Action Required">Action Required</option>
                <option value="Pending">Pending Docs</option>
                <option value="In Verification">In Verification</option>
                <option value="Completed">Completed Docs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#2b1317] border-b border-gray-200 dark:border-[#42292f] text-gray-500 dark:text-gray-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Document Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Next Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {currentPipeDocs.map((doc, index) => {
                const isCompleted = Boolean(doc.time_out);
                const isInVerification = resolveOfficeStatus(doc) === 'In Verification';

                return (
                  <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-[#2b1317]/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1c1113] border border-gray-100 dark:border-gray-800 group-hover:bg-white dark:group-hover:bg-[#180e10] group-hover:border-gray-200 dark:group-hover:border-gray-700 group-hover:shadow-sm transition-all">
                          <FileText size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-[#D32F2F] dark:group-hover:text-red-400 transition-colors" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{doc.title}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 border border-red-100 dark:border-red-800 font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm">
                        {doc.process_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 
                        isInVerification ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 
                        'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : 
                          isInVerification ? 'bg-purple-500' : 
                          'bg-amber-500'
                        }`}></span>
                        {resolveOfficeStatus(doc)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {doc.next_office ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {doc.next_office}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">None (Final Stop)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleOpenPipelineDetails(doc, false)} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1c1113] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-[#2b1317] hover:text-[#D32F2F] dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100"
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
          
          {filteredPipelineDocs.length === 0 && (
            <div className="p-12 text-center bg-gray-50 dark:bg-[#1c1113]">
              <div className="flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No active requests</p>
                <p className="text-xs text-gray-500 mt-1">No requests found matching this pipeline matrix view.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPipePages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-[#42292f] flex items-center justify-between bg-white dark:bg-[#180e10] text-xs">
            <span className="font-medium text-gray-500 dark:text-gray-400">
              Showing page <span className="font-bold text-gray-900 dark:text-white">{pipelinePage}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPipePages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={pipelinePage === 1} 
                onClick={() => setPipelinePage(prev => prev - 1)} 
                className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Previous
              </button>
              <button 
                disabled={pipelinePage === totalPipePages} 
                onClick={() => setPipelinePage(prev => prev + 1)} 
                className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
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