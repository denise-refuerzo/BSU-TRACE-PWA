import React, {useEffect, useState} from 'react';
import {resourceApi, confirmResourceAction, resourceSuccess, resourceError} from '../resourceActions';
export default function VehicleAssignmentModal({request, onClose, onSaved}) {
  const [start,setStart]=useState(request.start_time?.slice(0,5)||'');
  const [end,setEnd]=useState(request.end_time?.slice(0,5)||'');
  const [options,setOptions]=useState(null);
  const [vehicleId,setVehicleId]=useState('');
  const [driverId,setDriverId]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const input='mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm';
  useEffect(()=>{
    let cancelled=false;
    setOptions(null);setVehicleId('');setDriverId('');setError('');
    if(!start||!end||start>=end) {setError('Enter arrival after departure to see available assignments.');return;}
    resourceApi(`assignments/${request.booking_id}/options?${new URLSearchParams({start,end})}`)
      .then(data=>{if(!cancelled)setOptions(data);}).catch(e=>{if(!cancelled)setError(e.message);});
    return ()=>{cancelled=true;};
  },[request.booking_id,start,end]);
  async function save(e) {
    e.preventDefault();if(busy)return;setBusy(true);
    try {
      if(!await confirmResourceAction('Save this assignment?', 'This will update the vehicle, driver, and travel times for this request.'))return;
      const result=await resourceApi(`assignments/${request.booking_id}`,'PUT',{vehicleId,driverId,start,end});
      await onSaved();onClose();await resourceSuccess(result.message);
    } catch(e){await resourceError(e);}finally{setBusy(false);}
  }
  return <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <form role="dialog" aria-modal="true" aria-label="Assign vehicle and driver" onSubmit={save} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-5">
      <header><h3 className="text-lg font-bold">Assign vehicle and driver</h3><p className="text-sm text-gray-500 mt-1">Request #{request.booking_id} · {request.requestor}</p></header>
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid grid-cols-2 gap-4"><label className="text-sm">Departure<input type="time" required value={start} onChange={e=>setStart(e.target.value)} className={input}/></label><label className="text-sm">Arrival<input type="time" required value={end} onChange={e=>setEnd(e.target.value)} className={input}/></label></div>
        {error?<p role="alert" className="text-sm text-red-700">{error}</p>:!options?<p className="text-sm text-gray-500">Checking availability…</p>:<>
          <p className="text-sm rounded-lg bg-gray-50 p-3">{options.reason}</p>
          <label className="block text-sm">Vehicle<select required value={vehicleId} onChange={e=>setVehicleId(e.target.value)} className={input}><option value="">Choose an available vehicle</option>{options.vehicles.map(v=><option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_name} · {v.plate_number}</option>)}</select></label>
          <label className="block text-sm">Driver<select required value={driverId} onChange={e=>setDriverId(e.target.value)} className={input}><option value="">Choose an available driver</option>{options.drivers.map(d=><option key={d.driver_id} value={d.driver_id}>{d.full_name}</option>)}</select></label>
        </>}
      </fieldset>
      <footer className="flex justify-end gap-3 border-t pt-4"><button disabled={busy} type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button><button disabled={busy||!vehicleId||!driverId} className="px-4 py-2 bg-red-800 text-white rounded-lg disabled:opacity-50">Save assignment</button></footer>
    </form>
  </div>;
}
