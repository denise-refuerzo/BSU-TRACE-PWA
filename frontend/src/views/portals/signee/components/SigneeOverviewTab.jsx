import React from 'react';
import { Search, Eye, AlertTriangle, CheckCircle, Clock, CornerUpLeft, FileText, Inbox } from 'lucide-react';

export default function SigneeOverviewTab({
  pendingDocsList,
  signedDocsList,
  verificationDocsList,
  sentBackDocsList,
  search,
  setSearch,
  setDashboardPage,
  currentDashDocs,
  filteredDashDocs,
  dashboardPage,
  totalDashPages,
  handleOpenDetails
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* 4 KPI METRICS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Pending Documents</span>
            <p className="text-3xl font-black text-gray-900">{String(pendingDocsList.length).padStart(2, '0')}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-[#D32F2F] font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> Requires attention
            </span>
            <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg">
              <Clock size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Signed Documents</span>
            <p className="text-3xl font-black text-gray-900">{String(signedDocsList.length).padStart(2, '0')}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle size={12} /> Cleared / Signed
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">In Verification</span>
            <p className="text-3xl font-black text-gray-900">{String(verificationDocsList.length).padStart(2, '0')}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
              <Clock size={12} /> Pending audit detour
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Sent Back</span>
            <p className="text-3xl font-black text-gray-900">{String(sentBackDocsList.length).padStart(2, '0')}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
              <CornerUpLeft size={12} /> Action Required
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CornerUpLeft size={16} />
            </div>
          </div>
        </div>

      </div>

      {/* DOCUMENTS PENDING SIGNATURE TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Documents Pending Signature
          </h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search pending titles..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} 
              className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm transition-all font-medium" 
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Originating Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentDashDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                        <FileText size={16} className="text-gray-500 group-hover:text-[#D32F2F] transition-colors" />
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{doc.title}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-red-50 text-[#D32F2F] border border-red-100 rounded-md font-bold text-[9px] uppercase tracking-wider shadow-sm">
                      {doc.process_name}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-[#D32F2F] border border-red-200 rounded-md font-black text-[10px] uppercase tracking-wider shadow-sm">
                      <span className="w-1.5 h-1.5 bg-[#D32F2F] rounded-full animate-pulse"></span>
                      {doc.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      {doc.originating_office || 'University Unit'}
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
              ))}
            </tbody>
          </table>
          
          {filteredDashDocs.length === 0 && (
            <div className="p-12 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">Signature checklist is empty</p>
                <p className="text-xs text-gray-500 mt-1">There are no pending documents requiring your signature at this time.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalDashPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs">
            <span className="font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{dashboardPage}</span> of <span className="font-bold text-gray-900">{totalDashPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={dashboardPage === 1} 
                onClick={() => setDashboardPage(prev => prev - 1)} 
                className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                Previous
              </button>
              <button 
                disabled={dashboardPage === totalDashPages} 
                onClick={() => setDashboardPage(prev => prev + 1)} 
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