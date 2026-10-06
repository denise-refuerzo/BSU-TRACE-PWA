import React, {useState} from 'react';
import {fetchWithAuth} from '../../../../api';
import {blockOnDay,blockMatchesResource} from '../../../../utils/resourceSchedule';

export default function ResourceDayModal({date, facility, bookings, blocks=[], onClose, onRequest, today}) {
  const [start,setStart]=useState(''); const [end,setEnd]=useState('');
  const [result,setResult]=useState(null);const [busy,setBusy]=useState(false);
  const type=facility==='Van'?'Vehicle':facility==='Gymnasium'?'Gymnasium':'Room';
  const dayBlocks=blocks.filter(block=>blockMatchesResource(block,facility)&&blockOnDay(block,date));
  const entries=bookings.filter(b=>b.booking_type===type && new Date(b.reservation_date).toLocaleDateString('en-CA')===date).sort((a,b)=>(a.vr_start||a.gm_start||'').localeCompare(b.vr_start||b.gm_start||''));
  
  async function check(e) {
    e.preventDefault();setBusy(true);setResult(null);
    try {const res=await fetchWithAuth(`/api/resources/availability?${new URLSearchParams({date,start,end,type,assetName:facility})}`);const data=await res.json();if(!res.ok)throw new Error(data.error);setResult(data);}
    catch(e){setResult({available:false,reason:e.message});}finally{setBusy(false);}
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-label="Daily schedule" className="bg-white dark:bg-[#180e10] border border-neutral-200 dark:border-[#42292f] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 space-y-5 text-left">
        
        <header className="flex justify-between gap-4 border-b border-neutral-100 dark:border-[#42292f] pb-3">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{facility === 'Van' ? 'Vehicles' : facility} · {date}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approved active bookings occupy their assigned resources. Pending requests do not block a time.</p>
          </div>
          <button onClick={onClose} aria-label="Close daily schedule" className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer font-bold">✕</button>
        </header>

        <div className="space-y-3">
          {entries.length ? entries.map(b => {
            const active=!['Pending','Reserved','Cancelled','Completed'].includes(b.status);
            return (
              <article key={b.booking_id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1113] p-4 shadow-sm">
                <div className="flex justify-between gap-3">
                  <strong className="text-sm text-neutral-900 dark:text-white">{(b.vr_start||b.gm_start)?.slice(0,5)} – {(b.vr_end||b.gm_end)?.slice(0,5)}</strong>
                  <span className={`text-xs rounded-full px-3 py-1 font-bold ${active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}`}>
                    {b.status==='Confirmed' ? 'Approved' : b.status}
                  </span>
                </div>
                <p className="text-sm mt-2 text-neutral-700 dark:text-gray-300">{b.purpose}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.full_name}{b.destination ? ` · ${b.destination}` : ''}</p>
              </article>
            );
          }) : (
            <p className="bg-gray-50 dark:bg-[#1c1113] border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-sm text-gray-500 dark:text-gray-400">No requests submitted for this day.</p>
          )}
        </div>

        {dayBlocks.map(block => (
          <article key={block.block_id} className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-red-900 dark:text-red-300">
            <strong className="text-sm">Blocked · {block.vehicle_name||block.asset_name}{block.plate_number?` · ${block.plate_number}`:''}</strong>
            <p className="text-xs mt-1">{block.whole_day?'Whole day':`${block.start_time.replace('T',' ')} – ${block.end_time.replace('T',' ')}`}</p>
            <p className="text-sm mt-2">{block.reason}</p>
          </article>
        ))}

        {!!dayBlocks.length && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {facility==='Van' ? 'A blocked vehicle does not block other available vans and drivers.' : 'Other times may still be available outside the blocked period.'} Check your preferred time below.
          </p>
        )}

        {date >= today && (
          <form onSubmit={check} className="border-t border-neutral-100 dark:border-[#42292f] pt-5 space-y-4">
            <h4 className="font-semibold text-neutral-900 dark:text-white">Check your preferred time</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm text-neutral-700 dark:text-gray-300">{type==='Vehicle' ? 'Departure' : 'Start'}
                <input required type="time" value={start} disabled={busy} onChange={e=>{setStart(e.target.value);setResult(null)}} className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg p-2 mt-1 outline-none text-xs" />
              </label>
              <label className="text-sm text-neutral-700 dark:text-gray-300">{type==='Vehicle' ? 'Arrival' : 'End'}
                <input required type="time" min={start} value={end} disabled={busy} onChange={e=>{setEnd(e.target.value);setResult(null)}} className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg p-2 mt-1 outline-none text-xs" />
              </label>
            </div>
            <button disabled={busy} className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] hover:bg-neutral-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-gray-200 cursor-pointer">
              {busy ? 'Checking…' : 'Check availability'}
            </button>
            {result && (
              <div role="status" className={`p-4 rounded-xl text-sm ${result.available ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                {result.reason}
                {result.available && (
                  <button type="button" onClick={()=>onRequest(start,end)} className="block mt-3 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm">
                    New Request
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}