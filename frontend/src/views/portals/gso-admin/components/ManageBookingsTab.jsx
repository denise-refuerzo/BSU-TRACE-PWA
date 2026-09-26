import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Car, Filter, Inbox, Search, Settings2, X } from 'lucide-react';
import { resourceApi, resourceError, resourceSuccess } from '../resourceActions';

const badgeClasses = {
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Ongoing: 'bg-blue-50 text-blue-700 border-blue-200',
  Delayed: 'bg-amber-50 text-amber-700 border-amber-200',
  Rescheduled: 'bg-violet-50 text-violet-700 border-violet-200',
  'Resource Reassigned': 'bg-cyan-50 text-cyan-700 border-cyan-200'
};

function ManageModal({ booking, onClose, onSaved }) {
  const [action, setAction] = useState('Delayed');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(booking.reservation_date || '');
  const [start, setStart] = useState(booking.start_time?.slice(0, 5) || '');
  const [end, setEnd] = useState(booking.end_time?.slice(0, 5) || '');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await resourceApi(`manage-bookings/${booking.booking_id}`, 'PUT', {
        status: action, reason, date, start, end
      });
      await onSaved();
      onClose();
      await resourceSuccess(result.notification || result.message);
    } catch (error) {
      await resourceError(error);
    } finally {
      setBusy(false);
    }
  }

  const needsSchedule = action === 'Delayed' || action === 'Rescheduled';
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div><h3 className="flex items-center gap-2 font-bold text-gray-900"><Settings2 size={18} className="text-red-800" /> Manage Booking</h3>
            <p className="mt-1 text-xs text-gray-500">{booking.requestor} · {booking.purpose}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </header>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
          <strong>{booking.reservation_date}</strong> · {booking.start_time?.slice(0,5)}–{booking.end_time?.slice(0,5)} · {booking.asset_name || booking.vehicle_to_be_used || 'Resource pending'}
        </div>
        <label className="block text-xs font-bold text-gray-700">Booking update
          <select value={action} onChange={e=>setAction(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-red-800">
            <option value="Delayed">Delayed</option><option value="Rescheduled">Rescheduled</option>
            <option value="Cancelled">Cancelled</option><option value="Completed">Mark as Completed</option>
          </select>
        </label>
        {needsSchedule && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {action==='Rescheduled' && <label className="text-xs font-bold text-gray-700">New date<input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"/></label>}
          <label className="text-xs font-bold text-gray-700">Revised start<input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"/></label>
          <label className="text-xs font-bold text-gray-700">Revised end<input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"/></label>
        </div>}
        {action!=='Completed' && <label className="block text-xs font-bold text-gray-700">Reason
          <textarea required maxLength={800} value={reason} onChange={e=>setReason(e.target.value)} rows={4} placeholder="State the specific reason shown in the requester notification…" className="mt-1 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-red-800"/>
        </label>}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0"/>This update is recorded and its structured notice becomes visible to the requester.</div>
        <footer className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold">Back</button><button disabled={busy} className="rounded-xl bg-red-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?'Saving…':'Save Update'}</button></footer>
      </form>
    </div>
  );
}

export default function ManageBookingsTab({ onAssignVehicle }) {
  const [bookings,setBookings]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('All'); const [selected,setSelected]=useState(null);
  const refresh=async()=>{setLoading(true);try{setBookings(await resourceApi('manage-bookings'));setError('');}catch(e){setError(e.message);}finally{setLoading(false);}};
  useEffect(()=>{let active=true;resourceApi('manage-bookings').then(data=>{if(active){setBookings(data);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const rows=useMemo(()=>bookings.filter(b=>(filter==='All'||b.status===filter)&&`${b.requestor} ${b.purpose} ${b.asset_name||''}`.toLowerCase().includes(search.toLowerCase())),[bookings,filter,search]);
  return <div className="mx-auto max-w-8xl space-y-6 text-left">
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs md:flex-row md:items-center"><p className="text-sm text-gray-500">Operate approved facility and vehicle bookings until completion.</p><div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">{bookings.length} active booking{bookings.length===1?'':'s'}</div></header>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:justify-end"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search booking…" className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-xs sm:w-64"/></div><div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3"><Filter size={14} className="text-gray-400"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="bg-transparent py-2.5 text-xs font-bold outline-none"><option>All</option><option>Approved</option><option>Ongoing</option><option>Delayed</option><option>Rescheduled</option><option>Resource Reassigned</option></select></div></div>
      {error&&<div className="m-4 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-800">{error} <button onClick={refresh} className="underline">Retry</button></div>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-red-50/60 text-[11px] uppercase tracking-wider text-red-950"><th className="p-4">Booking</th><th className="p-4">Schedule</th><th className="p-4">Resource</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">
        {rows.map(b=><tr key={b.booking_id} className="hover:bg-gray-50"><td className="p-4"><strong className="block text-gray-900">{b.purpose}</strong><span className="text-xs text-gray-500">{b.requestor} · {b.booking_type}</span></td><td className="p-4"><strong className="block text-xs">{b.reservation_date}</strong><span className="text-xs text-gray-500">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span></td><td className="p-4 text-xs text-gray-700">{b.asset_name||b.vehicle_to_be_used||'Not assigned'}{b.designated_driver&&<span className="block text-gray-400">{b.designated_driver}</span>}</td><td className="p-4"><span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase ${badgeClasses[b.status]||badgeClasses.Approved}`}>{b.status}</span></td><td className="p-4"><div className="flex justify-end gap-2">{b.booking_type==='Vehicle'&&<button onClick={()=>onAssignVehicle(b)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-[11px] font-bold hover:bg-gray-50"><Car size={13}/>Reassign</button>}<button onClick={()=>setSelected(b)} className="inline-flex items-center gap-1 rounded-lg bg-red-800 px-3 py-2 text-[11px] font-bold text-white"><Settings2 size={13}/>Manage</button></div></td></tr>)}
        {!loading&&!rows.length&&<tr><td colSpan="5" className="p-12 text-center text-sm text-gray-400"><Inbox className="mx-auto mb-2"/>No active bookings match this view.</td></tr>}
        {loading&&<tr><td colSpan="5" className="p-12 text-center text-sm text-gray-400">Loading active bookings…</td></tr>}
      </tbody></table></div>
    </section>
    {selected&&<ManageModal booking={selected} onClose={()=>setSelected(null)} onSaved={refresh}/>} 
  </div>;
}
