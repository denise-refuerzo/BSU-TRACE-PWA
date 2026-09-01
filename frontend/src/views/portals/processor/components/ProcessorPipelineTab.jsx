import React from 'react';
import { Filter, Search, Inbox, Scan, Clock, CheckCircle, Scale, FileText } from 'lucide-react';

export default function ProcessorPipelineTab({
  expectedIncomingCount,
  awaitingScanInCount,
  pendingCount,
  completedProcessingCount,
  inVerificationCount,
  search,
  setSearch,
  setPipelinePage,
  filterStatus,
  setFilterStatus,
  currentPipeDocs,
  filteredPipelineDocs,
  pipelinePage,
  totalPipePages,
  handleOpenPipelineDetails
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Documents Pipeline</h2>
        <p className="text-sm text-gray-500 mt-1">Review and process active administrative requests across campus stations.</p>
      </div>

      {/* 5 KPI METRICS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Incoming Docs', count: expectedIncomingCount, border: 'border-t-blue-500', icon: <Inbox size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Awaiting Scan-In', count: awaitingScanInCount, border: 'border-t-[#D32F2F]', icon: <Scan size={20} />, color: 'text-[#D32F2F]', bg: 'bg-red-50' },
          { title: 'Pending Docs', count: pendingCount, border: 'border-t-amber-500', icon: <Clock size={20} />, color: 'text-amber-500', bg: 'bg-amber-50' },
          { title: 'Completed Docs', count: completedProcessingCount, border: 'border-t-emerald-500', icon: <CheckCircle size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'In Verification', count: inVerificationCount, border: 'border-t-purple-500', icon: <Scale size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((card, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl border-t-4 ${card.border} border-x border-b border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all transform hover:-translate-y-0.5`}>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block leading-tight">{card.title}</span>
              <p className="text-3xl font-black text-gray-900">{String(card.count).padStart(2, '0')}</p>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.color} shadow-sm shrink-0`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ACTIVE REQUESTS MATRIX TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Active Requests</h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Real-time On
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by title or ID..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPipelinePage(1); }} 
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white font-medium shadow-sm transition-all" 
              />
            </div>

            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setPipelinePage(1); }} 
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none pr-2"
              >
                <option value="All">All Statuses</option>
                <option value="Awaiting Scan-In">Awaiting Scan-In</option>
                <option value="Pending">Pending</option>
                <option value="In Verification">In Verification</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Next Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentPipeDocs.map((doc, index) => {
                const statusLower = doc.status?.toLowerCase();
                const isCompleted = statusLower === 'completed' || doc.time_out;
                const isInVerification = statusLower === 'in verification';

                return (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                          <FileText size={16} className="text-gray-500 group-hover:text-[#D32F2F] transition-colors" />
                        </div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{doc.title}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-red-50 text-[#D32F2F] border border-red-100 font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm">
                        {doc.process_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                        isInVerification ? 'bg-red-50 text-[#D32F2F] border border-red-200' : 
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : 
                          isInVerification ? 'bg-[#D32F2F]' : 
                          'bg-blue-500'
                        }`}></span>
                        {!doc.time_in ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
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
          
          {filteredPipelineDocs.length === 0 && (
            <div className="p-12 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">No active requests</p>
                <p className="text-xs text-gray-500 mt-1">No requests found matching this pipeline matrix view.</p>
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