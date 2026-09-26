import React, { useState } from 'react';
import { X, Search, CheckCircle, FileText, User } from 'lucide-react';

export default function CompletedDocumentsModal({ 
  isOpen, 
  onClose, 
  documents = [], 
  isLoading = false,
  onDocumentClick 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.requestor_name && doc.requestor_name.toLowerCase().includes(q)) ||
      (doc.process_name && doc.process_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-100 flex flex-col overflow-hidden text-left max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-[#FDFBF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 tracking-tight">Completed Documents</h3>
              <p className="text-xs text-neutral-500 font-medium">Archived and successfully finished workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-6 py-3 border-b border-neutral-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-neutral-400" size={15} />
            <input
              type="text"
              placeholder="Search by title, requestor, or form..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-neutral-50/50 font-medium transition-all"
            />
          </div>
        </div>

        {/* Table Container - Fixed height + smooth overflow scroll */}
        <div className="overflow-y-auto max-h-[440px] divide-y divide-neutral-100 custom-scrollbar">
          {isLoading ? (
            <div className="p-10 text-center text-xs font-semibold text-neutral-400">Loading completed documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-600">No completed documents match your criteria</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.ini_id}
                onClick={() => {
                  if (onDocumentClick) onDocumentClick(doc);
                  onClose();
                }}
                className="py-3 px-6 flex items-center justify-between hover:bg-neutral-50/70 transition-colors gap-4 cursor-pointer group"
              >
                {/* Left: Icon + Stacked Information Hierarchy */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-neutral-100 text-neutral-500 shrink-0 mt-0.5 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <FileText size={16} />
                  </div>
                  
                  <div className="min-w-0 space-y-1">
                    {/* 1. Document Title */}
                    <p className="text-xs font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors truncate leading-snug">
                      {doc.title}
                    </p>
                    
                    {/* 2. Requestor Name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 font-medium">
                      <User size={12} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{doc.requestor_name || 'Anonymous'}</span>
                    </div>

                    {/* 3. Process Type Badge */}
                    <div>
                      <span className="inline-block text-[9px] font-bold tracking-tight px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 max-w-[280px] truncate">
                        {doc.process_name || 'Standard Document'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Indicator */}
                <div className="text-right shrink-0 max-w-[220px] flex flex-col items-end justify-center">
                  <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider mb-0.5">
                    Status
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-emerald-600">
                    <CheckCircle size={13} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-bold leading-tight text-right break-words">
                      Fully Processed
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-[#FDFBF9] flex items-center justify-between text-xs px-6">
          <span className="font-semibold text-neutral-500">
            Showing <strong className="text-neutral-900">{filteredDocs.length}</strong> completed item{filteredDocs.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-200 bg-white font-bold text-neutral-700 hover:bg-neutral-50 text-xs shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}