import React, { useState, useEffect } from 'react';
import { MoreVertical, Search, Filter, Plus, QrCode, FileText, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, Zap, MapPin } from 'lucide-react';
// We remove the QRCodeSVG import here because it is moved to the modal files
import TrackingDetailsModal from '../modals/TrackingDetailsModal';
import ViewTrackingQrModal from '../modals/ViewTrackingQrModal';

export default function OriginatorDocumentsTab({ 
  userId, 
  documents, 
  fetchDashboardLedger, 
  setShowModal, 
  processTypes 
}) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeDetailsDoc, setActiveDetailsDoc] = useState(null); 
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeRouteStops, setActiveRouteStops] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isAdhocLog = (l) => l && (l.is_adhoc === true || String(l.is_adhoc) === 'true' || l.is_adhoc === 1);

  useEffect(() => {
    if (documents.length > 0 && !selectedDoc) {
      handleSelectDocument(documents[0]);
    } else if (selectedDoc) {
      const updatedDoc = documents.find(d => d.ini_id === selectedDoc.ini_id);
      if (updatedDoc) handleSelectDocument(updatedDoc);
    }
  }, [documents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const handleSelectDocument = (doc) => {
    setSelectedDoc(doc);
    const match = processTypes.find(p => p.process_name === doc.process_name);
    if (match) {
      const stops = [];
      for (let i = 1; i <= 7; i++) {
        let stopName = match[`stop_${i}_name`];
        
        if (stopName === 'ORIGINATING_COLLEGE_DYNAMIC') {
          const firstNormalLog = doc.history_logs?.find(l => !isAdhocLog(l));
          stopName = firstNormalLog?.office_name || doc.current_office || 'Origin Office';
        }
        if (stopName) stops.push(stopName);
      }
      setActiveRouteStops(stops);
    } else {
      setActiveRouteStops([doc.current_office || 'Origin Office', doc.next_office || 'Next Unit'].filter(Boolean));
    }
  };

  const handleOpenDetails = (e, doc) => {
    e.preventDefault();
    e.stopPropagation(); 
    setActiveDetailsDoc(doc);
    setShowDetailsModal(true);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                          doc.qr_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || doc.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const indexOfLastDoc = currentPage * itemsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - itemsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirstDoc, indexOfLastDoc);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const getRenderStops = (doc, baseStops) => {
    if (!doc || !baseStops) return [];
    const historyLogs = doc.history_logs || [];
    
    let resultStops = [];
    let normalIndex = 0;

    for (let i = 0; i < historyLogs.length; i++) {
      const log = historyLogs[i];
      if (isAdhocLog(log)) {
        resultStops.push({ name: log.office_name, isAdhocNode: true, logRef: log });
      } else {
        if (normalIndex < baseStops.length) {
          resultStops.push({ name: baseStops[normalIndex], isAdhocNode: false, logRef: log });
          normalIndex++;
        }
      }
    }

    while (normalIndex < baseStops.length) {
      resultStops.push({ name: baseStops[normalIndex], isAdhocNode: false, logRef: null });
      normalIndex++;
    }
    return resultStops;
  };

  const getCurrentProgressPercent = (doc, renderedNodes) => {
    if (!doc || !renderedNodes || renderedNodes.length <= 1) return 0;
    if (doc.status?.toLowerCase() === 'completed') return 100;
    
    let activeIndex = 0;
    for (let i = 0; i < renderedNodes.length; i++) {
       if (renderedNodes[i].logRef) activeIndex = i;
    }
    
    return (Math.min(activeIndex, renderedNodes.length - 1) / (renderedNodes.length - 1)) * 100;
  };

  useEffect(() => {
    const pendingRedirectId = localStorage.getItem('redirect_target_doc_id');
    if (pendingRedirectId && documents.length > 0) {
      const targetDoc = documents.find(d => d.ini_id === parseInt(pendingRedirectId));
      if (targetDoc) {
        handleSelectDocument(targetDoc);
        setActiveDetailsDoc(targetDoc);
        setShowDetailsModal(true);
      }
      localStorage.removeItem('redirect_target_doc_id');
    }
  }, [documents]);

  const renderTimelineNodes = getRenderStops(selectedDoc, activeRouteStops);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* LIVE DOCUMENT TRACKING PANEL */}
      {selectedDoc ? (
        <div className="bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-all">
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-1">Live Document Tracking</h3>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {selectedDoc.title}
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                selectedDoc.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                selectedDoc.status?.toLowerCase() === 'action required' ? 'bg-red-50 text-[#D32F2F] border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {selectedDoc.status || 'Active Path'}
              </span>
              
              {selectedDoc.history_logs?.some(l => isAdhocLog(l) && !l.time_out) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  Ad-Hoc Detour Active
                </span>
              )}
            </div>
          </div>

          {/* Ad-Hoc Warning Message */}
          {selectedDoc.history_logs?.some(l => isAdhocLog(l) && !l.time_out) && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 font-medium flex items-start gap-3 shadow-sm">
              <Zap className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                This document has been temporarily routed to <strong className="font-bold text-purple-900 border-b border-purple-300">{selectedDoc.current_office}</strong> for an unscheduled ad-hoc verification detour. The standard routing pipeline will resume once cleared.
              </span>
            </div>
          )}

          {/* Action Required Message */}
          {selectedDoc.status?.toLowerCase() === 'action required' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-xs text-red-800 font-medium shadow-sm">
              <AlertTriangle className="w-5 h-5 text-[#D32F2F] shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase tracking-wide text-[#D32F2F]">Workflow Halted (Action Required)</p>
                <p className="text-red-700 mt-2 font-mono bg-white p-2.5 border border-red-100 rounded-lg shadow-sm">
                  {selectedDoc.last_action || "Returned to Originator: Corrections required before workflow clearance can proceed further."}
                </p>
              </div>
            </div>
          )}
          
          {/* Completed Message */}
          {selectedDoc.status?.toLowerCase() === 'completed' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              Completed Successfully: Route completely clear and signed out of final stop.
            </div>
          )}

          {/* TIMELINE PROGRESS BAR */}
          <div className="relative flex items-start justify-between mt-8 mb-8 px-4 sm:px-8">
            {/* Background Line */}
            <div className="absolute left-4 sm:left-8 right-4 sm:right-8 h-1 bg-gray-200 top-4 -z-10 rounded-full"></div>
            
            {/* Active Fill Line */}
            <div 
              className={`absolute left-4 sm:left-8 h-1 top-4 -z-10 rounded-full transition-all duration-700 ease-in-out ${
                selectedDoc.history_logs?.some(l => isAdhocLog(l) && !l.time_out) ? 'bg-purple-500' : 'bg-[#D32F2F]'
              }`}
              style={{ width: `calc(${getCurrentProgressPercent(selectedDoc, renderTimelineNodes.map(n => n.name))}% - ${window.innerWidth < 640 ? '32px' : '64px'})` }}
            ></div>

            {renderTimelineNodes.map((node, index) => {
              const isCompletedAll = selectedDoc?.status?.toLowerCase() === 'completed';
              const isHalted = selectedDoc?.status?.toLowerCase() === 'action required';
              
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
                    isCurrent && isHalted ? 'bg-[#D32F2F] text-white shadow-[0_0_0_6px_rgba(211,47,47,0.15)]' :
                    isCurrent ? 'bg-[#D32F2F] text-white shadow-[0_0_0_6px_rgba(211,47,47,0.15)] animate-pulse' :
                    node.isAdhocNode ? 'bg-purple-100 border border-purple-200 text-purple-700' :
                    isPast ? 'bg-[#D32F2F] text-white shadow-sm' : 'bg-white border-2 border-gray-300 text-gray-400'
                  }`}>
                    {isCurrent && isHalted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : isPast && !isCurrent ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    ) : node.isAdhocNode ? (
                      <Zap size={16} strokeWidth={2.5} />
                    ) : (
                      index - renderTimelineNodes.slice(0, index).filter(n => n.isAdhocNode).length + 1
                    )}
                  </div>
                  
                  <p className={`text-[10px] sm:text-[11px] font-bold mt-3 sm:mt-4 truncate w-[60px] sm:w-[100px] leading-tight ${
                    isCurrent && node.isAdhocNode ? 'text-purple-700' : 
                    isCurrent ? 'text-[#D32F2F]' : 
                    isPast ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {node.name}
                  </p>
                  
                  <span className="text-[9px] text-gray-500 font-medium block mt-1 leading-tight uppercase tracking-wider">
                    {isCurrent && node.isAdhocNode ? 'Verification' :
                    isCurrent && isHalted ? 'Halted' : 
                    isCurrent ? 'Under Review' : 
                    isPast ? 'Cleared' : 'Awaiting'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-5 border-t border-gray-100">
            <button 
              onClick={() => setShowQrOverlay(true)} 
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <QrCode size={14} className="text-gray-500" /> 
              View Tracking QR
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <FileText className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-600">No Document Selected</p>
          <p className="text-xs text-gray-500 mt-1">Select an active workflow from the registry below to spin trace path models.</p>
        </div>
      )}

      {/* RECENT SUBMISSIONS TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Recent Submissions
          </h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] focus-within:border-[#D32F2F] transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none pr-2"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Verification">In Verification</option>
                <option value="Action Required">Action Required</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm transition-all" 
              />
            </div>
            
            <button 
              onClick={() => setShowModal(true)} 
              className="px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} /> 
              New Document
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Document Name</th>
                <th className="p-4">Reference ID (QR)</th>
                <th className="p-4">Process Type</th>
                <th className="p-4">Est. Completion</th>
                <th className="p-4">Current Location</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentDocs.map((doc) => (
                <tr key={doc.ini_id} 
                    onClick={() => handleSelectDocument(doc)}
                    className={`transition-colors cursor-pointer ${selectedDoc?.ini_id === doc.ini_id ? 'bg-red-50/40' : 'hover:bg-gray-50/80'}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedDoc?.ini_id === doc.ini_id ? 'bg-white shadow-sm border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                        <FileText size={16} className={selectedDoc?.ini_id === doc.ini_id ? 'text-[#D32F2F]' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{doc.title}</p>
                        <span className="text-[10px] text-gray-500 font-medium">Modified recently</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                      {doc.qr_code}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      {doc.process_name}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-600 font-medium">
                    {doc.edc ? new Date(doc.edc).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Processing'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      doc.status?.toLowerCase() === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : doc.status?.toLowerCase() === 'action required'
                          ? 'bg-red-50 text-[#D32F2F] border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {doc.status?.toLowerCase() === 'completed' ? 'Completed' : 
                       doc.status?.toLowerCase() === 'action required' ? 'Halted Checklist' : (doc.current_office || 'Origin Unit')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={(e) => handleOpenDetails(e, doc)} 
                      className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-500 hover:text-gray-900 mx-auto flex items-center justify-center transition-all focus:outline-none"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {currentDocs.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-8 h-8 text-gray-400 mb-3" />
                      <p className="text-sm font-bold text-gray-600">No documents found</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-xs font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm focus:outline-none"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL INJECTIONS */}
      {showDetailsModal && activeDetailsDoc && (
        <TrackingDetailsModal 
          activeDetailsDoc={activeDetailsDoc} 
          setShowDetailsModal={setShowDetailsModal} 
          activeRouteStops={activeRouteStops} 
          getRenderStops={getRenderStops} 
        />
      )}

      {showQrOverlay && selectedDoc && (
        <ViewTrackingQrModal 
          selectedDoc={selectedDoc} 
          setShowQrOverlay={setShowQrOverlay} 
        />
      )}

    </div>
  );
}