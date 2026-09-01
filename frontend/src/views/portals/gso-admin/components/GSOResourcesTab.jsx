import React from 'react';
import { Plus, Archive, Car, Building, Edit, Trash2, Calendar, Lock, ChevronLeft, ChevronRight, Package, CalendarX2 } from 'lucide-react';

export default function GSOResourcesTab({
  assetsList,
  equipmentInventory,
  assetBlackouts,
  setShowAddAssetModal,
  handleOpenEditModal,
  handleDeleteAsset,
  setSelectedInventoryItem,
  setShowInventoryModal,
  setShowBlackoutModal,
  activeCalendarTab,
  setActiveCalendarTab,
  currentCalendarDate,
  setCurrentCalendarDate
}) {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: firstDayIndex }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const tabToAssetMap = { 'Vehicle': 'Van', 'Multimedia Room': 'Multimedia Room', 'Gymnasium': 'Gymnasium' };
  const mappedAsset = tabToAssetMap[activeCalendarTab];

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Administrative Asset Management</h2>
          <p className="text-sm text-gray-500 mt-1">Hub for managing institutional resources and logistics.</p>
        </div>
        <button 
          onClick={() => setShowAddAssetModal(true)} 
          className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs uppercase tracking-wide rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} /> Add New Asset
        </button>
      </div>

      {/* TOP ROW: Management Table & Inventory Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Resource Management Master Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-[#D32F2F] rounded-lg">
                <Archive size={16} />
              </div>
              Resource Registry
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filter:</span>
              <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none text-gray-700 bg-white shadow-sm focus:ring-1 focus:ring-[#D32F2F] cursor-pointer">
                <option value="All">All Assets</option>
                <option value="Room">Rooms</option>
                <option value="Vehicle">Vehicles</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                <tr className="border-b border-gray-200 font-bold uppercase text-[11px] text-gray-500 tracking-wider">
                  <th className="p-4">Asset Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
              {assetsList.map((asset) => (
                <tr key={asset.asd_id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                        asset.ast_id === 4 ? 'bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-100' : 
                        'bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-100'
                      }`}>
                        {asset.ast_id === 4 ? <Car size={16} /> : <Building size={16} />}
                      </div>
                      <span className="font-bold text-gray-900">{asset.asset_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {asset.asset_type === 'Furniture' ? 'Equipment' : asset.asset_type}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md font-black text-[9px] uppercase tracking-wider shadow-sm
                      ${asset.current_status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        asset.current_status === 'Maintenance' ? 'bg-gray-100 text-gray-600 border-gray-200' : 
                        'bg-red-50 text-[#D32F2F] border-red-200'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        asset.current_status === 'Available' ? 'bg-emerald-500' : 
                        asset.current_status === 'Maintenance' ? 'bg-gray-400' : 
                        'bg-[#D32F2F]'
                      }`}></span> 
                      {asset.current_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(asset)} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none"
                        title="Edit Asset"
                      >
                        <Edit size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteAsset(asset.asd_id, asset.asset_name)} 
                        className="p-1.5 text-gray-400 hover:text-[#D32F2F] hover:bg-red-50 rounded-md transition-colors focus:outline-none"
                        title="Delete Asset"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {assetsList.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-12 text-center bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-sm font-bold text-gray-600">No assets found</p>
                      <p className="text-xs text-gray-500 mt-1">Add your first asset to the registry using the button above.</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Logistics Inventory */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Package size={16} />
              </div>
              Logistics Inventory
            </h3>
          </div>
          
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-gray-50/30">
            {equipmentInventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <Archive className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">No equipment registered.</p>
              </div>
            ) : (
              equipmentInventory.map((item) => (
                <div key={item.asd_id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-gray-300 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gray-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  
                  <h4 className="font-bold text-gray-900 text-base">{item.asset_name}</h4>
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider block mt-1">
                    EQP-ID-{item.asd_id}
                  </span>
                  
                  <div className="flex justify-between items-center mt-5 mb-5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-center w-1/2 border-r border-gray-200">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Available</span>
                      <p className="text-2xl font-black text-[#D32F2F] leading-none mt-1.5">{item.current_stock}</p>
                    </div>
                    <div className="text-center w-1/2">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Capacity</span>
                      <p className="text-2xl font-black text-gray-800 leading-none mt-1.5">{item.capacity}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { setSelectedInventoryItem(item); setShowInventoryModal(true); }} 
                    className="w-full py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-[#D32F2F] hover:border-[#D32F2F] font-bold text-xs uppercase tracking-wide rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100"
                  >
                    <Edit size={14} /> Update Stock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Calendar Availability Control */}
      <div className="bg-white border-t-4 border-t-[#D32F2F] border-x border-b border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#D32F2F]" strokeWidth={2.5} /> 
              Calendar Availability Control
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1 mb-4">Block dates for maintenance, holidays, or priority institutional events.</p>
            <button 
              onClick={() => setShowBlackoutModal(true)} 
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <CalendarX2 size={16} /> Block Dates
            </button>
          </div>
          
          <div className="bg-gray-100/80 p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 font-bold text-xs shadow-inner shrink-0">
            {['Vehicle', 'Multimedia Room', 'Gymnasium'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveCalendarTab(tab)} 
                className={`px-4 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeCalendarTab === tab 
                    ? 'bg-white text-[#D32F2F] shadow-sm border border-gray-200 ring-1 ring-gray-100' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 border border-transparent'
                }`}
              >
                {tab === 'Vehicle' && <Car size={14} />}
                {tab === 'Multimedia Room' && <Building size={14} />}
                {tab === 'Gymnasium' && <Archive size={14} />}
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h4 className="text-lg font-bold text-gray-900">
              {monthNames[month]} {year}
            </h4>
            <div className="flex gap-1 border border-gray-300 rounded-lg p-1 bg-white shadow-sm">
              <button 
                onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))} 
                className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))} 
                className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
              <div key={day} className={`pb-2 ${i === 0 || i === 6 ? 'text-red-400' : ''}`}>{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={index} className="bg-gray-50/50 border border-dashed border-gray-200 rounded-xl min-h-[100px]"></div>;
              
              const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const activeBlock = assetBlackouts.find(blk => {
                if (blk.asset_name !== mappedAsset) return false;
                const start = new Date(blk.start_time).toISOString().split('T')[0];
                const end = new Date(blk.end_time).toISOString().split('T')[0];
                return dayString >= start && dayString <= end;
              });

              return (
                <div 
                  key={index} 
                  className={`border rounded-xl p-2 min-h-[100px] flex flex-col justify-between transition-colors ${
                    activeBlock 
                      ? 'bg-red-50/30 border-red-200' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                    activeBlock 
                      ? 'text-red-700 bg-red-100' 
                      : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  
                  {activeBlock && (
                    <div className="bg-white border border-red-200 p-2 rounded-lg text-center mt-1 shadow-sm">
                      <Lock size={12} className="mx-auto text-[#D32F2F] mb-1" />
                      <span className="text-[9px] font-black uppercase text-[#D32F2F] leading-tight block">
                        Admin Override: {activeBlock.reason}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}