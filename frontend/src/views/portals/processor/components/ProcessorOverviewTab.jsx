import React from 'react';
import { Filter, Search } from 'lucide-react';

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
    <div className="space-y-8 max-w-6xl mx-auto text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">Incoming Documents</span>
          <p className="text-3xl font-black text-neutral-900 mt-2">{String(expectedIncomingCount).padStart(2, '0')}</p>
          <div className="absolute right-4 bottom-4 text-lg opacity-40">📂</div>
          <div className="h-1 bg-blue-600 absolute bottom-0 left-0 right-0"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">Awaiting Scan-In</span>
          <p className="text-3xl font-black text-neutral-900 mt-2">{String(awaitingScanInCount).padStart(2, '0')}</p>
          <div className="absolute right-4 bottom-4 text-lg opacity-40">📥</div>
          <div className="h-1 bg-red-700 absolute bottom-0 left-0 right-0"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">Pending Documents</span>
          <p className="text-3xl font-black text-neutral-900 mt-2">{String(pendingCount).padStart(2, '0')}</p>
          <div className="absolute right-4 bottom-4 text-lg opacity-40">⏳</div>
          <div className="h-1 bg-amber-500 absolute bottom-0 left-0 right-0"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">Completed Documents</span>
          <p className="text-3xl font-black text-neutral-900 mt-2">{String(completedProcessingCount).padStart(2, '0')}</p>
          <div className="absolute right-4 bottom-4 text-lg opacity-40">✅</div>
          <div className="h-1 bg-green-600 absolute bottom-0 left-0 right-0"></div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <h3 className="text-base font-black tracking-tight text-neutral-950">Recent Document Logs</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border border-neutral-300 rounded-lg px-2 py-1.5 bg-neutral-50">
              <Filter size={14} className="text-neutral-400" />
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setDashboardPage(1); }} className="bg-transparent text-xs outline-none cursor-pointer font-bold text-neutral-600">
                <option value="All">All Statuses</option>
                <option value="Awaiting Scan-In">Awaiting Scan-In</option>
                <option value="Pending">Pending</option>
                <option value="In Verification">In Verification</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
              <input type="text" placeholder="Search documents..." value={search} onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-red-700 bg-neutral-50" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-black uppercase text-[10px] tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Next Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {currentDashDocs.map((doc, index) => (
                <tr key={index} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-neutral-900">{doc.title}</p>
                    <span className="text-[10px] text-gray-400">Received recently</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 font-black text-[9px] uppercase rounded">
                      {doc.process_name || 'REGISTRAR FORM'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 font-bold ${doc.status?.toLowerCase() === 'completed' ? 'text-green-600' : 'text-red-700'}`}>
                      • {doc.status || 'Incoming'}
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
          {filteredDocs.length === 0 && <div className="p-12 text-center text-neutral-400">📭 Your office workspace document queue is empty.</div>}
        </div>

        {totalDashPages > 1 && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-xs px-6">
            <span className="text-neutral-500 font-medium">Showing page <b>{dashboardPage}</b> of {totalDashPages}</span>
            <div className="flex gap-1">
              <button disabled={dashboardPage === 1} onClick={() => setDashboardPage(prev => prev - 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-all">Previous</button>
              <button disabled={dashboardPage === totalDashPages} onClick={() => setDashboardPage(prev => prev + 1)} className="px-3 py-1.5 border rounded-lg bg-white font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}