import React from 'react';
import { Search, Download, Edit, Car, Building, Landmark, Archive, FileText, Filter, Inbox, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';

export default function GSOProcurementTab({
  vehicleData,
  multimediaData,
  gymData,
  logData,
  procSearch,
  setProcSearch,
  procFilter,
  setProcFilter,
  procPage,
  setProcPage,
  setShowPrintModal,
  setShowChecklistMakerModal,
  handleViewChecklist
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION WITH CENTRALIZED BUTTONS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Procurement Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage physical documents, checklists, and requirements for reservations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowPrintModal(true)} 
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wide rounded-lg shadow-sm transition-all border border-gray-300 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer"
          >
            <Download size={16} strokeWidth={2.5} /> Master Print Logs
          </button>
          <button 
            onClick={() => setShowChecklistMakerModal(true)} 
            className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs uppercase tracking-wide rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <Edit size={16} strokeWidth={2.5} /> Master Checklist
          </button>
        </div>
      </div>

      {/* HELPER FUNCTION TO RENDER RESERVATION TABLES */}
      {[
        { title: 'Vehicle Reservations', icon: <Car size={18} />, data: vehicleData, sKey: 'vehicle', border: 'border-t-blue-500', iconColor: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Multimedia Room', icon: <Building size={18} />, data: multimediaData, sKey: 'multimedia', border: 'border-t-purple-500', iconColor: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Gymnasium Reservations', icon: <Landmark size={18} />, data: gymData, sKey: 'gym', border: 'border-t-orange-500', iconColor: 'text-orange-600', bg: 'bg-orange-50' }
      ].map((block, idx) => (
        <div key={idx} className={`bg-white border-t-4 ${block.border} border-x border-b border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden`}>
          
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${block.bg} ${block.iconColor} shadow-sm`}>
                {block.icon}
              </div>
              {block.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search Requestor..." 
                  value={procSearch[block.sKey]} 
                  onChange={e => { setProcSearch({...procSearch, [block.sKey]: e.target.value}); setProcPage({...procPage, [block.sKey]: 1}); }} 
                  className="pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] shadow-sm transition-all w-full sm:w-56 font-medium" 
                />
              </div>
              <div className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-xs shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={procFilter[block.sKey]} 
                  onChange={e => { setProcFilter({...procFilter, [block.sKey]: e.target.value}); setProcPage({...procPage, [block.sKey]: 1}); }} 
                  className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer appearance-none pr-2"
                >
                  <option value="All">All Status</option>
                  <option value="Reserved">Pending / Reserved</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                  <th className="p-4">Requestor</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {block.data.paginatedData.map((res) => {
                  const dateObj = new Date(res.reservation_date);
                  return (
                    <tr key={res.booking_id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {res.requestor?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-gray-900">{res.requestor}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 truncate max-w-[200px]" title={res.purpose}>
                        {res.purpose}
                      </td>
                      <td className="p-4 text-gray-600">
                        <div className="font-bold text-gray-900">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                          {res.start_time?.substring(0,5)} - {res.end_time?.substring(0,5)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                          res.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${res.status === 'Confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {res.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleViewChecklist(res)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 hover:text-[#D32F2F] hover:border-red-200 transition-all text-[11px] shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100 mx-auto"
                        >
                          <CheckSquare size={14} />
                          View Checklist
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {block.data.paginatedData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center bg-gray-50">
                      <div className="flex flex-col items-center justify-center">
                        <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-600">No reservations found</p>
                        <p className="text-xs text-gray-500 mt-1">Adjust your search or filter criteria to find specific records.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {block.data.totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-white text-xs">
              <span className="text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{block.data.paginatedData.length}</span> of <span className="font-bold text-gray-900">{block.data.filteredData.length}</span> records
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={procPage[block.sKey] === 1} 
                  onClick={() => setProcPage({...procPage, [block.sKey]: procPage[block.sKey] - 1})} 
                  className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-sm cursor-pointer transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 font-black text-gray-900 shadow-inner">
                  {procPage[block.sKey]} / {block.data.totalPages}
                </span>
                <button 
                  disabled={procPage[block.sKey] === block.data.totalPages} 
                  onClick={() => setProcPage({...procPage, [block.sKey]: procPage[block.sKey] + 1})} 
                  className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-sm cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* LOGISTICS HISTORY (Matches style of mapped blocks above) */}
      <div className="bg-white border-t-4 border-t-teal-500 border-x border-b border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 shadow-sm">
              <Archive size={18} />
            </div>
            Logistics History
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search Asset or Requestor..." 
                value={procSearch.logistics} 
                onChange={e => { setProcSearch({...procSearch, logistics: e.target.value}); setProcPage({...procPage, logistics: 1}); }} 
                className="pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] shadow-sm transition-all w-full sm:w-56 font-medium" 
              />
            </div>
            <div className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-xs shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={procFilter.logistics} 
                onChange={e => { setProcFilter({...procFilter, logistics: e.target.value}); setProcPage({...procPage, logistics: 1}); }} 
                className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer appearance-none pr-2"
              >
                <option value="All">All Types</option>
                <option value="Borrowed">Lending (Borrowed)</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                <th className="p-4">Asset Name</th>
                <th className="p-4">Requestor</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {logData.paginatedData.map((log) => {
                const dateObj = new Date(log.borrowed_at);
                return (
                  <tr key={log.log_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-gray-900">{log.asset_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{log.requestor_name}</td>
                    <td className="p-4 font-black text-gray-900">{log.qty_borrowed}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                        log.status === 'Returned' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-500 font-mono text-[11px] bg-gray-50/30">
                      {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
              {logData.paginatedData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-10 text-center bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <Archive className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-600">No logistics history found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {logData.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-white text-xs">
            <span className="text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{logData.paginatedData.length}</span> of <span className="font-bold text-gray-900">{logData.filteredData.length}</span> records
            </span>
            <div className="flex gap-2">
              <button 
                disabled={procPage.logistics === 1} 
                onClick={() => setProcPage({...procPage, logistics: procPage.logistics - 1})} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-sm cursor-pointer transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 font-black text-gray-900 shadow-inner">
                {procPage.logistics} / {logData.totalPages}
              </span>
              <button 
                disabled={procPage.logistics === logData.totalPages} 
                onClick={() => setProcPage({...procPage, logistics: procPage.logistics + 1})} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-sm cursor-pointer transition-colors"
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