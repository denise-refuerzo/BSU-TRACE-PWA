import React from 'react';
import { Filter, Search, Inbox, Scan, Clock, CheckCircle, FileText } from 'lucide-react';

export default function ProcessorOverviewTab({
  expectedIncomingCount,
  awaitingScanInCount,
  pendingCount,
  completedProcessingCount,
  filterStatus,
  setFilterStatus,
  search,
  setSearch,
  setDashboardPage,
  currentDashDocs,
  filteredDocs,
  dashboardPage,
  totalDashPages,
  handleOpenPipelineDetails
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* 4 KPI COUNTERS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Incoming Documents</span>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900">{String(expectedIncomingCount).padStart(2, '0')}</p>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
              <Inbox size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Awaiting Scan-In</span>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900">{String(awaitingScanInCount).padStart(2, '0')}</p>
            <div className="p-3 bg-red-50 rounded-xl text-[#D32F2F]">
              <Scan size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Pending Documents</span>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900">{String(pendingCount).padStart(2, '0')}</p>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
              <Clock size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Completed Documents</span>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900">{String(completedProcessingCount).padStart(2, '0')}</p>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
              <CheckCircle size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>

      </div>

      {/* DOCUMENT LOGS MATRIX TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Recent Document Logs
          </h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] focus-within:border-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setDashboardPage(1); }} 
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none pr-2"
              >
                <option value="All">All Statuses</option>
                <option value="Awaiting Scan-In">Awaiting Scan-In</option>
                <option value="Pending">Pending</option>
                <option value="In Verification">In Verification</option>
              </select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} 
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm transition-all" 
              />
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
                <th className="p-4">Status</th>
                <th className="p-4">Next Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentDashDocs.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                        <FileText size={16} className="text-gray-500 group-hover:text-[#D32F2F] transition-colors" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{doc.title}</p>
                        <span className="text-[10px] text-gray-500 font-medium">Received recently</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-red-50 text-[#D32F2F] border border-red-100 font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm">
                      {doc.process_name || 'REGISTRAR FORM'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      doc.status?.toLowerCase() === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${doc.status?.toLowerCase() === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {doc.status || 'Incoming'}
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
              ))}
              
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-600">Workspace Queue Empty</p>
                      <p className="text-xs text-gray-500 mt-1">Your office workspace currently has no documents in this view.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalDashPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-xs font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{dashboardPage}</span> of <span className="font-bold text-gray-900">{totalDashPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={dashboardPage === 1} 
                onClick={() => setDashboardPage(prev => prev - 1)} 
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Previous
              </button>
              <button 
                disabled={dashboardPage === totalDashPages} 
                onClick={() => setDashboardPage(prev => prev + 1)} 
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
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