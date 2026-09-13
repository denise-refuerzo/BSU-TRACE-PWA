import React,{useCallback,useEffect,useState} from 'react';
import {resourceApi} from '../resourceActions';
import {fetchWithAuth} from '../../../../api';
import ResourceRegistry from './ResourceRegistry';
import ResourceAdminCalendar from './ResourceAdminCalendar';
import {Building2, Package, Boxes} from 'lucide-react';
export default function ResourceManagementTab({onOpenRequest}) {
  const [data,setData]=useState({assets:[],fleet:{vehicles:[],drivers:[]},requests:[],blocks:[],inventory:[]});
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try {
      const [assets,fleet,blocks,inventory,response]=await Promise.all([resourceApi('assets'),resourceApi('fleet'),resourceApi('schedule-blocks'),resourceApi('inventory'),fetchWithAuth('/api/procurement/reservations')]);
      if(!response.ok)throw new Error('Could not load requests.');
      setData({assets,fleet,blocks,inventory,requests:await response.json()});setError('');
    }catch(e){setError(e.message);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  return <div className="max-w-7xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
    <header className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className="p-3 bg-red-50 border border-red-100 text-[#D32F2F] rounded-xl"><Building2 size={26}/></div>
      <div><h2 className="text-2xl font-bold text-gray-900 tracking-tight">School Resources</h2><p className="text-sm text-gray-500 mt-1">Manage institutional assets, drivers, and resource availability.</p></div>
    </header>
    {error&&<div role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{error}<button onClick={refresh} className="underline ml-3">Retry</button></div>}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <div className="xl:col-span-2 min-w-0 space-y-6"><ResourceRegistry assets={data.assets} fleet={data.fleet} onRefresh={refresh}/></div>
      <aside className="min-w-0 xl:h-[784px] flex flex-col bg-white border border-gray-200 border-t-4 border-t-emerald-500 rounded-2xl shadow-sm overflow-hidden">
        <header className="p-5 border-b border-gray-100 flex items-center gap-3"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Package size={18}/></div><div><h3 className="text-base font-bold text-gray-900">Logistics Inventory</h3><p className="text-xs text-gray-500 mt-1">Current equipment stock</p></div></header>
        <div className="p-5 bg-gray-50/50 flex flex-col gap-4 min-h-0 flex-1 max-h-[680px] xl:max-h-none overflow-y-auto overscroll-contain">
          {data.inventory.map(item=><div key={item.asd_id} className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm min-h-[220px] flex-1 flex flex-col justify-between shrink-0">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-50 text-[#D32F2F]"><Boxes size={18}/></div><div><h4 className="text-sm font-bold text-gray-900">{item.asset_name}</h4><p className="text-[10px] text-gray-400 mt-1 font-mono">EQP-ID-{item.asd_id}</p></div></div>
            <div className="grid grid-cols-2 divide-x divide-gray-200 rounded-lg bg-gray-50 mt-5 py-3 text-center"><div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Available</p><p className="text-3xl font-black text-[#D32F2F] mt-1">{item.current_stock}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Capacity</p><p className="text-3xl font-black text-gray-800 mt-1">{item.capacity}</p></div></div>
          </div>)}
          {!data.inventory.length&&<div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"><Package size={28} className="mx-auto text-gray-300 mb-3"/><p className="text-sm text-gray-500">No equipment registered.</p></div>}
        </div>
      </aside>
    </div>
    <ResourceAdminCalendar {...data} onRefresh={refresh} onOpenRequest={onOpenRequest}/>
  </div>;
}
