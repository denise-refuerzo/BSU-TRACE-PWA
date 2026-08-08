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
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* KPI Stats Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm text-left flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider">Institutional Profile</span>
            <h3 className="text-xl font-bold mt-1 text-neutral-900">{profile?.fullName || userName}</h3>
            <p className="text-xs text-neutral-400 mt-0.5">{profile?.accountType} / {profile?.departmentName}</p>
          </div>
          <button onClick={() => setActiveTab('profile')} className="mt-4 px-4 py-1.5 w-max bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 transition-colors">
            View Profile
          </button>
        </div>
        
        <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Documents', val: documents.length, color: 'text-neutral-900' }, 
            { label: 'Pending Process', val: pendingCount, color: 'text-amber-600' }, 
            { label: 'Action Required', val: documents.filter(d => d.status?.toLowerCase() === 'action required').length, color: 'text-red-600' }, 
            { label: 'Completed Log', val: documents.filter(d => d.status?.toLowerCase() === 'completed').length, color: 'text-green-600' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm text-center">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-tight mb-2">{kpi.label}</p>
              <p className={`text-4xl font-extrabold ${kpi.color}`}>{String(kpi.val).padStart(2, '0')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Document Tracker */}
      {mostRecentDoc && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm text-left">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold tracking-tight text-neutral-500 uppercase">
              Recent Document: <span className="text-neutral-900 font-extrabold uppercase">{mostRecentDoc.title}</span>
            </h4>
            {mostRecentDoc.history_logs?.some(l => (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1) && !l.time_out) && (
              <span className="px-2 py-0.5 bg-purple-100 border border-purple-200 text-purple-800 rounded text-[9px] font-black uppercase tracking-wide">
                📍 AD-HOC DETOUR ACTIVE
              </span>
            )}
          </div>

          {mostRecentDoc.history_logs?.some(l => (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1) && !l.time_out) && (
            <div className="mb-5 p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl text-xs text-purple-800 font-medium flex items-center gap-2">
              <span className="text-purple-600">⚡</span>
              <span>This document has been temporarily routed to <strong className="text-purple-900 underline">{mostRecentDoc.current_office}</strong> for an unscheduled ad-hoc verification detour. Standard routing pipeline will resume once cleared.</span>
            </div>
          )}

          <div className="relative flex items-center justify-between mt-6 px-4">
            <div className="absolute left-4 right-4 h-1 bg-neutral-200 top-3 -z-10"></div>
            
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
                  <div 
                    className={`absolute left-4 h-1 top-3 -z-10 transition-all duration-500 ease-in-out ${resultStops.some(n => n.isAdhocNode && n.logRef && !n.logRef.time_out) ? 'bg-purple-600' : 'bg-red-700'}`}
                    style={{ width: `calc(${mostRecentDoc.status?.toLowerCase() === 'completed' ? 100 : percentage}% - 32px)` }}
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
                      <div key={index} className="text-center flex flex-col items-center flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                          isCurrent && node.isAdhocNode ? 'bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse' :
                          isCurrent ? 'bg-red-700 text-white ring-4 ring-red-100 animate-pulse' :
                          isPast ? 'bg-red-800 text-white' : 'bg-neutral-200 text-neutral-500'
                        }`}>
                          {isPast && !isCurrent ? '✓' : node.isAdhocNode ? '⚡' : index - resultStops.slice(0, index).filter(n => n.isAdhocNode).length + 1}
                        </div>
                        <p className={`text-[11px] font-bold mt-2 truncate max-w-[130px] ${isCurrent && node.isAdhocNode ? 'text-purple-700 font-extrabold' : isCurrent ? 'text-red-800 font-extrabold' : 'text-neutral-500'}`}>
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

      {/* Document Ledger Matrix */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-left flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div><h3 className="text-base font-bold text-neutral-950">Document Ledger Matrix</h3></div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
            <Plus size={14} /> New Document
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b">
                <th className="p-4 uppercase tracking-wider text-neutral-500">Title / ID</th>
                <th className="p-4 uppercase tracking-wider text-neutral-500">Workflow Type</th>
                <th className="p-4 uppercase tracking-wider text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentLedgerDocs.map(doc => (
                <tr key={doc.ini_id} className="border-b hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4 font-bold text-neutral-900">{doc.title}</td>
                  <td className="p-4 text-neutral-600">{doc.process_name}</td>
                  <td className="p-4 text-amber-600 font-bold">• {doc.status || 'Active Path'}</td>
                </tr>
              ))}
              {currentLedgerDocs.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-neutral-500 text-xs">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <span className="text-xs text-neutral-500">
              Page <span className="font-bold text-neutral-900">{currentPage}</span> of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neutral-600"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neutral-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}