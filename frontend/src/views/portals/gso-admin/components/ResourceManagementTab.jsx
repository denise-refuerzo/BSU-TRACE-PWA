import React, { useCallback, useEffect, useState } from 'react';
import { resourceApi } from '../resourceActions';
import { fetchWithAuth } from '../../../../api';
import ResourceRegistry from './ResourceRegistry';
import ResourceAdminCalendar from './ResourceAdminCalendar';
import { 
  Building2, Calendar, Landmark, Car, Users, Package, Boxes, ArrowRightLeft
} from 'lucide-react';

export default function ResourceManagementTab({ onOpenRequest, onSelectInventoryItem }) {
  const [data, setData] = useState({
    assets: [],
    fleet: { vehicles: [], drivers: [] },
    requests: [],
    blocks: [],
    inventory: []
  });
  const [error, setError] = useState('');
  
  const [activeSection, setActiveSection] = useState('schedule');

  const refresh = useCallback(async () => {
    try {
      const [assets, fleet, blocks, inventory, response] = await Promise.all([
        resourceApi('assets'),
        resourceApi('fleet'),
        resourceApi('schedule-blocks'),
        resourceApi('inventory'),
        fetchWithAuth('/api/procurement/reservations')
      ]);
      if (!response.ok) throw new Error('Could not load requests.');
      setData({ assets, fleet, blocks, inventory, requests: await response.json() });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navTabs = [
    { id: 'schedule', label: 'Schedule & Availability', icon: <Calendar size={14} /> },
    { id: 'facilities', label: 'Facilities & Rooms', icon: <Landmark size={14} /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Car size={14} /> },
    { id: 'drivers', label: 'Drivers', icon: <Users size={14} /> },
    { id: 'supplies', label: 'Equipment & Stock', icon: <Package size={14} /> }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* HEADER */}
      <header className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex items-center gap-4">
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">School Resources</h2>
          <p className="text-sm text-gray-500 mt-1">Manage campus facilities, vehicles, drivers, and inventory availability.</p>
        </div>
      </header>

      {error && (
        <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl text-xs font-semibold">
          {error}
          <button onClick={refresh} className="underline ml-3 cursor-pointer">Retry</button>
        </div>
      )}

      {/* UNIFIED CONTAINER */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        
        {/* TABS */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center overflow-x-auto">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-xl">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {activeSection === 'schedule' && (
            <ResourceAdminCalendar {...data} onRefresh={refresh} onOpenRequest={onOpenRequest} />
          )}

          {['facilities', 'vehicles', 'drivers'].includes(activeSection) && (
            <ResourceRegistry 
              assets={data.assets} 
              fleet={data.fleet} 
              onRefresh={refresh} 
              viewMode={activeSection} 
            />
          )}

          {activeSection === 'supplies' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.inventory.map(item => (
                  <div 
                    key={item.asd_id} 
                    className="p-5 rounded-xl bg-white border border-gray-200 shadow-2xs flex flex-col justify-between hover:border-red-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-50 text-red-800">
                            <Boxes size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{item.asset_name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {item.asd_id}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 divide-x divide-gray-200 rounded-xl bg-gray-50 mt-4 py-3 text-center border border-gray-100">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Available</p>
                          <p className="text-2xl font-black text-red-800 mt-0.5">{item.current_stock}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Stock</p>
                          <p className="text-2xl font-black text-gray-800 mt-0.5">{item.capacity}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectInventoryItem && onSelectInventoryItem(item)}
                      className="mt-4 w-full py-2.5 px-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <ArrowRightLeft size={13} /> Lend or Return
                    </button>
                  </div>
                ))}
              </div>

              {!data.inventory.length && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
                  <Package size={30} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-600">No equipment found</p>
                  <p className="text-xs text-gray-400 mt-1">Equipment and supplies registered in the system will display here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}