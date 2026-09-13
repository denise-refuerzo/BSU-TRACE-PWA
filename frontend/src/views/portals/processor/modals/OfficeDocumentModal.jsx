import {useEffect, useState, useRef} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {FileText, X, GitBranch, Clock3, Building2, ArrowRight, CheckCircle2, ShieldCheck, LogIn, LogOut, PenLine, Undo2, MessageSquare} from 'lucide-react';
import {fetchWithAuth} from '../../../../api';
import {formatPhilippineDateTime,formatPhilippineDate} from '../../../../utils/philippineTime';

function StatusBadge({step}) {
  const states={
    1:{label:step?.time_in?'Pending review':'Awaiting receipt',style:'bg-amber-50 text-amber-800 border-amber-200'},
    2:{label:'In verification',style:'bg-purple-50 text-purple-800 border-purple-200'},
    3:{label:step?.time_out?'Released':'Signed',style:'bg-emerald-50 text-emerald-800 border-emerald-200'},
    4:{label:'Needs correction',style:'bg-rose-50 text-rose-800 border-rose-200'},
    5:{label:'Completed',style:'bg-emerald-50 text-emerald-800 border-emerald-200'}
  };
  const state=step?.completed_via_adhoc ? {label:'Completed via ad hoc',style:'bg-emerald-50 text-emerald-800 border-emerald-200'} : states[step?.s_id] || {label:step?.current_status || 'Pending',style:'bg-neutral-50 text-neutral-700 border-neutral-200'};
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${state.style}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{state.label}</span>;
}

