import React from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OriginatorOverviewTab({
  profile,
  userName,
  documents,
  pendingCount,
  mostRecentDoc,
  recentDocStops,
  currentLedgerDocs,
  currentPage,
  totalPages,
  setCurrentPage,
  setShowModal,
  setActiveTab
}) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      
      {/* KPI STATS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Institutional Profile Card */}
        <div className="bg-white p-6 rounded-2xl border-t-4 border-t-blue-600 border-x border-b border-gray-200 shadow-sm text-left flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Institutional Profile
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
            </div>
            <h3 className="text-xl font-bold mt-2 text-gray-900 truncate pr-2">{profile?.fullName || userName}</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {profile?.accountType} / {profile?.departmentName}
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('profile')} 
            className="mt-5 px-4 py-2 w-max bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm flex items-center gap-1.5"
          >
            View Profile
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
        
        {/* 4 KPI Counters Grid */}
        <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Documents', val: documents.length, color: 'text-gray-900', border: 'border-t-gray-700' }, 
            { label: 'Pending Process', val: pendingCount, color: 'text-amber-600', border: 'border-t-amber-500' }, 
            { label: 'Action Required', val: documents.filter(d => d.status?.toLowerCase() === 'action required').length, color: 'text-[#D32F2F]', border: 'border-t-[#D32F2F]' }, 
            { label: 'Completed Log', val: documents.filter(d => d.status?.toLowerCase() === 'completed').length, color: 'text-emerald-600', border: 'border-t-emerald-500' }
          ].map((kpi, idx) => (
            <div key={idx} className={`bg-white p-5 rounded-2xl border-t-4 ${kpi.border} border-x border-b border-gray-200 shadow-sm text-center flex flex-col justify-center hover:shadow-md transition-all transform hover:-translate-y-0.5`}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">{kpi.label}</p>
              <p className={`text-4xl font-black ${kpi.color}`}>{String(kpi.val).padStart(2, '0')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT DOCUMENT TRACKER */}
      {mostRecentDoc && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm text-left relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-3">
            <div>
              <h4 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-1">Active Pipeline Monitoring</h4>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {mostRecentDoc.title}
              </p>
            </div>
            
            {/* Ad-Hoc Top Badge */}
            {mostRecentDoc.history_logs?.some(l => (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1) && !l.time_out) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                Ad-Hoc Detour Active
              </span>
            )}
          </div>

          {/* Ad-Hoc Warning Message */}
          {mostRecentDoc.history_logs?.some(l => (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1) && !l.time_out) && (
            <div className="mb-8 p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 font-medium flex items-start gap-3 shadow-sm">
              <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="leading-relaxed">
                This document has been temporarily routed to <strong className="font-bold text-purple-900 border-b border-purple-300">{mostRecentDoc.current_office}</strong> for an unscheduled ad-hoc verification detour. The standard routing pipeline will resume once cleared by this station.
              </span>
            </div>
          )}

          {/* Progress Timeline */}
          <div className="relative flex items-start justify-between mt-8 px-4 sm:px-8">
            {/* Background Line */}
            <div className="absolute left-4 sm:left-8 right-4 sm:right-8 h-1 bg-gray-200 top-4 -z-10 rounded-full"></div>
            
            {(() => {
              const historyLogs = mostRecentDoc.history_logs || [];
              const isAdhocLog = (l) => l && (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1 || String(l.is_adhoc) === 't');
              
              let resultStops = [];
              let normalIndex = 0;
              
              for (let i = 0; i < historyLogs.length; i++) {
                const log = historyLogs[i];
                if (isAdhocLog(log)) {
                  resultStops.push({ name: log.office_name, isAdhocNode: true, logRef: log });
                } else {
                  if (normalIndex < recentDocStops.length) {
                    resultStops.push({ name: recentDocStops[normalIndex], isAdhocNode: false, logRef: log });
                    normalIndex++;
                  }
                }
              }
              while (normalIndex < recentDocStops.length) {
                resultStops.push({ name: recentDocStops[normalIndex], isAdhocNode: false, logRef: null });
                normalIndex++;
              }

              let activeIndex = 0;
              for (let i = 0; i < resultStops.length; i++) {
                 if (resultStops[i].logRef) activeIndex = i;
              }
              const percentage = resultStops.length <= 1 ? 0 : (Math.min(activeIndex, resultStops.length - 1) / (resultStops.length - 1)) * 100;

              return (
                <>
                  {/* Active Fill Line */}
                  <div 
                    className={`absolute left-4 sm:left-8 h-1 top-4 -z-10 rounded-full transition-all duration-700 ease-in-out ${resultStops.some(n => n.isAdhocNode && n.logRef && !n.logRef.time_out) ? 'bg-purple-500' : 'bg-[#D32F2F]'}`}
                    style={{ width: `calc(${mostRecentDoc.status?.toLowerCase() === 'completed' ? 100 : percentage}% - ${window.innerWidth < 640 ? '32px' : '64px'})` }}
                  ></div>
                  
                  {resultStops.map((node, index) => {
                    const isCompletedAll = mostRecentDoc.status?.toLowerCase() === 'completed';
                    let isCurrent = false;
                    let isPast = false;

                    if (isCompletedAll) {
                      isPast = true;
                    } else if (node.logRef) {
                      if (!node.logRef.time_out) isCurrent = true;
                      else isPast = true;
                    }

                    return (
                      <div key={index} className="text-center flex flex-col items-center flex-1 z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isCurrent && node.isAdhocNode ? 'bg-purple-600 text-white shadow-[0_0_0_6px_rgba(147,51,234,0.15)] animate-pulse' :
                          isCurrent ? 'bg-[#D32F2F] text-white shadow-[0_0_0_6px_rgba(211,47,47,0.15)] animate-pulse' :
                          isPast ? 'bg-[#D32F2F] text-white shadow-sm' : 'bg-white border-2 border-gray-300 text-gray-400'
                        }`}>
                          {isPast && !isCurrent ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          ) : node.isAdhocNode ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          ) : (
                            index - resultStops.slice(0, index).filter(n => n.isAdhocNode).length + 1
                          )}
                        </div>
                        <p className={`text-[10px] sm:text-[11px] font-bold mt-3 sm:mt-4 truncate w-[60px] sm:w-[100px] leading-tight ${
                          isCurrent && node.isAdhocNode ? 'text-purple-700' : 
                          isCurrent ? 'text-[#D32F2F]' : 
                          isPast ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {node.name}
                        </p>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* DOCUMENT LEDGER MATRIX TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-left flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Document Ledger Matrix
            </h3>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} /> 
            New Document
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-[11px] uppercase font-bold tracking-wider text-gray-500">Title / ID</th>
                <th className="p-4 text-[11px] uppercase font-bold tracking-wider text-gray-500">Workflow Type</th>
                <th className="p-4 text-[11px] uppercase font-bold tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentLedgerDocs.map(doc => (
                <tr key={doc.ini_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{doc.title}</td>
                  <td className="p-4 text-gray-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      {doc.process_name}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      doc.status?.toLowerCase() === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : doc.status?.toLowerCase() === 'action required'
                          ? 'bg-red-50 text-[#D32F2F] border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {doc.status || 'Active Path'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentLedgerDocs.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-gray-500 text-sm bg-gray-50">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    No documents found in ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-xs font-medium text-gray-500">
              Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}