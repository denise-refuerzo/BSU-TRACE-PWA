import React from 'react';
import { Filter, Search } from 'lucide-react';

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
    <div className="space-y-8 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Documents Pipeline</h2>
        <p className="text-xs text-neutral-500 font-medium mt-0.5">Review and process active administrative requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Incoming Docs', count: expectedIncomingCount, border: 'border-l-blue-500', icon: '📂' },
          { title: 'Awaiting Scan-In', count: awaitingScanInCount, border: 'border-l-red-600', icon: '📥' },
          { title: 'Pending Docs', count: pendingCount, border: 'border-l-amber-500', icon: '🕒' },
          { title: 'Completed Docs', count: completedProcessingCount, border: 'border-l-green-500', icon: '✅' },
          { title: 'In Verification', count: inVerificationCount, border: 'border-l-purple-500', icon: '⚖️' }
        ].map((card, i) => (
          <div key={i} className={`bg-white p-4 rounded-2xl border border-neutral-200 border-l-4 ${card.border} shadow-xs flex items-center justify-between`}>
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider block leading-tight">{card.title}</span>
              <p className="text-2xl font-black text-neutral-900">{String(card.count).padStart(2, '0')}</p>
            </div>
            <div className="text-lg opacity-60 bg-neutral-50 p-2 rounded-xl border">{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <h3 className="text-sm font-black text-neutral-950 tracking-tight">Active Requests</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
              <input type="text" placeholder="Search by document title or ID..." value={search} onChange={e => { setSearch(e.target.value); setPipelinePage(1); }} className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-red-700 bg-neutral-50 w-56 font-medium" />
            </div>
            <div className="flex items-center gap-1 border border-neutral-300 rounded-lg px-2 py-1.5 bg-neutral-50">
              <Filter size={14} className="text-neutral-400" />
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPipelinePage(1); }} className="bg-transparent text-xs outline-none cursor-pointer font-bold text-neutral-600">
                <option value="All">All Statuses</option>
                <option value="Awaiting Scan-In">Awaiting Scan-In</option>
                <option value="Pending">Pending</option>
                <option value="In Verification">In Verification</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Real-time Updates On
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-200 font-black uppercase text-[10px] tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Next Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {currentPipeDocs.map((doc, index) => (
                <tr key={index} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-neutral-950 text-sm leading-tight">{doc.title}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 font-black text-[9px] uppercase rounded">
                      {doc.process_name}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 font-bold ${
                      doc.status?.toLowerCase() === 'completed' ? 'text-green-600' : doc.status?.toLowerCase() === 'in verification' ? 'text-red-600' : 'text-blue-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        doc.status?.toLowerCase() === 'completed' ? 'bg-green-600' : doc.status?.toLowerCase() === 'in verification' ? 'bg-red-600' : 'bg-blue-500'
                      }`}></span>
                      {!doc.time_in ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-600 font-semibold">{doc.next_office || 'None (Final Stop)'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenPipelineDetails(doc, false)} className="text-xs text-red-700 font-black hover:underline px-3 py-1 bg-red-50/50 hover:bg-red-50 rounded-lg transition-all">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPipelineDocs.length === 0 && <div className="p-12 text-center text-neutral-400 font-medium">📭 No active requests in this pipeline matrix view.</div>}
        </div>

        {totalPipePages > 1 && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-xs px-6">
            <span className="text-neutral-500 font-medium">Showing page <b>{pipelinePage}</b> of {totalPipePages}</span>
            <div className="flex gap-1">
              <button disabled={pipelinePage === 1} onClick={() => setPipelinePage(prev => prev - 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-all">Previous</button>
              <button disabled={pipelinePage === totalPipePages} onClick={() => setPipelinePage(prev => prev + 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}