export default function OfficeDocumentModal({selectedDoc,processorOfficeId,officesList,isHistoryDetails,onClose,onRefresh,onOpenChat}) {
  const [doc,setDoc] = useState(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [reason,setReason] = useState('');
  const [target,setTarget] = useState('');
  const [mode,setMode] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const actionPanel = useRef(null);
  useEffect(()=>{
    if (mode || confirmation) actionPanel.current?.scrollIntoView({block:'nearest',behavior:'smooth'});
  },[mode,confirmation]);
  useEffect(() => {
    let cancelled=false;
    fetchWithAuth(`/api/office/documents/${selectedDoc.ini_id}`).then(async res => {
      const data=await res.json(); if (!res.ok) throw new Error(data.error);
      if (!cancelled) setDoc(data);
    }).catch(err => {if (!cancelled) setError(err.message);});
    return () => {cancelled=true;};
  },[selectedDoc.ini_id]);
  const halted=doc?.steps?.at(-1)?.s_id===4 && doc?.steps?.at(-1)?.time_out;
  const step=halted ? null : doc?.steps?.findLast(s => !s.time_out);
  const mine=step && Number(step.current_office_id)===Number(processorOfficeId) && !isHistoryDetails;
  const pending=mine && step.time_in && step.s_id===1;
  const act=async action => {
    setBusy(true);setError('');
    try {
      const path=action==='adhoc' ? '/api/processor/documents/ad-hoc' : action.startsWith('time-') ? `/api/documents/scan-${action==='time-in'?'in':'out'}` : `/api/office/${action}`;
      const res=await fetchWithAuth(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({iniId:doc.ini_id,qrCode:doc.qr_code,reason,targetOfficeId:Number(target)})});
      const data=await res.json();if (!res.ok) throw new Error(data.error);
      onRefresh();onClose();
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  };
  const button='trace-button';
  return <div className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="office-document-title" className="bg-white rounded-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden text-left shadow-2xl border border-white/30">
      <header className="trace-dialog-header shrink-0 px-5 py-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2.5"><FileText size={21}/></span><div><p className="text-[10px] uppercase tracking-[.18em] text-white/70 mb-0.5">BSU · Document tracking</p><h2 id="office-document-title" className="font-bold text-base">Document Details</h2></div></div>
        <button disabled={busy} onClick={onClose} aria-label="Close document" className="p-2 rounded-full hover:bg-white/15 text-white"><X size={20}/></button>
      </header>
      <div className="trace-dialog-body min-h-0 overflow-y-auto overscroll-contain">
        {error && <p role="alert" className="m-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</p>}
        {!doc ? <p className="p-6 text-sm text-neutral-500">Loading document…</p> : <div className="p-5 sm:p-6 space-y-5">
          <div className="grid md:grid-cols-[1fr_180px] gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3"><span className="rounded-md bg-rose-50 border border-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800">{doc.process_name}</span><StatusBadge step={step || doc.steps.at(-1)}/></div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 break-words">{doc.title}</h3>
              <p className="font-mono text-[11px] text-rose-800 mt-2 break-all">{doc.qr_code}</p>
              <dl className="text-xs grid grid-cols-2 gap-x-5 gap-y-4 mt-5">
                <div><dt className="trace-field-label">Originating office</dt><dd className="font-semibold text-neutral-700">{doc.steps[0]?.office_name}</dd></div>
                <div><dt className="trace-field-label">Submitted by</dt><dd className="font-semibold text-neutral-700">{doc.submitted_by}</dd></div>
                <div><dt className="trace-field-label">Created</dt><dd className="text-neutral-600">{formatPhilippineDateTime(doc.created_at)}</dd></div>
                <div><dt className="trace-field-label">Estimated delivery</dt><dd className="text-neutral-600">{doc.edc ? formatPhilippineDate(doc.edc) : 'Not set at submission'}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 flex flex-col items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-800"><ShieldCheck size={14}/> Tracking QR</span>
              <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm"><QRCodeSVG value={doc.qr_code} size={116} fgColor="#701126" level="M"/></div>
              <p className="text-[10px] text-center text-neutral-500">Scan to identify this document</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-4">
            <div className="flex gap-2.5"><Building2 size={17} className="text-rose-800 shrink-0 mt-0.5"/><div><span className="trace-field-label">Current office</span><p className="text-xs font-semibold text-neutral-800">{step?.office_name || doc.steps.at(-1)?.office_name}</p></div></div>
            <ArrowRight size={17} className="hidden sm:block text-rose-300 self-center"/>
            <div><span className="trace-field-label">Next office</span><p className="text-xs font-semibold text-neutral-700">{step?.next_office_name || '—'}</p></div>
          </div>

          {doc.route_names?.length>0 && <section>
            <h3 className="font-bold text-sm text-neutral-800 mb-3 flex items-center gap-2"><GitBranch size={16} className="text-rose-800"/>Pipeline route</h3>
            <ol className="grid sm:grid-cols-2 gap-2">
              {doc.route_names.map((name,i)=>{
                const routeStep=doc.route_steps?.findLast(s=>!s.is_adhoc && s.route_position===i);
                const current=Boolean(step && routeStep?.pd_id===step.pd_id);
                const done=!current && routeStep?.time_out && [3,5].includes(routeStep.s_id);
                return <li key={i} aria-current={current?'step':undefined} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${current?'bg-rose-50 border-rose-300 text-rose-900':'bg-neutral-50/60 border-neutral-100 text-neutral-600'}`}>
                  <span className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center font-bold ${current?'bg-rose-800 text-white':done?'bg-emerald-100 text-emerald-700':'bg-white border border-neutral-200 text-neutral-500'}`}>{done?<CheckCircle2 size={14}/>:i+1}</span>
                  <span className="pt-0.5 leading-relaxed">{name}{routeStep?.completed_via_adhoc&&<span className="block text-[9px] font-bold text-emerald-700 mt-0.5">Completed via ad hoc</span>}{current&&<span className="block text-[9px] font-bold uppercase tracking-wider text-rose-700 mt-0.5">Current step</span>}</span>
                </li>;
              })}
            </ol>
          </section>}

          <section className="rounded-xl border border-rose-100 overflow-hidden">
            <div className="px-4 py-3 bg-rose-50/50 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-sm text-neutral-800 flex items-center gap-2"><Clock3 size={16} className="text-rose-800"/>Office processing history</h3><span className="text-[10px] text-neutral-500">Philippine time · UTC+8</span></div>
            <div className="overflow-x-auto"><table className="w-full text-xs min-w-[540px]"><thead><tr className="text-left"><th className="px-4 py-2.5">Office</th><th className="px-3 py-2.5">Time In</th><th className="px-3 py-2.5">Time Out</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody>{doc.steps.map(s=><tr key={s.pd_id} className="border-t border-neutral-100"><td className="px-4 py-3 font-semibold text-neutral-700 max-w-60">{s.office_name}{s.is_adhoc&&<span className="block text-[10px] text-purple-700 mt-1">Ad Hoc verification</span>}</td><td className="px-3 py-3 text-neutral-500">{formatPhilippineDateTime(s.time_in)}</td><td className="px-3 py-3 text-neutral-500">{formatPhilippineDateTime(s.time_out)}</td><td className="px-3 py-3"><StatusBadge step={s}/></td></tr>)}</tbody></table></div>
          </section>
          {isHistoryDetails ? <p className="text-xs text-neutral-500">History view · read only</p> : !mine ? <p className="text-xs text-neutral-500">{step ? `Currently with ${step.office_name}.` : 'No active processing step.'}</p> : null}
          <div ref={actionPanel}>
          {mode==='return' && pending && <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-3"><label className="block text-sm font-semibold text-rose-900">Reason for correction<textarea maxLength={75} value={reason} onChange={e=>setReason(e.target.value)} className="block w-full border border-rose-200 bg-white rounded-lg p-3 mt-2 text-neutral-800"/></label><button className={button} disabled={busy || !reason.trim()} onClick={()=>act('return')}><Undo2 size={15}/>Send Back</button></div>}
          {mode==='adhoc' && pending && <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3"><label className="block text-xs font-bold text-purple-900">Ad Hoc destination<select aria-label="Ad Hoc destination" value={target} onChange={e=>setTarget(e.target.value)} className="block w-full border border-purple-200 bg-white rounded-lg p-3 mt-2 text-sm text-neutral-800"><option value="">Select destination office</option>{officesList.filter(o=>Number(o.id)!==Number(processorOfficeId)&&Number(o.id)!==999).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><button disabled={busy || !target} className={button} onClick={()=>act('adhoc')}><GitBranch size={15}/>Route Ad Hoc</button></div>}
          {confirmation && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-sm"><p className="text-rose-900 leading-relaxed">{confirmation==='sign'?'Confirm that the document is signed or stamped and ready for release. This action will be recorded under your name.':'Confirm that the document is being released from your office.'}</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button+' trace-button-primary'} onClick={()=>act(confirmation)}>Confirm {confirmation==='sign'?'Signature':'Time Out'}</button><button disabled={busy} className={button} onClick={()=>setConfirmation('')}>Cancel</button></div></div>}
          </div>
        </div>}
      </div>
      <footer className="shrink-0 px-5 py-4 border-t border-rose-100 bg-[#fffafa] flex flex-wrap justify-end gap-2">
        {doc && <>
          {onOpenChat && <button className={button} onClick={()=>onOpenChat(selectedDoc)}><MessageSquare size={15}/>Open Chat</button>}
          {mine && !step.time_in && <button disabled={busy} className={button+' trace-button-primary'} onClick={()=>act('time-in')}><LogIn size={15}/>Time In</button>}
          {pending && <><button disabled={busy} className={button} onClick={()=>{setMode('adhoc');setConfirmation('');}}><GitBranch size={15}/>Ad Hoc</button><button disabled={busy} className={button} onClick={()=>{setMode('return');setConfirmation('');}}><Undo2 size={15}/>Send Back</button><button disabled={busy} className={button+' trace-button-primary'} onClick={()=>{setConfirmation('sign');setMode('');}}><PenLine size={15}/>Sign Document</button></>}
          {mine && step.time_in && [3,4].includes(step.s_id) && <button disabled={busy} className={button+' trace-button-primary'} onClick={()=>setConfirmation('time-out')}><LogOut size={15}/>{step.s_id===4?'Time Out for Correction':'Time Out'}</button>}
        </>}
        <button disabled={busy} className={button} onClick={onClose}>Close</button>
      </footer>
    </section>
  </div>;
}
