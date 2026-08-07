import React from 'react';
import { Search, Filter, Eye } from 'lucide-react';

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
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-left">
      <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <h3 className="text-sm font-black text-neutral-900">Administrative Tracking Streams</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-neutral-50">
            <Filter size={14} className="text-neutral-400" />
            <select 
              value={filterStatus} 
              onChange={e => { setFilterStatus(e.target.value); setPipelinePage(1); }} 
              className="bg-transparent text-xs outline-none cursor-pointer font-bold text-neutral-600"
            >
              <option value="All">All Status Profiles</option>
              <option value="Pending">Pending Signature</option>
              <option value="Signed">Signed / Completed</option>
              <option value="In Verification">In Audit Verification</option>
              <option value="Action Required">Action Required (Sent Back)</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPipelinePage(1); }} 
              className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none w-56 bg-neutral-50" 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-400 tracking-wider">
              <th className="p-4">Title</th>
              <th className="p-4">Form Type</th>
              <th className="p-4">Pipeline Status</th>
              <th className="p-4">Next Destination</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-medium">
            {currentPipeDocs.map((doc, idx) => (
              <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                <td className="p-4 font-bold text-neutral-900">{doc.title}</td>
                <td className="p-4 font-semibold text-neutral-500">{doc.process_name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 font-bold ${
                    doc.status?.toLowerCase() === 'completed' || doc.status?.toLowerCase() === 'signed' ? 'text-green-600' : doc.status?.toLowerCase() === 'action required' ? 'text-blue-600' : 'text-red-700'
                  }`}>
                    {!doc.time_in ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                  </span>
                </td>
                <td className="p-4 font-semibold text-neutral-500">{doc.next_office || 'Final Stop'}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleOpenDetails(doc, false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-red-800 inline-flex items-center">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPipelineDocs.length === 0 && <div className="p-12 text-center text-neutral-400">📭 No pipeline records match selected criteria filters.</div>}
      </div>

      {totalPipePages > 1 && (
        <div className="p-4 border-t bg-neutral-50 flex items-center justify-between text-xs font-bold text-neutral-500 px-6">
          <span>Showing page {pipelinePage} of {totalPipePages}</span>
          <div className="flex gap-1">
            <button disabled={pipelinePage === 1} onClick={() => setPipelinePage(prev => prev - 1)} className="px-3 py-1.5 border bg-white rounded-lg disabled:opacity-40">Previous</button>
            <button disabled={pipelinePage === totalPipePages} onClick={() => setPipelinePage(prev => prev + 1)} className="px-3 py-1.5 border bg-white rounded-lg disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}