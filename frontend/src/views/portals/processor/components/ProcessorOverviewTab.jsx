import React, { useState } from 'react';
import { Inbox, Scan, Clock, CheckCircle, Scale, FileText, AlertCircle } from 'lucide-react';
import CompletedDocumentsModal from '../../../shared/modals/CompletedDocumentsModal'; 

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
  setDashboardPage,
  currentDashDocs,
  filteredDocs,
  dashboardPage,
  totalDashPages,
  handleRowDocumentClick,
  resolveOfficeStatus,
  setActiveTab
}) {
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  
  // Kanban columns definition
  const kanbanColumns = [
    { id: 'Awaiting Scan-In', label: 'Awaiting Scan-In', count: awaitingScanInCount, color: 'border-t-[#D32F2F]', text: 'text-[#D32F2F]', bg: 'bg-red-50', icon: <Scan size={16} /> },
    { id: 'Pending', label: 'Pending Docs', count: pendingCount, color: 'border-t-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock size={16} /> },
    { id: 'In Verification', label: 'In Verification', count: inVerificationCount, color: 'border-t-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', icon: <Scale size={16} /> },
    { id: 'Signed', label: 'Ready for Release', count: signedCount, color: 'border-t-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle size={16} /> },
    { id: 'Action Required', label: 'Sent Back', count: sentBackCount, color: 'border-t-red-800', text: 'text-red-800', bg: 'bg-red-50', icon: <AlertCircle size={16} /> }
  ];

  // Group documents by their resolved status
  const getDocsByStatus = (status) => {
    return (filteredDocs || []).filter(doc => {
      const docStatus = resolveOfficeStatus ? resolveOfficeStatus(doc) : (doc.status || 'Pending');
      return docStatus === status;
    });
  };

  const completedDocs = getDocsByStatus('Completed');

  return (
    // Used dvh for better mobile browser support (accounts for mobile URL bars)
    <div className="space-y-4 max-w-full mx-auto text-left animate-in fade-in duration-200 h-[calc(100dvh-100px)] flex flex-col overflow-hidden pb-2 md:pb-4">
      
      {/* HEADER SECTION: Profile & Isolated KPIs */}
      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        
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
          </div>
        </div>

        {/* KPI Cards: Grid cols-2 on mobile so they sit side-by-side, flex on desktop */}
        <div className="grid grid-cols-2 md:flex gap-4 shrink-0">
          {/* Incoming KPI Card */}
          <div 
            onClick={() => setIsIncomingModalOpen(true)}
            className="w-full md:w-40 lg:w-90 bg-white p-3 rounded-xl border-t-4 border-t-blue-500 border-x border-b border-gray-200 shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
            role="button"
            tabIndex={0}
          >
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
              >
                <h4 className={`text-xs font-black uppercase flex items-center gap-1.5 ${col.text} truncate pr-2`}>
                  {col.icon} {col.label}
                </h4>
                <span className={`${col.bg} ${col.text} text-[10px] font-black px-2 py-0.5 rounded-full border border-current/20 shrink-0`}>
                  {col.count || 0}
                </span>
              </div>

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
          </div>
        </div>
      )}

      {/* COMPLETED DOCUMENTS MODAL */}
      <CompletedDocumentsModal 
        isOpen={isCompletedModalOpen} 
        onClose={() => setIsCompletedModalOpen(false)} 
        documents={completedDocs}
        onDocumentClick={handleRowDocumentClick}
      />
    </div>
  );
}