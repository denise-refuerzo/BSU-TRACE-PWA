import React, { useState } from 'react';
import { X, Search, Inbox, FileText, Building2, User, ChevronRight } from 'lucide-react';

export default function IncomingDocumentsModal({ isOpen, onClose, documents = [], isLoading = false }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const getFormTag = (processName = '') => {
    if (processName.includes('APP')) return 'APP-GSO';
    if (processName.includes('PAR')) return 'PAR-IT';
    if (processName.includes('ICS')) return 'ICS-SUP';
    return 'GSO-FRM';
  };

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.requestor_name && doc.requestor_name.toLowerCase().includes(q)) ||
      (doc.current_office && doc.current_office.toLowerCase().includes(q)) ||
      (doc.process_name && doc.process_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-100 dark:border-[#42292f] flex flex-col overflow-hidden text-left max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-[#42292f] flex items-center justify-between bg-[#FDFBF9] dark:bg-[#1c1113]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Inbox size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">Incoming Documents</h3>
              <p className="text-xs text-neutral-500 dark:text-gray-400 font-medium">Documents expected to arrive at your office</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-6 py-3 border-b border-neutral-100 dark:border-[#42292f] bg-white dark:bg-[#180e10]">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-neutral-400" size={15} />
            <input
              type="text"
              placeholder="Search by title, requestor, office, or form..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-neutral-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-neutral-50/50 dark:bg-[#1c1113] text-neutral-900 dark:text-white font-medium transition-all"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-y-auto max-h-[440px] divide-y divide-neutral-100 dark:divide-gray-800">
        {isLoading ? (
            <div className="p-10 text-center text-xs font-semibold text-neutral-400 dark:text-gray-500">Loading incoming documents...</div>
        ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
            <Inbox className="w-8 h-8 text-neutral-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-600 dark:text-gray-400">No incoming documents match your criteria</p>
            </div>
        ) : (
            filteredDocs.map((doc) => (
            <div
                key={doc.ini_id}
                className="py-3 px-6 flex items-center justify-between hover:bg-neutral-50/70 dark:hover:bg-[#2b1317]/50 transition-colors gap-4"
            >
                {/* Left: Icon + Stacked Information Hierarchy */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-gray-800 text-neutral-500 dark:text-gray-400 shrink-0 mt-0.5">
                    <FileText size={16} />
                </div>
                
                <div className="min-w-0 space-y-1">
                    {/* 1. Document Title */}
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate leading-snug">{doc.title}</p>
                    
                    {/* 2. Requestor Name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-gray-400 font-medium">
                    <User size={12} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{doc.requestor_name || 'Anonymous'}</span>
                    </div>

                    {/* 3. Process Type Badge */}
                    <div>
                    <span className="inline-block text-[9px] font-bold tracking-tight px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 max-w-[280px] truncate">
                        {doc.process_name || 'Standard Document'}
                    </span>
                    </div>
                </div>
                </div>

                {/* Right: Current Office Location */}
                <div className="text-right shrink-0 max-w-[220px] flex flex-col items-end justify-center">
                <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider mb-0.5">
                    Current Location
                </span>
                <div className="flex items-start justify-end gap-3 text-neutral-700 dark:text-gray-300">
                    <Building2 size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold leading-tight text-right break-words">
                    {doc.current_office}
                    </span>
                </div>
                </div>
            </div>
            ))
        )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between text-xs px-6">
          <span className="font-semibold text-neutral-500 dark:text-gray-400">
            Showing <strong className="text-neutral-900 dark:text-white">{filteredDocs.length}</strong> incoming item{filteredDocs.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-200 dark:border-gray-700 bg-white dark:bg-[#180e10] font-bold text-neutral-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-gray-800 text-xs shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}