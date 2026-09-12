import React, {useState} from 'react';
import {Pencil, Trash2, Plus, Archive, Users, Car, Building2} from 'lucide-react';
import {resourceApi,confirmResourceAction,resourceError,resourceSuccess} from '../resourceActions';
const input='w-full mt-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm';
const button='inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold shadow-sm transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50';
export default function ResourceRegistry({assets,fleet,onRefresh}) {
  const [editor,setEditor]=useState(null);
  const [filter,setFilter]=useState('All');
  const [busy,setBusy]=useState(false);
  const resourceRows=[...assets.filter(a=>a.ast_id!==4 || !fleet.vehicles.some(v=>v.asd_id===a.asd_id)).map(a=>({kind:'assets',id:a.asd_id,name:a.asset_name,type:a.asset_type,quantity:a.quantity,status:a.current_status,ast_id:a.ast_id,assetTypeId:String(a.ast_id)})),
    ...fleet.vehicles.map(v=>({kind:'vehicles',id:v.vehicle_id,name:v.vehicle_name,number:v.plate_number,type:'Vehicle',active:v.is_active,status:v.is_active?'Available':'Unavailable'}))];
  async function mutate(title,text,fn) {
    if(busy)return;setBusy(true);
    try {if(!await confirmResourceAction(title,text))return;const result=await fn();await onRefresh();await resourceSuccess(result.message);}
    catch(e){await resourceError(e);}finally{setBusy(false);}
  }
  const remove = row => mutate('Delete this record?', `Delete ${row.name}? Records linked to requests or blocks will be kept for history.`,()=>resourceApi(`registry/${row.kind}/${row.id}`,'DELETE'));
  async function save(e) {
    e.preventDefault();
    await mutate(editor.id?'Save these changes?':'Register this resource?',`Save the details for ${editor.name}?`,async()=>{
      const path=editor.id?`registry/${editor.kind}/${editor.id}`:editor.kind==='assets'?'assets':`fleet/${editor.kind}`;
      const result=await resourceApi(path,editor.id?'PUT':'POST',{...editor,assetName:editor.name,assetTypeId:editor.assetTypeId||'1'});
      setEditor(null);return result;
    });
  }
  function table(rows,drivers=false) {
    return <div className="overflow-auto max-h-[440px]"><table className="w-full text-sm text-left"><thead className="sticky top-0 bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500 z-10"><tr><th className="px-4 py-3">{drivers?'Driver':'Resource'}</th><th className="px-3 py-3">{drivers?'License number':'Type / Plate'}</th><th className="px-3 py-3">Availability</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map(row=><tr key={`${row.kind}-${row.id}`} className="hover:bg-gray-50/80 transition-colors"><td className="px-4 py-4 font-semibold text-gray-900"><div className="flex items-center gap-2.5"><span className={`p-2 rounded-lg shrink-0 ${drivers?'bg-blue-50 text-blue-600':row.type==='Vehicle'?'bg-amber-50 text-amber-600':'bg-red-50 text-[#D32F2F]'}`}>{drivers?<Users size={15}/>:row.type==='Vehicle'?<Car size={15}/>:<Building2 size={15}/>}</span><span>{row.name}</span></div></td><td className="px-3 py-4 text-xs text-gray-500">{row.number||row.type}</td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${row.status==='Available'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-800 border-amber-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{row.status}</span></td><td className="px-4 py-4"><div className="flex flex-wrap justify-end gap-1.5">
      {row.kind!=='assets'&&<button disabled={busy} className={button} onClick={()=>mutate('Change availability?',`${row.active?'Mark unavailable':'Mark available'}: ${row.name}. Existing confirmed requests remain assigned.`,()=>resourceApi(`fleet/${row.kind}/${row.id}/active`,'PUT',{active:!row.active}))}>{row.active?'Set unavailable':'Set available'}</button>}
      <button disabled={busy} aria-label={`Edit ${row.name}`} title={`Edit ${row.name}`} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={()=>setEditor({...row})}><Pencil size={15}/></button><button disabled={busy} aria-label={`Delete ${row.name}`} title={`Delete ${row.name}`} className="p-2 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors" onClick={()=>remove(row)}><Trash2 size={15}/></button>
    </div></td></tr>)}</tbody></table>{!rows.length&&<p className="p-6 text-sm text-gray-500">No records to display.</p>}</div>;
  }
  return <>
    <section className="h-[380px] flex flex-col bg-white border border-gray-200 border-t-4 border-t-[#D32F2F] rounded-2xl shadow-sm overflow-hidden [&>header]:shrink-0 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-auto [&>div]:overscroll-contain [scrollbar-gutter:stable]">
      <header className="p-5 space-y-4 border-b border-gray-100"><div className="flex items-center gap-3"><div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg"><Archive size={18}/></div><div><h3 className="text-base font-bold text-gray-900">Resource Registry</h3><p className="text-xs text-gray-500 mt-1">Facilities, equipment, and registered vehicles.</p></div></div><div className="flex flex-wrap gap-2"><select aria-label="Filter resource registry" value={filter} onChange={e=>setFilter(e.target.value)} className={`${button} bg-gray-50 mr-auto`}>{['All','Vehicle','Room','Gymnasium','Furniture'].map(v=><option key={v}>{v}</option>)}</select><button className={`${button} text-gray-700`} onClick={()=>setEditor({kind:'vehicles',name:'',number:'',active:true})}><Car size={14}/>Register vehicle</button><button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold shadow-sm bg-[#D32F2F] hover:bg-[#b71c1c] text-white" onClick={()=>setEditor({kind:'assets',name:'',quantity:1,assetTypeId:'1'})}><Plus size={14}/>Add New Asset</button></div></header>
      {table(resourceRows.filter(r=>filter==='All'||r.type===filter))}
    </section>
    <section className="h-[380px] flex flex-col bg-white border border-gray-200 border-t-4 border-t-blue-500 rounded-2xl shadow-sm overflow-hidden [&>header]:shrink-0 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-auto [&>div]:overscroll-contain [scrollbar-gutter:stable]"><header className="p-5 flex flex-wrap justify-between items-center gap-3 border-b border-gray-100"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users size={18}/></div><div><h3 className="text-base font-bold text-gray-900">Driver Registry</h3><p className="text-xs text-gray-500 mt-1">Driver details and availability.</p></div></div><button className={`${button} text-blue-700 bg-blue-50 border-blue-200`} onClick={()=>setEditor({kind:'drivers',name:'',number:'',active:true})}><Plus size={14}/>Register driver</button></header>{table(fleet.drivers.map(d=>({kind:'drivers',id:d.driver_id,name:d.full_name,number:d.license_number,active:d.is_active,status:d.is_active?'Available':'Unavailable'})),true)}</section>
    {editor&&<div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm flex justify-center items-center p-4"><form role="dialog" aria-modal="true" aria-label="Resource details" onSubmit={save} className="w-full max-w-lg bg-white shadow-xl rounded-2xl p-6 space-y-5"><h3 className="font-bold text-lg">{editor.id?'Edit details':editor.kind==='assets'?'Add New Asset':editor.kind==='vehicles'?'Register vehicle':'Register driver'}</h3><fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Name<input required maxLength={editor.kind==='assets'?100:255} value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} className={input}/></label>
      {editor.kind==='assets' ? <>
        <label className="block text-sm">Type
          {editor.ast_id===4 ? <input readOnly value="Vehicle" className={`${input} bg-gray-50`}/> : <select value={editor.assetTypeId} onChange={e=>setEditor({...editor,assetTypeId:e.target.value})} className={input}><option value="1">Room</option><option value="2">Gymnasium</option><option value="3">Equipment / Furniture</option></select>}
        </label>
        <label className="block text-sm">Quantity<input required type="number" min="1" step="1" value={editor.quantity} onChange={e=>setEditor({...editor,quantity:e.target.value})} className={input}/></label>
      </> : <>
        <label className="block text-sm">{editor.kind==='vehicles'?'Plate number':'License number'}<input required value={editor.number} onChange={e=>setEditor({...editor,number:e.target.value})} className={input}/></label>
        {editor.id&&<label className="block text-sm">Availability<select value={String(editor.active)} onChange={e=>setEditor({...editor,active:e.target.value==='true'})} className={input}><option value="true">Available</option><option value="false">Unavailable</option></select></label>}
      </>}
    </fieldset><footer className="flex justify-end gap-3 border-t pt-4"><button disabled={busy} type="button" onClick={()=>setEditor(null)} className={button}>Cancel</button><button disabled={busy} className={`${button} bg-red-800 text-white`}>{busy?'Saving…':'Save'}</button></footer></form></div>}
  </>;
}
