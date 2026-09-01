import React from 'react';
import { User, Building, Car, Landmark, Archive, Search, Filter, Download, FileText, Eye, Folder, Inbox, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Profile Identity Card */}
        <div className="lg:col-span-4 bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black text-[#D32F2F] tracking-wider bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                Institutional Profile
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mt-2 truncate pr-2">{userName}</h2>
            <div className="space-y-2 mt-4">
              <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                <User size={16} className="text-gray-400"/> 
                GSO Administrator
              </p>
              <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                <Building size={16} className="text-gray-400"/> 
                <span className="truncate">{gsoOfficeName}</span>
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button 
              onClick={() => setActiveTab('profile')} 
              className="w-full bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg hover:bg-black transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2"
            >
              <User size={14} />
              Edit Profile
            </button>
          </div>
        </div>

        {/* KPI Metrics List */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Docs', count: pipelineDocs.length, icon: <Folder size={20} strokeWidth={2.5} />, color: 'text-gray-900', border: 'border-t-gray-500', bg: 'bg-gray-50', iconColor: 'text-gray-600' },
            { label: 'Incoming', count: expectedIncomingCount, icon: <Inbox size={20} strokeWidth={2.5} />, color: 'text-blue-600', border: 'border-t-blue-500', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
            { label: 'Pending', count: pendingDocsList.length, icon: <Clock size={20} strokeWidth={2.5} />, color: 'text-amber-500', border: 'border-t-amber-500', bg: 'bg-amber-50', iconColor: 'text-amber-500' },
            { label: 'Action Reqd', count: archivedDocsList.length, icon: <AlertTriangle size={20} strokeWidth={2.5} />, color: 'text-[#D32F2F]', border: 'border-t-[#D32F2F]', bg: 'bg-red-50', iconColor: 'text-[#D32F2F]' },
            { label: 'Completed', count: completedDocsList.length, icon: <CheckCircle size={20} strokeWidth={2.5} />, color: 'text-emerald-600', border: 'border-t-emerald-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' }
          ].map((kpi, idx) => (
            <div key={idx} className={`bg-white border-t-4 ${kpi.border} border-x border-b border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all transform hover:-translate-y-0.5`}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 ${kpi.bg} ${kpi.iconColor} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                  {kpi.icon}
                </div>
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider text-center">{kpi.label}</span>
              </div>
              <p className={`text-3xl font-black text-center mt-3 ${kpi.color}`}>{String(kpi.count).padStart(2, '0')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FACILITY & ASSET COUNTS OVERVIEW */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-4">
          <Archive size={16} className="text-gray-400" />
          Facility & Asset Management Counts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Van Scheduling', val: reservationsList.filter(r => r.booking_type === 'Vehicle').length, icon: <Car size={20} />, bg: 'bg-blue-50', color: 'text-blue-600' },
            { label: 'Gym Reservations', val: reservationsList.filter(r => r.booking_type === 'Gymnasium').length, icon: <Landmark size={20} />, bg: 'bg-orange-50', color: 'text-orange-600' },
            { label: 'Multimedia Reservations', val: reservationsList.filter(r => r.booking_type === 'Room').length, icon: <Building size={20} />, bg: 'bg-purple-50', color: 'text-purple-600' },
            { label: 'Stackable Chairs', val: equipmentInventory.find(i => i.asset_name.toLowerCase().includes('chair'))?.capacity || 0, icon: <Archive size={20} />, bg: 'bg-teal-50', color: 'text-teal-600' },
            { label: 'Folding Tables', val: equipmentInventory.find(i => i.asset_name.toLowerCase().includes('table'))?.capacity || 0, icon: <Archive size={20} />, bg: 'bg-gray-100', color: 'text-gray-600' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow group">
              <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                {item.icon}
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none">{item.val}</p>
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wide mt-1 block leading-tight">
                  {item.label.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UNIFIED GSO MASTER TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              GSO Document Tracking
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Manage and monitor institutional procurement and property documents.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search document title..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} 
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm transition-all font-medium" 
              />
            </div>
            
            <div className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-xs shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setDashboardPage(1); }} 
                className="bg-transparent outline-none cursor-pointer text-gray-700 font-medium appearance-none pr-2"
              >
                <option value="All">All Statuses</option>
                <option value="Incoming">Awaiting Scan-In</option>
                <option value="Pending">Pending Signature</option>
                <option value="Archived">Action Required (Archived)</option>
                <option value="Completed">Completed / Signed</option>
              </select>
            </div>
            
            <button 
              className="flex items-center justify-center border border-gray-300 bg-white p-2 rounded-lg text-gray-600 hover:text-gray-900 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
              title="Export Current View"
            >
              <Download size={16} />
            </button>
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
            <tbody className="divide-y divide-gray-100 font-medium">
              {currentDashDocs.map((doc, idx) => {
                const statusLower = doc.status?.toLowerCase() || '';
                const isIncoming = !doc.time_in;
                const isCompleted = statusLower === 'signed' || doc.time_out;
                const isInVerification = statusLower === 'in verification';

                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                          <FileText size={16} className="text-gray-500 group-hover:text-[#D32F2F] transition-colors" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{doc.title}</p>
                          <span className="text-[10px] text-gray-500">{doc.process_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm">
                        {doc.process_name.includes('APP') ? 'APP-GSO' : doc.process_name.includes('PAR') ? 'PAR-IT' : doc.process_name.includes('ICS') ? 'ICS-SUP' : 'GSO-FRM'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        isIncoming ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                        isInVerification ? 'bg-red-50 text-[#D32F2F] border border-red-200' : 
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isIncoming ? 'bg-blue-500' : 
                          isInVerification ? 'bg-[#D32F2F] animate-pulse' : 
                          isCompleted ? 'bg-emerald-500' : 
                          'bg-amber-500'
                        }`}></span>
                        {isIncoming ? 'Incoming' : doc.time_out ? 'Completed' : doc.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-gray-600">
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
                );
              })}
            </tbody>
          </table>
          
          {filteredMasterDocs.length === 0 && (
            <div className="p-12 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">No documents found</p>
                <p className="text-xs text-gray-500 mt-1">No tracking records match your search or filter criteria.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs px-6">
          <span className="font-medium text-gray-500">
            Showing <span className="font-bold text-gray-900">{currentDashDocs.length}</span> of <span className="font-bold text-gray-900">{filteredMasterDocs.length}</span> records
          </span>
          <div className="flex gap-2">
            <button 
              disabled={dashboardPage === 1} 
              onClick={() => setDashboardPage(prev => prev - 1)} 
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="w-8 h-8 flex items-center justify-center bg-[#D32F2F] text-white font-bold rounded-lg shadow-sm">
              {dashboardPage}
            </span>
            <button 
              disabled={dashboardPage === totalDashPages || totalDashPages === 0} 
              onClick={() => setDashboardPage(prev => prev + 1)} 
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}