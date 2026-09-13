import {useEffect,useState,useCallback} from 'react';
import {fetchWithAuth} from '../../../../api';
import DocumentSubmissionModal from '../../originator/modals/DocumentSubmissionModal';
import OfficeDocumentModal from '../modals/OfficeDocumentModal';
import {formatPhilippineDateTime,formatPhilippineDate} from '../../../../utils/philippineTime';

export default function OfficeSubmissionsTab({officeId,onProcessed=()=>{}}) {
  const userId=localStorage.getItem('userId');
  const [estimateBase,setEstimateBase]=useState(()=>Date.now());
  const [documents,setDocuments]=useState([]);
  const [processTypes,setProcessTypes]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [workflowError,setWorkflowError]=useState('');
  const [showModal,setShowModal]=useState(false);
  const [selected,setSelected]=useState(null);
  const [revision,setRevision]=useState(null);
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState('');
  const [predictions,setPredictions]=useState([]);
  const [customHours,setCustomHours]=useState(null);
  const [form,setForm]=useState({title:'',processTypeId:'',confirmation:false,completeOriginProcessing:false});
  const load=useCallback(()=>fetchWithAuth(`/api/documents/${userId}`).then(async res=>{
    const data=await res.json();if(!res.ok)throw new Error(data.error);return data;
  }).then(data=>{setDocuments(data);setError('');}).catch(err=>setError(err.message)),[userId]);
  const workflows=useCallback(()=>fetchWithAuth('/api/process-types').then(async res=>{
    const data=await res.json();if(!res.ok)throw new Error(data.error);return data;
  }).then(data=>{setProcessTypes(data);setWorkflowError('');}).catch(err=>setWorkflowError(err.message)).finally(()=>setLoading(false)),[]);
  useEffect(()=>{load();workflows();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[officeId,load,workflows]);
  useEffect(()=>{let cancelled=false;fetchWithAuth('/api/analytics/edc').then(async res=>{if(res.ok){const data=await res.json();if(!cancelled&&Array.isArray(data))setPredictions(data);}}).catch(()=>{});return()=>{cancelled=true;};},[]);
  useEffect(()=>{let cancelled=false;const ids=form.customRoute?.stops?.filter(Boolean);if(!ids?.length){setCustomHours(null);return;}fetchWithAuth(`/api/analytics/edc?route=${ids.join(',')}`).then(async r=>r.ok?r.json():[]).then(d=>{if(!cancelled)setCustomHours(d[0]?.estimated_hours_to_complete ?? null);}).catch(()=>setCustomHours(null));return()=>{cancelled=true;};},[form.customRoute?.stops?.join(',')]);
  const process=processTypes.find(p=>String(p.p_id)===String(form.processTypeId));
  const eligible=form.customRoute ? Number(form.customRoute.stops[0])===Number(officeId) : process && Number(process.resolved_origin_office_id)===Number(officeId);
  const hours=Number(predictions.find(p=>Number(p.process_id)===Number(form.processTypeId))?.estimated_hours_to_complete);
  const estimate=Number.isFinite(hours)&&hours>=0?new Date(estimateBase+hours*3600000):null;
  const edc=estimate?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(estimate):null;
  const customEdc=form.customRoute?.stops?.every(Boolean) && customHours !== null ? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+customHours*3600000)) : null;
  const resolvedEdc=form.customRoute?customEdc:edc;
  const submit=async e=>{
    e.preventDefault();if(busy)return;if(!resolvedEdc){setError('Estimated delivery is still being calculated. Complete the route stops first.');return;}setBusy(true);setError('');
    try {
      const res=await fetchWithAuth('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:form.title,processTypeId:Number(form.processTypeId),customRoute:form.customRoute,edc:resolvedEdc,completeOriginProcessing:Boolean(eligible && form.completeOriginProcessing)})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      setShowModal(false);setForm({title:'',processTypeId:'',confirmation:false,completeOriginProcessing:false});
      await load();onProcessed();setSelected({ini_id:data.iniId});
    } catch(err){setError(err.message);} finally{setBusy(false);}
  };
  const resubmit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try {
      const res=await fetchWithAuth(`/api/documents/${revision.ini_id}/resubmit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:revision.title})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      setRevision(null);await load();onProcessed();
    } catch(err){setError(err.message);} finally{setBusy(false);}
  };
  return <div className="max-w-6xl mx-auto space-y-5 text-left">
    <div className="flex justify-between gap-3"><div><h2 className="text-2xl font-bold">Office Submissions</h2><p className="text-sm text-gray-500">Documents submitted by your office. Routes follow the selected process type.</p></div><button onClick={()=>{setEstimateBase(Date.now());setLoading(true);setShowModal(true);workflows();}} className="bg-red-800 text-white px-4 py-2 rounded-xl text-sm">Submit Document</button></div>
    {error && !showModal && <p role="alert" className="text-red-800">{error}</p>}
    <input aria-label="Search submissions" placeholder="Search title or tracking reference" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded-lg p-3 text-sm w-full"/>
    <div className="overflow-x-auto bg-white rounded-xl border"><table className="w-full text-sm"><thead><tr className="text-left bg-gray-50"><th className="p-4">Document</th><th>Submitted by</th><th>Current office</th><th>Status</th><th>Actions</th></tr></thead><tbody>{documents.filter(d=>(d.title+' '+d.qr_code).toLowerCase().includes(search.toLowerCase())).map(d=><tr key={d.ini_id} className="border-t"><td className="p-4"><strong>{d.title}</strong><p className="text-xs text-gray-500">{formatPhilippineDateTime(d.created_at)} · Philippine time</p></td><td>{d.submitted_by}</td><td>{d.current_office}</td><td>{d.status}</td><td className="p-3"><button className="underline text-red-800" onClick={()=>setSelected(d)}>Details / QR</button>{d.status?.toLowerCase()==='action required' && <div className="mt-2"><p className="text-xs text-red-800 max-w-64">{d.last_action}</p>{d.release_time?<button className="underline" onClick={()=>setRevision({...d})}>Correct and resubmit</button>:<span className="text-xs">Awaiting release from returning office</span>}</div>}</td></tr>)}</tbody></table>{!documents.length&&<p className="p-6 text-gray-500">No office submissions yet.</p>}</div>
    {showModal&&<DocumentSubmissionModal setShowModal={setShowModal} submitDocument={submit} form={form} setForm={setForm} handleProcessChange={id=>setForm({...form,processTypeId:id,completeOriginProcessing:false})} processTypes={processTypes} workflowsLoading={loading} workflowError={workflowError} retryWorkflows={()=>{setLoading(true);workflows();}} estimatedDate={form.customRoute?(customEdc?formatPhilippineDate(customEdc):'Complete the route to calculate'):(estimate?formatPhilippineDate(estimate):"Estimate unavailable")} selectedRoutePreview={process?.resolved_route_names || []} canCompleteOriginProcessing={eligible} submitting={busy} submissionError={error}/>}
    {selected&&<OfficeDocumentModal selectedDoc={selected} processorOfficeId={officeId} officesList={[]} isHistoryDetails onClose={()=>setSelected(null)} onRefresh={load}/>}
    {revision&&<div className="fixed inset-0 bg-black/40 z-50 p-4 flex items-center justify-center"><form onSubmit={resubmit} className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4"><h3 className="font-bold">Correct and resubmit</h3><p className="text-sm text-red-800">{revision.last_action}</p><label className="block text-sm">Document title<input required maxLength={150} value={revision.title} onChange={e=>setRevision({...revision,title:e.target.value})} className="border rounded p-2 w-full"/></label><label className="flex gap-2 text-sm"><input type="checkbox" required/>I have corrected the document and its supporting materials.</label>{error&&<p role="alert" className="text-red-800">{error}</p>}<button disabled={busy} type="submit" className="bg-red-800 text-white px-4 py-2 rounded">Resubmit</button><button disabled={busy} type="button" onClick={()=>setRevision(null)} className="ml-3">Cancel</button></form></div>}
  </div>;
}
