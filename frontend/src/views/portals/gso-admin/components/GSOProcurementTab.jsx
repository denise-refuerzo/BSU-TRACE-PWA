import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Edit, Car, Building, Landmark, Archive, 
  Filter, Inbox, CheckSquare, Layers, Calendar, UserCheck
} from 'lucide-react';

export default function GSOProcurementTab({
  vehicleData,
  multimediaData,
  gymData,
  logData,
  procSearch,
  setProcSearch,
  procFilter,
  setProcFilter,
  procPage,
  setProcPage,
  setShowPrintModal,
  setShowChecklistMakerModal,
  handleViewChecklist,
  handleAssignVehicle,
  targetSection,
  setTargetSection
}) {
  // Category tabs: all, vehicle, multimedia, gym, logistics
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (targetSection) {
      setSelectedCategory(targetSection);
      if (setTargetSection) setTargetSection(null);
    }
  }, [targetSection, setTargetSection]);

  // Map category to state keys in procSearch/procFilter/procPage
  const activeKey = selectedCategory === 'all' ? 'vehicle' : selectedCategory;
  const currentSearch = procSearch[activeKey] || '';
  const currentFilter = procFilter[activeKey] || 'All';
  const currentPage = procPage[activeKey] || 1;

  const handleSearchChange = (val) => {
    if (selectedCategory === 'all') {
      setProcSearch({ vehicle: val, multimedia: val, gym: val, logistics: val });
      setProcPage({ vehicle: 1, multimedia: 1, gym: 1, logistics: 1 });
    } else {
      setProcSearch(prev => ({ ...prev, [selectedCategory]: val }));
      setProcPage(prev => ({ ...prev, [selectedCategory]: 1 }));
    }
  };

  const handleFilterChange = (val) => {
    if (selectedCategory === 'all') {
      setProcFilter({ vehicle: val, multimedia: val, gym: val, logistics: val });
      setProcPage({ vehicle: 1, multimedia: 1, gym: 1, logistics: 1 });
    } else {
      setProcFilter(prev => ({ ...prev, [selectedCategory]: val }));
      setProcPage(prev => ({ ...prev, [selectedCategory]: 1 }));
    }
  };

  const handlePageChange = (newPage) => {
    if (selectedCategory === 'all') {
      setProcPage({ vehicle: newPage, multimedia: newPage, gym: newPage, logistics: newPage });
    } else {
      setProcPage(prev => ({ ...prev, [selectedCategory]: newPage }));
    }
  };

  // Compile items depending on category
  const getRenderItems = () => {
    if (selectedCategory === 'vehicle') {
      return { 
        items: vehicleData.paginatedData.map(d => ({ ...d, _type: 'vehicle' })),
        totalCount: vehicleData.filteredData.length,
        totalPages: vehicleData.totalPages
      };
    }
    if (selectedCategory === 'multimedia') {
      return { 
        items: multimediaData.paginatedData.map(d => ({ ...d, _type: 'multimedia' })),
        totalCount: multimediaData.filteredData.length,
        totalPages: multimediaData.totalPages
      };
    }
    if (selectedCategory === 'gym') {
      return { 
        items: gymData.paginatedData.map(d => ({ ...d, _type: 'gym' })),
        totalCount: gymData.filteredData.length,
        totalPages: gymData.totalPages
      };
    }
    if (selectedCategory === 'logistics') {
      return { 
        items: logData.paginatedData.map(d => ({ ...d, _type: 'logistics' })),
        totalCount: logData.filteredData.length,
        totalPages: logData.totalPages
      };
    }

    // 'all' category: merge standard reservation items
    const combined = [
      ...vehicleData.filteredData.map(d => ({ ...d, _type: 'vehicle' })),
      ...multimediaData.filteredData.map(d => ({ ...d, _type: 'multimedia' })),
      ...gymData.filteredData.map(d => ({ ...d, _type: 'gym' }))
    ].sort((a, b) => new Date(b.reservation_date || b.created_at) - new Date(a.reservation_date || a.created_at));

    const itemsPerPage = 6;
    const totalPages = Math.ceil(combined.length / itemsPerPage) || 1;
    const paginated = combined.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return { items: paginated, totalCount: combined.length, totalPages };
  };

  const { items, totalCount, totalPages } = getRenderItems();

  const categoryTabs = [
    { id: 'all', label: 'All Requests', icon: <Layers size={14} /> },
    { id: 'vehicle', label: 'Vehicles', icon: <Car size={14} /> },
    { id: 'multimedia', label: 'Multimedia Room', icon: <Building size={14} /> },
    { id: 'gym', label: 'Gymnasium', icon: <Landmark size={14} /> },
    { id: 'logistics', label: 'Equipment & Supplies', icon: <Archive size={14} /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">List of Requests</h2>
          <p className="text-sm text-gray-500 mt-1">Review, organize, and assign driver and room requests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowPrintModal(true)} 
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wide rounded-xl shadow-xs transition-all border border-gray-300 flex items-center gap-2 cursor-pointer"
          >
            <Download size={15} strokeWidth={2.5} /> Export Report
          </button>
          <button 
            onClick={() => setShowChecklistMakerModal(true)} 
            className="px-4 py-2.5 bg-[#991b1b] hover:bg-red-900 text-white font-bold text-xs uppercase tracking-wide rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Edit size={15} strokeWidth={2.5} /> Required Documents
          </button>
        </div>
      </div>

      {/* CONTROLS & UNIFIED TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        
        {/* TOP TOOLBAR: CATEGORY TOGGLES */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-xl overflow-x-auto max-w-full">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH & STATUS FILTER */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search requestor or event..." 
                value={currentSearch} 
                onChange={e => handleSearchChange(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-xl bg-white outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700 shadow-xs transition-all font-medium" 
              />
            </div>

            <div className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-xl text-xs shadow-xs focus-within:ring-1 focus-within:ring-red-700 transition-all">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={currentFilter} 
                onChange={e => handleFilterChange(e.target.value)} 
                className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer pr-2"
              >
                <option value="All">All Statuses</option>
                {selectedCategory === 'logistics' ? (
                  <>
                    <option value="Borrowed">Active (Borrowed)</option>
                    <option value="Returned">Returned</option>
                  </>
                ) : (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                <th className="p-4">Requested By</th>
                <th className="p-4">Request Type</th>
                <th className="p-4">Purpose / Item</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {items.map((row, idx) => {
                const isLog = row._type === 'logistics';
                const hasVehicleAssignment = Boolean(
                  (row.assigned_vehicle_id && row.assigned_driver_id) ||
                  (row.vehicle_to_be_used && row.designated_driver)
                );
                const dateObj = new Date(isLog ? row.borrowed_at : row.reservation_date);
                const requestor = row.requestor || row.requestor_name || 'Anonymous';
                
                const typeLabels = {
                  vehicle: { label: 'Vehicle', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  multimedia: { label: 'Multimedia Room', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  gym: { label: 'Gymnasium', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  logistics: { label: 'Equipment', color: 'bg-teal-50 text-teal-700 border-teal-200' }
                };
                const badge = typeLabels[row._type] || { label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' };

                return (
                  <tr key={row.booking_id || row.log_id || idx} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* REQUESTOR */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {requestor.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{requestor}</span>
                      </div>
                    </td>

                    {/* TYPE */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* PURPOSE / ITEM */}
                    <td className="p-4 text-gray-700 max-w-[220px] truncate" title={isLog ? row.asset_name : row.purpose}>
                      {isLog ? (
                        <div className="font-bold text-gray-900">
                          {row.asset_name} <span className="text-gray-400 font-normal">({row.qty_borrowed} units)</span>
                        </div>
                      ) : (
                        row.purpose || 'No description provided'
                      )}
                    </td>

                    {/* SCHEDULE */}
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                        <Calendar size={13} className="text-gray-400" />
                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {!isLog && row.start_time && (
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                          {row.start_time?.substring(0,5)} - {row.end_time?.substring(0,5)}
                        </div>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                        row.status === 'Approved' || row.status === 'Returned'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          row.status === 'Approved' || row.status === 'Returned' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></span>
                        {row.status === 'Reserved' ? 'Pending' : row.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-center">
                      {!isLog ? (
                        <div className="flex items-center justify-center gap-2">
                          {/* 1. Checklist Button */}
                          <button 
                            onClick={() => handleViewChecklist(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 hover:text-red-800 hover:border-red-200 transition-all text-[11px] shadow-2xs cursor-pointer"
                          >
                            <CheckSquare size={13} />
                            Checklist
                          </button>

                          {/* 2. Vehicle Assignment Logic */}
                          {row._type === 'vehicle' && (
                            hasVehicleAssignment ? (
                              /* Case A: Already Assigned -> Disabled "Assigned" Chip */
                              <span 
                                title={`Assigned: ${row.vehicle_to_be_used || 'Vehicle'} · Driver: ${row.designated_driver || 'Driver'}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] select-none cursor-default"
                              >
                                <UserCheck size={13} className="text-emerald-600" />
                                Assigned
                              </span>
                            ) : row.status === 'Approved' ? (
                              /* Case B: Approved but not assigned */
                              <button 
                                onClick={() => handleAssignVehicle(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg text-[11px] shadow-2xs cursor-pointer transition-colors"
                              >
                                <UserCheck size={13} />
                                Assign Driver
                              </button>
                            ) : (
                              /* Case C: Still pending */
                              <button 
                                disabled
                                title="Complete the document checklist and approve the request before assigning a driver and vehicle."
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-400 font-bold rounded-lg text-[11px] cursor-not-allowed select-none opacity-80"
                              >
                                <UserCheck size={13} />
                                Assign Driver
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">Auto-recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center bg-gray-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <Inbox className="w-9 h-9 text-gray-300 mb-2" />
                      <p className="text-sm font-bold text-gray-700">No requests found</p>
                      <p className="text-xs text-gray-500 mt-0.5">Try searching with a different term or clearing your status filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-white text-xs">
            <span className="text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{items.length}</span> of <span className="font-bold text-gray-900">{totalCount}</span> requests
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage <= 1} 
                onClick={() => handlePageChange(currentPage - 1)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-2xs cursor-pointer transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 font-black text-gray-900">
                {currentPage} / {totalPages}
              </span>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-2xs cursor-pointer transition-colors"
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
