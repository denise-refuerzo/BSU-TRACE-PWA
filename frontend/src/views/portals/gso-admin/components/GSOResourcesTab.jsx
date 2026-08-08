import React from 'react';
import { Plus, Archive, Car, Building, Edit, Trash2, Calendar, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

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
      <div className="flex justify-between items-end border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900">Administrative Asset Management</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">Hub for managing institutional resources and logistics</p>
        </div>
        <button onClick={() => setShowAddAssetModal(true)} className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <Plus size={16} /> Add New Asset
        </button>
      </div>

      {/* TOP ROW: Management Table & Inventory Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Resource Management Master Table */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              <Archive size={16} className="text-red-800" /> Resource Management
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-neutral-500">Filter:</span>
              <select className="border border-neutral-300 rounded-lg px-2 py-1 outline-none font-bold text-neutral-700 bg-neutral-50">
                <option value="All">All Assets</option>
                <option value="Room">Rooms</option>
                <option value="Vehicle">Vehicles</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-red-50/50 border-b border-neutral-200 font-black uppercase text-[10px] text-neutral-600 tracking-wider">
                  <th className="p-3 pl-4">Asset Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
              {assetsList.map((asset) => (
                <tr key={asset.asd_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3 pl-4 flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${asset.ast_id === 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-800'}`}>
                      {asset.ast_id === 4 ? <Car size={16} /> : <Building size={16} />}
                    </div>
                    <span className="font-bold text-neutral-900">{asset.asset_name}</span>
                  </td>
                  <td className="p-3 text-neutral-600">{asset.asset_type === 'Furniture' ? 'Equipment' : asset.asset_type}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 border rounded-md font-bold text-[9px] uppercase tracking-wide
                      ${asset.current_status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' : 
                        asset.current_status === 'Maintenance' ? 'bg-neutral-100 text-neutral-700 border-neutral-300' : 
                        'bg-red-50 text-red-700 border-red-200'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${asset.current_status === 'Available' ? 'bg-green-500' : asset.current_status === 'Maintenance' ? 'bg-neutral-500' : 'bg-red-500'}`}></span> 
                      {asset.current_status}
                    </span>
                  </td>
                  <td className="p-3 text-right pr-4">
                    <div className="flex items-center justify-end gap-4 text-red-800">
                      <button onClick={() => handleOpenEditModal(asset)} className="hover:text-red-900 transition-transform hover:scale-110"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteAsset(asset.asd_id, asset.asset_name)} className="hover:text-red-900 transition-transform hover:scale-110"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {assetsList.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-neutral-400 font-bold">No assets found in the registry.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Logistics Inventory */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm bg-neutral-50/30">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4">
            <Archive size={16} className="text-red-800" /> Logistics Inventory
          </h3>
          
          <div className="space-y-4">
            {equipmentInventory.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-bold">No equipment registered.</div>
            ) : (
              equipmentInventory.map((item) => (
                <div key={item.asd_id} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <h4 className="font-black text-neutral-900 text-sm">{item.asset_name}</h4>
                  <span className="text-[9px] text-neutral-400 font-black uppercase tracking-wider block mt-0.5">EQP-ID-{item.asd_id}</span>
                  
                  <div className="flex justify-between items-center mt-4 mb-5">
                    <div className="text-center w-1/2 border-r border-neutral-100">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Current</span>
                      <p className="text-xl font-black text-red-800 leading-none mt-1">{item.current_stock}</p>
                    </div>
                    <div className="text-center w-1/2">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Capacity</span>
                      <p className="text-xl font-black text-neutral-800 leading-none mt-1">{item.capacity}</p>
                    </div>
                  </div>
                  
                  <button onClick={() => { setSelectedInventoryItem(item); setShowInventoryModal(true); }} className="w-full py-2 border border-red-200 text-red-800 bg-red-50 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Edit size={14} /> Update Stock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Calendar Availability Control */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm mt-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              <Calendar size={16} className="text-red-800" /> Calendar Availability Control
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-1">Block dates for maintenance or priority events.</p>
            <button onClick={() => setShowBlackoutModal(true)} className="mt-3 px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2">
              <Lock size={12} /> Block Dates
            </button>
          </div>
          
          <div className="bg-neutral-100 p-1 rounded-xl flex font-bold text-[10px]">
            {['Vehicle', 'Multimedia Room', 'Gymnasium'].map((tab) => (
              <button key={tab} onClick={() => setActiveCalendarTab(tab)} className={`px-4 py-2 rounded-lg uppercase tracking-wider transition-colors ${activeCalendarTab === tab ? 'bg-red-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-black text-neutral-900">
            <span>{monthNames[month]} {year}</span>
            <div className="flex gap-1 border rounded-lg p-1 bg-neutral-50">
              <button onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 border rounded-lg p-2 bg-neutral-50 text-[10px] font-black text-center text-neutral-400">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day}>{day}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={index} className="bg-neutral-50/50 border border-dashed border-neutral-100 rounded-xl min-h-[90px]"></div>;
              
              const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const activeBlock = assetBlackouts.find(blk => {
                if (blk.asset_name !== mappedAsset) return false;
                const start = new Date(blk.start_time).toISOString().split('T')[0];
                const end = new Date(blk.end_time).toISOString().split('T')[0];
                return dayString >= start && dayString <= end;
              });

              return (
                <div key={index} className={`border rounded-xl p-2 min-h-[90px] flex flex-col justify-between transition-colors ${activeBlock ? 'bg-red-50/50 border-red-200' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}>
                  <span className={`text-xs font-black block self-start ${activeBlock ? 'text-red-800' : 'text-neutral-400'}`}>{day}</span>
                  {activeBlock && (
                    <div className="bg-white border border-red-200 p-1.5 rounded-lg text-center mt-1">
                      <Lock size={12} className="mx-auto text-red-700 mb-0.5" />
                      <span className="text-[8px] font-black uppercase text-red-800 leading-tight block">{activeBlock.reason}</span>
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