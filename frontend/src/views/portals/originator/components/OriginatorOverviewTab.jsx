import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Files, Clock, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import CompletedDocumentsModal from '../../../shared/modals/CompletedDocumentsModal';

export default function OriginatorOverviewTab({
  profile, userName, documents, pendingCount, mostRecentDoc, recentDocStops,
  setShowModal, setActiveTab, onSelectDocumentDetails
}) {
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [matrixPage, setMatrixPage] = useState(1);
  const itemsPerPage = 5;

  const getDocsByStatus = (status) => documents.filter(doc => doc.status?.toLowerCase() === status.toLowerCase());
  
  const pendingDocs = getDocsByStatus('pending');
  const actionReqDocs = getDocsByStatus('action required');
  const completedDocs = getDocsByStatus('completed');

  const kanbanColumns = [
    { id: 'Pending', label: 'Pending Process', docs: pendingDocs, color: 'border-t-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock size={16} /> },
    { id: 'Action Required', label: 'Action Required', docs: actionReqDocs, color: 'border-t-[#D32F2F]', text: 'text-[#D32F2F]', bg: 'bg-red-50', icon: <AlertCircle size={16} /> }
  ];

  const totalPages = Math.ceil(documents.length / itemsPerPage) || 1;

  return (
    <div className="space-y-4 max-w-full mx-auto text-left animate-in fade-in duration-200 h-[calc(100dvh-100px)] flex flex-col overflow-hidden pb-2 md:pb-4">
      
      {/* HEADER SECTION: Profile & Isolated KPIs */}
      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        
        {/* Profile Card */}
        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <h3 className="text-lg font-black text-gray-900 leading-tight truncate w-full">{profile?.fullName || userName}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5 truncate w-full">Faculty / {profile?.departmentName}</p>
            <button 
              onClick={() => setActiveTab('profile')} 
              className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-[11px] font-bold hover:bg-black transition-colors shrink-0 whitespace-nowrap"
            >
              View Profile &rarr;
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:flex gap-3 shrink-0">
          <div className="w-full md:w-36 lg:w-60 bg-white p-3 rounded-xl border-t-4 border-t-gray-700 border-x border-b border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Files size={14} className="text-gray-700 shrink-0" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider truncate">Total Docs</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{String(documents.length).padStart(2, '0')}</p>
          </div>

          <div 
            onClick={() => setIsCompletedModalOpen(true)}
            className="w-full md:w-36 lg:w-60 bg-white p-3 rounded-xl border-t-4 border-t-emerald-500 border-x border-b border-gray-200 shadow-sm flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-all active:scale-95 text-center"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider truncate">Completed</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">{String(completedDocs.length).padStart(2, '0')}</p>
            <span className="text-[8px] font-bold text-emerald-600 mt-1 uppercase tracking-tight">View Archive &rarr;</span>
          </div>

          <button 
            onClick={() => setShowModal(true)} 
            className="col-span-2 md:col-span-1 h-full px-4 py-3 bg-[#D32F2F] text-white rounded-xl font-bold flex flex-row md:flex-col justify-center items-center hover:bg-[#b71c1c] transition-all shadow-sm active:scale-95 gap-2 w-full md:w-40"
          >
            <b><Plus size={30} className="md:mb-1" /></b>
            <span className="text-[10px] uppercase tracking-wider"><b>New Document</b></span>
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory custom-scrollbar pb-2">
        {kanbanColumns.map((col) => (
          <div 
            key={col.id} 
            className="w-[85vw] sm:w-80 md:w-auto md:flex-1 shrink-0 flex flex-col bg-gray-50/80 rounded-xl border border-gray-200 overflow-hidden transition-opacity snap-start"
          >
            <div className={`p-3 border-b border-gray-200 bg-white border-t-4 ${col.color} flex justify-between items-center shrink-0`}>
              <h4 className={`text-xs font-black uppercase flex items-center gap-1.5 ${col.text} truncate pr-2`}>
                {col.icon} {col.label}
              </h4>
              <span className={`${col.bg} ${col.text} text-[10px] font-black px-2 py-0.5 rounded-full border border-current/20 shrink-0`}>
                {col.docs.length}
              </span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {col.docs.length > 0 ? (
                col.docs.map((doc, idx) => (
                  <div 
                    key={doc.ini_id || idx}
                    onClick={() => onSelectDocumentDetails?.(doc)}
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
        ))}
      </div>
      {/* COMPLETED DOCUMENTS MODAL */}
      <CompletedDocumentsModal 
        isOpen={isCompletedModalOpen} 
        onClose={() => setIsCompletedModalOpen(false)} 
        documents={completedDocs}
        onDocumentClick={onSelectDocumentDetails}
      />
    </div>
  );
}