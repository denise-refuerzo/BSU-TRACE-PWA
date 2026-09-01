import React from 'react';
import { Search, Filter, Eye, FileText, Inbox } from 'lucide-react';

export default function SigneeDocumentsTab({
  filterStatus,
  setFilterStatus,
  setPipelinePage,
  search,
  setSearch,
  currentPipeDocs,
  filteredPipelineDocs,
  pipelinePage,
  totalPipePages,
  handleOpenDetails
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* ADMINISTRATIVE TRACKING STREAMS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Administrative Tracking Streams
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setPipelinePage(1); }}
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none pr-2"
              >
                <option value="All">All Status Profiles</option>
                <option value="Pending">Pending Signature</option>
                <option value="Signed">Signed / Completed</option>
                <option value="In Verification">In Audit Verification</option>
                <option value="Action Required">Action Required (Sent Back)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPipelinePage(1); }}
                className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white font-medium shadow-sm transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Pipeline Status</th>
                <th className="p-4">Next Destination</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentPipeDocs.map((doc, idx) => {
                const statusLower = doc.status?.toLowerCase();
                const isCompletedOrSigned = statusLower === 'completed' || statusLower === 'signed';
                const isActionRequired = statusLower === 'action required';

                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                          <FileText size={16} className="text-gray-500 group-hover:text-[#D32F2F] transition-colors" />
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{doc.title}</p>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-gray-600">{doc.process_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        isCompletedOrSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                        isActionRequired ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                        'bg-red-50 text-[#D32F2F] border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCompletedOrSigned ? 'bg-emerald-500' : 
                          isActionRequired ? 'bg-blue-500' : 
                          'bg-[#D32F2F] animate-pulse'
                        }`}></span>
                        {!doc.time_in ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {doc.next_office || 'Final Stop'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleOpenDetails(doc, false)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 hover:text-[#D32F2F] hover:border-red-200 transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredPipelineDocs.length === 0 && (
            <div className="p-12 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">No pipeline records match</p>
                <p className="text-xs text-gray-500 mt-1">No active items match your selected criteria filters.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPipePages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs">
            <span className="font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{pipelinePage}</span> of <span className="font-bold text-gray-900">{totalPipePages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={pipelinePage === 1}
                onClick={() => setPipelinePage(prev => prev - 1)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Previous
              </button>
              <button 
                disabled={pipelinePage === totalPipePages}
                onClick={() => setPipelinePage(prev => prev + 1)}
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