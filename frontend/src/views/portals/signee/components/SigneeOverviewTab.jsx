import React from 'react';
import { Search, Eye } from 'lucide-react';

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
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 border-l-4 border-l-red-600 shadow-sm">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider block">Pending Documents</span>
          <p className="text-2xl font-black text-neutral-900 mt-1">{String(pendingDocsList.length).padStart(2, '0')}</p>
          <span className="text-[10px] text-red-600 font-bold mt-1 block">⚠️ Requires attention</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 border-l-4 border-l-green-600 shadow-sm">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider block">Signed Documents</span>
          <p className="text-2xl font-black text-neutral-900 mt-1">{String(signedDocsList.length).padStart(2, '0')}</p>
          <span className="text-[10px] text-green-600 font-bold mt-1 block">✓ Cleared / Signed</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 border-l-4 border-l-amber-500 shadow-sm">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider block">In Verification</span>
          <p className="text-2xl font-black text-neutral-900 mt-1">{String(verificationDocsList.length).padStart(2, '0')}</p>
          <span className="text-[10px] text-amber-600 font-bold mt-1 block">🕒 Pending audit detour</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 border-l-4 border-l-blue-600 shadow-sm">
          <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider block">Sent Back</span>
          <p className="text-2xl font-black text-neutral-900 mt-1">{String(sentBackDocsList.length).padStart(2, '0')}</p>
          <span className="text-[10px] text-blue-600 font-bold mt-1 block">↩ Action Required</span>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-black text-neutral-900">Documents Pending Signature</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
            <input 
              type="text" 
              placeholder="Search pending titles..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} 
              className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none w-64 bg-neutral-50" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FFFDFB] border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-400 tracking-wider">
                <th className="p-4">Title</th>
                <th className="p-4">Form Type</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Originating Office</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {currentDashDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4 font-bold text-neutral-900">{doc.title}</td>
                  <td className="p-4 font-semibold text-neutral-500">{doc.process_name}</td>
                  <td className="p-4"><span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded font-black text-[9px] uppercase tracking-wider">• {doc.status || 'Pending'}</span></td>
                  <td className="p-4 font-semibold text-neutral-600">{doc.originating_office || 'University Unit'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenDetails(doc, false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-red-800 inline-flex items-center">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDashDocs.length === 0 && <div className="p-12 text-center text-neutral-400">📭 Signature checklist is empty.</div>}
        </div>

        {totalDashPages > 1 && (
          <div className="p-4 border-t bg-neutral-50 flex items-center justify-between text-xs font-bold text-neutral-500 px-6">
            <span>Showing page {dashboardPage} of {totalDashPages}</span>
            <div className="flex gap-1">
              <button disabled={dashboardPage === 1} onClick={() => setDashboardPage(prev => prev - 1)} className="px-3 py-1.5 border bg-white rounded-lg disabled:opacity-40">Previous</button>
              <button disabled={dashboardPage === totalDashPages} onClick={() => setDashboardPage(prev => prev + 1)} className="px-3 py-1.5 border bg-white rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}