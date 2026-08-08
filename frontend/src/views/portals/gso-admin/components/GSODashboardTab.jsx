import React from 'react';
import { User, Building, Car, Landmark, Archive, Search, Filter, Download, FileText, Eye } from 'lucide-react';

export default function GSODashboardTab({
  userName,
  gsoOfficeName,
  pipelineDocs,
  expectedIncomingCount,
  pendingDocsList,
  archivedDocsList,
  completedDocsList,
  reservationsList,
  equipmentInventory,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  dashboardPage,
  setDashboardPage,
  filteredMasterDocs,
  currentDashDocs,
  totalDashPages,
  handleOpenDetails,
  setActiveTab
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* TOP CARDS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Profile Identity Card */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 p-5 rounded-xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-red-700 tracking-wider">Institutional Profile</span>
          <h2 className="text-xl font-black text-neutral-900 mt-1">{userName}</h2>
          <div className="space-y-1 mt-3">
            <p className="text-xs text-neutral-600 font-bold flex items-center gap-2"><User size={14} className="text-neutral-400"/> GSO Administrator</p>
            <p className="text-xs text-neutral-600 font-bold flex items-center gap-2"><Building size={14} className="text-neutral-400"/> {gsoOfficeName}</p>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setActiveTab('profile')} className="bg-red-800 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-red-900 transition-colors shadow-sm">Edit Profile</button>          </div>
        </div>

        {/* KPI Metrics List */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Documents', count: pipelineDocs.length, icon: '📁', color: 'text-neutral-800' },
            { label: 'Incoming', count: expectedIncomingCount, icon: '📥', color: 'text-blue-600' },
            { label: 'Pending', count: pendingDocsList.length, icon: '⏳', color: 'text-amber-600' },
            { label: 'Action Required', count: archivedDocsList.length, icon: '📦', color: 'text-red-700' },
            { label: 'Completed', count: completedDocsList.length, icon: '✅', color: 'text-green-600' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <div className="text-center w-full flex flex-col items-center">
                <div className="w-10 h-10 bg-neutral-50 border rounded-lg flex items-center justify-center text-lg mb-2">{kpi.icon}</div>
                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider text-center">{kpi.label}</span>
              </div>
              <p className={`text-3xl font-black text-center mt-2 ${kpi.color}`}>{kpi.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FACILITY & ASSET COUNTS OVERVIEW */}
      <div className="mt-2 mb-6">
        <span className="text-[10px] font-black uppercase text-red-700 tracking-wider mb-3 block">Facility & Asset Counts</span>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Car size={20} /></div>
            <div>
              <p className="text-2xl font-black text-neutral-900 leading-none">{reservationsList.filter(r => r.booking_type === 'Vehicle').length}</p>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide mt-1 block leading-tight">Van<br/>Scheduling</span>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Landmark size={20} /></div>
            <div>
              <p className="text-2xl font-black text-neutral-900 leading-none">{reservationsList.filter(r => r.booking_type === 'Gymnasium').length}</p>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide mt-1 block leading-tight">Gym<br/>Reservations</span>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Building size={20} /></div>
            <div>
              <p className="text-2xl font-black text-neutral-900 leading-none">{reservationsList.filter(r => r.booking_type === 'Room').length}</p>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide mt-1 block leading-tight">Multimedia<br/>Reservations</span>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0"><Archive size={20} /></div>
            <div>
              <p className="text-2xl font-black text-neutral-900 leading-none">{equipmentInventory.find(i => i.asset_name.toLowerCase().includes('chair'))?.capacity || 0}</p>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide mt-1 block leading-tight">Stackable<br/>Chairs</span>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0"><Archive size={20} /></div>
            <div>
              <p className="text-2xl font-black text-neutral-900 leading-none">{equipmentInventory.find(i => i.asset_name.toLowerCase().includes('table'))?.capacity || 0}</p>
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide mt-1 block leading-tight">Folding<br/>Tables</span>
            </div>
          </div>
        </div>
      </div>

      {/* UNIFIED GSO MASTER TABLE */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#FDFBF9]">
          <div>
            <h3 className="text-lg font-black text-neutral-900">GSO Document Tracking</h3>
            <p className="text-xs text-neutral-500 font-medium">Manage and monitor institutional procurement and property documents</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={14} />
              <input type="text" placeholder="Search document title..." value={search} onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg outline-none w-64 bg-white shadow-xs focus:ring-1 focus:ring-red-700" />
            </div>
            <div className="flex items-center gap-1 border border-neutral-300 bg-white px-2 py-1.5 rounded-lg text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 transition-colors">
              <Filter size={14} className="text-neutral-500" />
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setDashboardPage(1); }} className="bg-transparent outline-none cursor-pointer text-neutral-700 font-bold">
                <option value="All">All Statuses</option>
                <option value="Incoming">Awaiting Scan-In</option>
                <option value="Pending">Pending Signature</option>
                <option value="Archived">Action Required (Archived)</option>
                <option value="Completed">Completed / Signed</option>
              </select>
            </div>
            <button className="flex items-center justify-center border border-neutral-300 bg-white p-2 rounded-lg text-neutral-700 shadow-xs hover:bg-neutral-50 transition-colors">
              <Download size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-white border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-500 tracking-wider">
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
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-red-700 opacity-80" size={18} />
                      <div>
                        <p className="font-black text-neutral-900 text-sm leading-tight">{doc.title}</p>
                        <span className="text-[10px] text-neutral-400">{doc.process_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-neutral-600">
                    {doc.process_name.includes('APP') ? 'APP-GSO' : doc.process_name.includes('PAR') ? 'PAR-IT' : doc.process_name.includes('ICS') ? 'ICS-SUP' : 'GSO-FRM'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 font-bold ${!doc.time_in ? 'text-blue-600' : doc.status?.toLowerCase() === 'in verification' ? 'text-red-700' : doc.status?.toLowerCase() === 'signed' || doc.time_out ? 'text-green-600' : 'text-amber-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${!doc.time_in ? 'bg-blue-600' : doc.status?.toLowerCase() === 'in verification' ? 'bg-red-700' : doc.status?.toLowerCase() === 'signed' || doc.time_out ? 'bg-green-600' : 'bg-amber-600'}`}></span>
                      {!doc.time_in ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-neutral-600">{doc.originating_office || 'University Unit'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenDetails(doc, false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 inline-flex items-center"><Eye size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMasterDocs.length === 0 && <div className="p-12 text-center text-neutral-400 font-bold">📭 No documents match the criteria.</div>}
        </div>

        <div className="p-4 border-t bg-[#FDFBF9] flex items-center justify-between text-xs font-bold text-neutral-500 px-6">
          <span>Showing {currentDashDocs.length} of {filteredMasterDocs.length} records</span>
          <div className="flex gap-1">
            <button disabled={dashboardPage === 1} onClick={() => setDashboardPage(prev => prev - 1)} className="w-8 h-8 flex items-center justify-center border bg-white rounded-lg disabled:opacity-40 hover:bg-neutral-50">&lt;</button>
            <span className="w-8 h-8 flex items-center justify-center bg-red-800 text-white rounded-lg">{dashboardPage}</span>
            <button disabled={dashboardPage === totalDashPages || totalDashPages === 0} onClick={() => setDashboardPage(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center border bg-white rounded-lg disabled:opacity-40 hover:bg-neutral-50">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}