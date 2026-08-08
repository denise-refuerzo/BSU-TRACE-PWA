import React from 'react';
import { Search, Download, Edit, Car, Building, Landmark, Archive, FileText } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION WITH CENTRALIZED BUTTONS */}
      <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900">Procurement Management</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">Manage physical documents and requirements for reservations.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPrintModal(true)} 
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 border border-neutral-200"
          >
            <Download size={14} /> Master Print Logs
          </button>
          <button 
            onClick={() => setShowChecklistMakerModal(true)} 
            className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Edit size={14} /> Master Checklist
          </button>
        </div>
      </div>

      {/* HELPER FUNCTION TO RENDER RESERVATION TABLES */}
      {[
        { title: 'Vehicle Reservations', icon: <Car size={16} className="text-red-800"/>, data: vehicleData, sKey: 'vehicle' },
        { title: 'Multimedia Room', icon: <Building size={16} className="text-red-800"/>, data: multimediaData, sKey: 'multimedia' },
        { title: 'Gymnasium Reservations', icon: <Landmark size={16} className="text-red-800"/>, data: gymData, sKey: 'gym' }
      ].map((block, idx) => (
        <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              {block.icon} {block.title}
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
                <input type="text" placeholder="Search Requestor..." value={procSearch[block.sKey]} onChange={e => { setProcSearch({...procSearch, [block.sKey]: e.target.value}); setProcPage({...procPage, [block.sKey]: 1}); }} className="pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-neutral-50 outline-none focus:ring-1 focus:ring-red-700 w-48" />
              </div>
              <select value={procFilter[block.sKey]} onChange={e => { setProcFilter({...procFilter, [block.sKey]: e.target.value}); setProcPage({...procPage, [block.sKey]: 1}); }} className="border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-50 outline-none">
                <option value="All">All Status</option>
                <option value="Reserved">Pending / Reserved</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-600 tracking-wider">
                  <th className="p-3 pl-4">Requestor</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {block.data.paginatedData.map((res) => {
                  const dateObj = new Date(res.reservation_date);
                  return (
                    <tr key={res.booking_id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3 pl-4 font-bold text-neutral-900">{res.requestor}</td>
                      <td className="p-3 text-neutral-600 truncate max-w-[150px]">{res.purpose}</td>
                      <td className="p-3 text-neutral-600">
                        <div className="font-bold text-neutral-800">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[10px] text-neutral-500">{res.start_time?.substring(0,5)} - {res.end_time?.substring(0,5)}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide border ${res.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="p-3 text-center pr-4">
                      <button 
                          onClick={() => handleViewChecklist(res)}
                          className="px-3 py-1.5 bg-red-50 text-red-800 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors border border-red-200"
                        >
                          View Checklist
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {block.data.paginatedData.length === 0 && (
                  <tr><td colSpan="5" className="p-6 text-center text-neutral-400 font-bold">No reservations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4 text-xs">
            <span className="text-neutral-500 font-bold">Showing {block.data.paginatedData.length} of {block.data.filteredData.length} records</span>
            <div className="flex gap-1">
              <button disabled={procPage[block.sKey] === 1} onClick={() => setProcPage({...procPage, [block.sKey]: procPage[block.sKey] - 1})} className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50 hover:bg-neutral-50 font-bold text-neutral-600">Prev</button>
              <span className="px-3 py-1 border rounded-lg bg-neutral-100 font-black text-neutral-800">{procPage[block.sKey]} / {block.data.totalPages}</span>
              <button disabled={procPage[block.sKey] === block.data.totalPages} onClick={() => setProcPage({...procPage, [block.sKey]: procPage[block.sKey] + 1})} className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50 hover:bg-neutral-50 font-bold text-neutral-600">Next</button>
            </div>
          </div>
        </div>
      ))}

      {/* 4. LOGISTICS HISTORY */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Archive size={16} className="text-red-800"/> Logistics History
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-neutral-400" size={14} />
              <input type="text" placeholder="Search Asset or Requestor..." value={procSearch.logistics} onChange={e => { setProcSearch({...procSearch, logistics: e.target.value}); setProcPage({...procPage, logistics: 1}); }} className="pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-neutral-50 outline-none focus:ring-1 focus:ring-red-700 w-48" />
            </div>
            <select value={procFilter.logistics} onChange={e => { setProcFilter({...procFilter, logistics: e.target.value}); setProcPage({...procPage, logistics: 1}); }} className="border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-50 outline-none">
              <option value="All">All Types</option>
              <option value="Borrowed">Lending (Borrowed)</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-600 tracking-wider">
                <th className="p-3 pl-4">Asset Name</th>
                <th className="p-3">Requestor</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {logData.paginatedData.map((log) => {
                const dateObj = new Date(log.borrowed_at);
                return (
                  <tr key={log.log_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 pl-4 font-bold text-neutral-900">{log.asset_name}</td>
                    <td className="p-3 text-neutral-600">{log.requestor_name}</td>
                    <td className="p-3 font-bold text-neutral-800">{log.qty_borrowed}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide border ${log.status === 'Returned' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right text-neutral-500 font-mono text-[10px]">
                      {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
              {logData.paginatedData.length === 0 && (
                <tr><td colSpan="5" className="p-6 text-center text-neutral-400 font-bold">No logistics history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4 text-xs">
          <span className="text-neutral-500 font-bold">Showing {logData.paginatedData.length} of {logData.filteredData.length} records</span>
          <div className="flex gap-1">
            <button disabled={procPage.logistics === 1} onClick={() => setProcPage({...procPage, logistics: procPage.logistics - 1})} className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50 hover:bg-neutral-50 font-bold text-neutral-600">Prev</button>
            <span className="px-3 py-1 border rounded-lg bg-neutral-100 font-black text-neutral-800">{procPage.logistics} / {logData.totalPages}</span>
            <button disabled={procPage.logistics === logData.totalPages} onClick={() => setProcPage({...procPage, logistics: procPage.logistics + 1})} className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50 hover:bg-neutral-50 font-bold text-neutral-600">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}