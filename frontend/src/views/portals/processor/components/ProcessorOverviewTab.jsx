import React from 'react';
import { Search, Inbox, Scan, Clock, CheckCircle, Scale, FileText, Filter } from 'lucide-react';

export default function ProcessorOverviewTab({
  signedCount, sentBackCount,
  profileName,
  processorOfficeName,
  expectedIncomingCount,
  awaitingScanInCount,
  pendingCount,
  completedProcessingCount,
  inVerificationCount,
  setIsIncomingModalOpen,
  filterStatus,
  setFilterStatus,
  search,
  setSearch,
  setDashboardPage,
  currentDashDocs,
  filteredDocs,
  dashboardPage,
  totalDashPages,
  handleRowDocumentClick,
  resolveOfficeStatus,
  setActiveTab
}) {
<<<<<<< HEAD
  const filterKpiCards = [
    {label:'Ready for Release',filterKey:'Signed',val:signedCount,color:'text-blue-600',border:'border-t-blue-600',icon:<CheckCircle size={18}/>},
    {label:'Sent Back',filterKey:'Action Required',val:sentBackCount,color:'text-red-800',border:'border-t-red-800',icon:<FileText size={18}/>},
    { label: 'Awaiting Scan-In', filterKey: 'Awaiting Scan-In', val: awaitingScanInCount, color: 'text-[#D32F2F]', border: 'border-t-[#D32F2F]', icon: <Scan size={18} /> },
    { label: 'Pending Docs', filterKey: 'Pending', val: pendingCount, color: 'text-amber-500', border: 'border-t-amber-500', icon: <Clock size={18} /> },
    { label: 'In Verification', filterKey: 'In Verification', val: inVerificationCount, color: 'text-purple-600', border: 'border-t-purple-500', icon: <Scale size={18} /> },
    { label: 'Completed Docs', filterKey: 'Completed', val: completedProcessingCount, color: 'text-emerald-600', border: 'border-t-emerald-500', icon: <CheckCircle size={18} /> }
=======
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  
  // Kanban columns definition
  const kanbanColumns = [
    { id: 'Awaiting Scan-In', label: 'Awaiting Scan-In', count: awaitingScanInCount, color: 'border-t-[#D32F2F]', text: 'text-[#D32F2F]', bg: 'bg-red-50', icon: <Scan size={16} /> },
    { id: 'Pending', label: 'Pending Docs', count: pendingCount, color: 'border-t-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock size={16} /> },
    { id: 'In Verification', label: 'In Verification', count: inVerificationCount, color: 'border-t-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', icon: <Scale size={16} /> },
    { id: 'Signed', label: 'Ready for Release', count: signedCount, color: 'border-t-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle size={16} /> },
    { id: 'Action Required', label: 'Sent Back', count: sentBackCount, color: 'border-t-red-800', text: 'text-red-800', bg: 'bg-red-50', icon: <AlertCircle size={16} /> }
>>>>>>> parent of f29a6a1 (UI/UX modifications)
  ];

  const handleKpiFilterClick = (filterKey) => {
    setFilterStatus(prev => prev === filterKey ? 'All' : filterKey);
    setDashboardPage(1);
  };

  return (
<<<<<<< HEAD
    <div className="space-y-6 max-w-8xl mx-auto text-left animate-in fade-in duration-200 pb-12 sm:pb-6">
=======
    // Used dvh for better mobile browser support (accounts for mobile URL bars)
    <div className="space-y-4 max-w-full mx-auto text-left animate-in fade-in duration-200 h-[calc(100dvh-100px)] flex flex-col overflow-hidden pb-2 md:pb-4">
>>>>>>> parent of f29a6a1 (UI/UX modifications)
      
      {/* PROFILE + KPI SECTION */}
      <div className="flex flex-col xl:flex-row gap-4">
        
<<<<<<< HEAD
        {/* Institutional Profile Card */}
        <div className="w-full xl:w-80 bg-white p-5 rounded-2xl border-t-4 border-t-blue-600 border-x border-b border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Institutional Profile
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 truncate pr-1">{profileName || 'Office Processor'}</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1.5 truncate">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Processor / {processorOfficeName || 'HRMO'}
            </p>
=======
        {/* Profile Card */}
        <div className="flex-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex flex-col items-start min-w-0">
            <h3 className="text-lg font-black text-gray-900 leading-tight truncate w-full">{profileName || 'Office Processor'}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5 truncate w-full">Processor / {processorOfficeName || 'HRMO'}</p>
            <button 
              onClick={() => setActiveTab('profile')} 
              className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-[11px] font-bold hover:bg-black transition-colors shrink-0 whitespace-nowrap"
            >
              View Profile &rarr;
            </button>
>>>>>>> parent of f29a6a1 (UI/UX modifications)
          </div>
          <button 
            onClick={() => setActiveTab('profile')} 
            className="mt-4 px-4 py-2 w-max bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[38px]"
          >
            View Profile &rarr;
          </button>
        </div>

<<<<<<< HEAD
        {/* 5 KPI Metric Counters */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Card 1: Incoming Docs (Triggers Modal Directly) */}
          <div 
            onClick={() => setIsIncomingModalOpen(true)}
            className="bg-white p-3.5 sm:p-4 rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm text-center flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 hover:shadow-md hover:border-blue-300"
=======
        {/* KPI Cards: Grid cols-2 on mobile so they sit side-by-side, flex on desktop */}
        <div className="grid grid-cols-2 md:flex gap-4 shrink-0">
          {/* Incoming KPI Card */}
          <div 
            onClick={() => setIsIncomingModalOpen(true)}
            className="w-full md:w-40 lg:w-90 bg-white p-3 rounded-xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
>>>>>>> parent of f29a6a1 (UI/UX modifications)
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIsIncomingModalOpen(true)}
          >
<<<<<<< HEAD
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider block leading-tight truncate">
                Incoming Docs
              </span>
              <span className="text-blue-500 hidden sm:block"><Inbox size={18} /></span>
            </div>
            <p className="text-2xl sm:text-3xl font-black my-0.5 text-blue-600">
              {String(expectedIncomingCount ?? 0).padStart(2, '0')}
            </p>
            <span className="text-[8px] sm:text-[9px] font-bold text-blue-600 uppercase tracking-tight">
              View Modal &rarr;
            </span>
          </div>

          {/* Cards 2-5: Interactive Table Filters */}
          {filterKpiCards.map((kpi, idx) => {
            const isSelected = filterStatus === kpi.filterKey;
            return (
              <div 
                key={idx}
                onClick={() => handleKpiFilterClick(kpi.filterKey)}
                className={`bg-white p-3.5 sm:p-4 rounded-2xl border-t-4 ${kpi.border} border-x border-b shadow-sm text-center flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 touch-manipulation ${
                  isSelected 
                    ? 'ring-2 ring-neutral-800 border-b-neutral-400 bg-neutral-50/80 shadow-md' 
                    : 'border-gray-200 hover:shadow-md'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleKpiFilterClick(kpi.filterKey)}
=======
            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
              <Inbox size={16} className="text-blue-500 shrink-0" />
              <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">Incoming Docs</span>
            </div>
            <p className="text-2xl font-black text-blue-600">{String(expectedIncomingCount || 0).padStart(2, '0')}</p>
            <span className="text-[9px] font-bold text-blue-600 mt-1 uppercase tracking-tight">Scan Incoming &rarr;</span>
          </div>

          {/* Completed KPI Card */}
          <div 
            onClick={() => setIsCompletedModalOpen(true)}
            className="w-full md:w-40 lg:w-90 bg-white p-3 rounded-xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">Completed Docs</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">{String(completedProcessingCount || 0).padStart(2, '0')}</p>
            <span className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-tight">View Archive &rarr;</span>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {/* overflow-x-auto and snap-x added for mobile swiping */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory custom-scrollbar pb-2">
        {kanbanColumns.map((col) => {
          const columnDocs = getDocsByStatus(col.id);
          const isFiltered = filterStatus !== 'All' && filterStatus !== col.id;

          return (
            // w-[85vw] makes it take up most of the mobile screen to allow swiping. md:flex-1 resets it for desktop.
            <div 
              key={col.id} 
              className={`w-[85vw] sm:w-80 md:w-auto md:flex-1 shrink-0 flex flex-col bg-gray-50/80 rounded-xl border border-gray-200 overflow-hidden transition-opacity snap-start ${isFiltered ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
            >
              {/* Column Header */}
              <div 
                onClick={() => { setFilterStatus(prev => prev === col.id ? 'All' : col.id); setDashboardPage(1); }}
                className={`p-3 border-b border-gray-200 bg-white border-t-4 ${col.color} flex justify-between items-center shrink-0 cursor-pointer hover:bg-gray-50 transition-colors`}
>>>>>>> parent of f29a6a1 (UI/UX modifications)
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider block leading-tight truncate">
                    {kpi.label}
                  </span>
                  <span className="text-gray-400 hidden sm:block">{kpi.icon}</span>
                </div>
                <p className={`text-2xl sm:text-3xl font-black my-0.5 ${kpi.color}`}>
                  {String(kpi.val ?? 0).padStart(2, '0')}
                </p>
                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-tight ${isSelected ? 'text-neutral-600' : 'text-transparent'}`}>
                  Active Filter
                </span>
              </div>
<<<<<<< HEAD
            );
          })}
        </div>

      </div>

      {/* DOCUMENT LOGS MATRIX TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" />
              Recent Document Logs
            </h3>
            {filterStatus !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-200 text-neutral-800">
                <Filter size={10} /> {filterStatus}
                <button 
                  onClick={() => setFilterStatus('All')} 
                  className="ml-1 hover:text-red-600 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setDashboardPage(1); }} 
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm" 
            />
=======

              {/* Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {columnDocs.length > 0 ? (
                  columnDocs.map((doc, idx) => (
                    <div 
                      key={doc.ini_id || idx}
                      onClick={() => handleRowDocumentClick(doc)}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h5>
                        <FileText size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      </div>
                      
                      <span className="w-max px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 font-bold text-[9px] uppercase tracking-wider rounded">
                        {doc.process_name || 'GENERAL FORM'}
                      </span>
                      
                      <div className="pt-2 border-t border-gray-100 mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium">Next:</span>
                        <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px]">
                          {doc.next_office || 'None (Final)'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50 py-8">
                    {col.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Pagination */}
      {totalDashPages > 1 && (
        <div className="bg-white p-2.5 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm">
          <span className="text-xs text-gray-500 font-medium px-2 text-center sm:text-left">
            Dataset Page <span className="font-bold text-gray-900">{dashboardPage}</span> of <span className="font-bold text-gray-900">{totalDashPages}</span>
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              disabled={dashboardPage === 1} 
              onClick={() => setDashboardPage(prev => prev - 1)} 
              className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-bold text-gray-700 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button 
              disabled={dashboardPage === totalDashPages} 
              onClick={() => setDashboardPage(prev => prev + 1)} 
              className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-bold text-gray-700 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
>>>>>>> parent of f29a6a1 (UI/UX modifications)
          </div>
        </div>

        {/* Responsive Table Scroll Container */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[580px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-3 sm:p-4">Title</th>
                <th className="p-3 sm:p-4">Form Type</th>
                <th className="p-3 sm:p-4">Office Status</th>
                <th className="p-3 sm:p-4">Next Office</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentDashDocs.map((doc, index) => {
                const officeStatus = resolveOfficeStatus ? resolveOfficeStatus(doc) : (doc.status || 'Pending');
                const isCompleted = officeStatus === 'Completed';
                const isInVerification = officeStatus === 'In Verification';
                const isAwaiting = officeStatus === 'Awaiting Scan-In';

                return (
                  <tr 
                    key={doc.ini_id || index} 
                    onClick={() => handleRowDocumentClick(doc)}
                    className="hover:bg-red-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-all shrink-0">
                          <FileText size={15} className="text-gray-500 group-hover:text-[#D32F2F]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-[#D32F2F] transition-colors truncate text-xs sm:text-sm">{doc.title}</p>
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium block truncate">Received recently</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-red-50 text-[#D32F2F] border border-red-100 font-bold text-[9px] uppercase tracking-wider rounded-md">
                        {doc.process_name || 'GENERAL FORM'}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                        isCompleted 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : isInVerification
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : isAwaiting
                              ? 'bg-red-50 text-[#D32F2F] border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-emerald-500' : isInVerification ? 'bg-purple-500' : isAwaiting ? 'bg-[#D32F2F]' : 'bg-amber-500'
                        }`}></span>
                        {officeStatus}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                      {doc.next_office || <span className="text-gray-400 italic">None (Final Stop)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalDashPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs">
            <span className="text-gray-500">
              Page <span className="font-bold text-gray-900">{dashboardPage}</span> of <span className="font-bold text-gray-900">{totalDashPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={dashboardPage === 1} 
                onClick={() => setDashboardPage(prev => prev - 1)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[36px]"
              >
                Previous
              </button>
              <button 
                disabled={dashboardPage === totalDashPages} 
                onClick={() => setDashboardPage(prev => prev + 1)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[36px]"
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