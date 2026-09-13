import {useEffect,useState} from 'react';
import {fetchWithAuth} from '../../../../api';

export default function CustomRouteReview({onChanged}) {
  const [routes,setRoutes]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [names,setNames]=useState({});
  const [filter,setFilter]=useState('pending');
  const load=async()=>{
    setLoading(true);
    try {const res=await fetchWithAuth('/api/custom-routes');const data=await res.json();if(!res.ok)throw new Error(data.error);setRoutes(data);setError('');}
    catch(err){setError(err.message);}finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);
  const review=async(p,decision)=>{
    setBusy(true);setError('');
    try {
      const res=await fetchWithAuth(`/api/custom-routes/${p.p_id}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,processName:names[p.p_id] ?? p.process_name})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      await load();onChanged();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const pending=routes.filter(p=>p.route_status==='custom').length;
  const visibleRoutes=[...routes].sort((a,b)=>(a.route_status==='custom'?0:1)-(b.route_status==='custom'?0:1)).filter(p=>filter==='all'||(filter==='pending'&&p.route_status==='custom')||(filter==='approved'&&p.route_status==='official')||(filter==='declined'&&p.route_status==='declined'));
  return <section className={`relative overflow-hidden border-2 rounded-2xl p-6 space-y-4 ${pending?'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-lg shadow-amber-100':'bg-white border-neutral-200'}`}>
    {pending>0&&<div className="absolute right-0 top-0 rounded-bl-xl bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-950">{pending} awaiting review</div>}
    <div className="relative min-h-14"><div><h3 className="font-bold text-lg text-rose-900 flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-800 text-white">↗</span>Custom route proposals</h3><p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mt-1">Review queue</p></div><div className="absolute right-0 bottom-0 flex items-center gap-3"><label className="text-xs font-semibold text-neutral-600">Show<select aria-label="Filter custom route proposals" value={filter} onChange={e=>setFilter(e.target.value)} className="ml-2 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs"><option value="pending">Pending review</option><option value="all">All routes</option><option value="approved">Approved</option><option value="declined">Kept private</option></select></label><button type="button" disabled={busy||loading} onClick={load} className="text-sm font-semibold underline">Refresh</button></div></div>
    <p className="text-sm text-gray-600">Documents already follow these routes. Approval publishes a process in the shared choices. Declining publication does not interrupt processing.</p>
    {error&&<p role="alert" className="text-red-800">{error}</p>}
    {loading?<p role="status">Loading proposals…</p>:!visibleRoutes.length?<p className="text-sm text-gray-500">No routes match this filter.</p>:<div className="max-h-96 overflow-y-auto space-y-4">{visibleRoutes.map(p=><article key={p.p_id} className={`border-2 rounded-2xl p-5 space-y-3 ${p.route_status==='custom'?'border-amber-300 bg-white shadow-md shadow-amber-100':'border-neutral-200'} `}>
      <div className="flex justify-between gap-4"><strong>{p.process_name}</strong><span className="text-xs uppercase">{p.route_status==='custom'?'Pending review':p.route_status}</span></div>
      <p className="text-sm">{p.category_name} · Submitted by {p.submitter_name}</p>
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-rose-800 mb-2">Office route sequence</p><p className="text-sm font-bold leading-6 text-rose-950">{p.route_names.map((name,i)=><span key={name+i} className="inline-flex items-center"><span className="rounded-lg bg-white border border-rose-200 px-2 py-1">{i+1}. {name}</span>{i<p.route_names.length-1&&<span className="mx-2 text-rose-500 text-lg">→</span>}</span>)}</p></div>
      {p.route_status==='custom'&&<div className="space-y-2"><label className="block text-sm">Official process name<input maxLength={100} value={names[p.p_id]??p.process_name} onChange={e=>setNames({...names,[p.p_id]:e.target.value})} className="block border rounded p-2 w-full"/></label><div className="flex gap-3"><button type="button" disabled={busy} onClick={()=>review(p,'approve')} className="bg-red-800 text-white rounded px-3 py-2 text-sm disabled:opacity-40">Approve as official</button><button type="button" disabled={busy} onClick={()=>review(p,'decline')} className="border rounded px-3 py-2 text-sm disabled:opacity-40">Keep private</button></div></div>}
    </article>)}</div>}
  </section>;
}
