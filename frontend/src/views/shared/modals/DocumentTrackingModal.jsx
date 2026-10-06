import {useEffect, useState, useRef} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {FileText, X, GitBranch, Clock3, Building2, ArrowRight, CheckCircle2, ShieldCheck, LogIn, LogOut, PenLine, Undo2, MessageSquare, Download, ChevronDown, Image as ImageIcon, UserRound} from 'lucide-react';
import {fetchWithAuth} from '../../../api';
import {formatPhilippineDateTime,formatPhilippineDate} from '../../../utils/philippineTime';
import DocumentAccessControls from '../components/DocumentAccessControls';

function StatusBadge({step}) {
  const states={
    1:{label:step?.time_in?'Pending review':'Awaiting receipt',style:'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800'},
    2:{label:'In verification',style:'bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800'},
    3:{label:step?.time_out?'Released':'Signed',style:'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'},
    4:{label:'Needs correction',style:'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800'},
    5:{label:'Completed',style:'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}
  };
  const state=step?.completed_via_adhoc ? {label:'Completed via ad hoc',style:'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'} : states[step?.s_id] || {label:step?.current_status || 'Pending',style:'bg-neutral-50 dark:bg-gray-800 text-neutral-700 dark:text-gray-300 border-neutral-200 dark:border-gray-700'};
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${state.style}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{state.label}</span>;
}

function ActorLine({label,actor}) {
  if (!actor?.name) return null;
  return <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-neutral-600 dark:text-gray-400"><UserRound size={11} className="shrink-0 text-rose-700 dark:text-rose-400"/>{label} <strong className="font-semibold text-neutral-800 dark:text-white">{actor.name}</strong></span>;
}

export default function DocumentTrackingModal({selectedDoc,onClose,onRefresh,onOpenChat,processorOfficeId,officesList=[],isHistoryDetails=false,readOnly=false}) {
  const [doc,setDoc] = useState(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [reason,setReason] = useState('');
  const [target,setTarget] = useState('');
  const [mode,setMode] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [showExportMenu,setShowExportMenu] = useState(false);
  const qrContainerRef = useRef(null);
  const dropdownRef = useRef(null);
  const actionPanel = useRef(null);

  useEffect(()=>{
    let cancelled=false;
    fetchWithAuth(`/api/office/documents/${selectedDoc.ini_id}`).then(async res => {
      const data=await res.json(); if (!res.ok) throw new Error(data.error);
      if (!cancelled) {setError('');setDoc(data);}
    }).catch(err => {if (!cancelled) setError(err.message);});
    return () => {cancelled=true;};
  },[selectedDoc.ini_id]);
  useEffect(()=>{
    const closeMenu=e=>{if(dropdownRef.current&&!dropdownRef.current.contains(e.target))setShowExportMenu(false);};
    document.addEventListener('mousedown',closeMenu);
    return()=>document.removeEventListener('mousedown',closeMenu);
  },[]);
  useEffect(()=>{if(mode||confirmation)actionPanel.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[mode,confirmation]);

  const halted=doc?.steps?.at(-1)?.s_id===4 && doc?.steps?.at(-1)?.time_out;
  const step=halted ? null : doc?.steps?.findLast(s=>!s.time_out);
  const latestStep=doc?.steps?.at(-1);
  const latestCorrectionAction=doc?.actions?.findLast(action=>String(action.action_type||'').startsWith('Sent Back for Revision:'));
  const correctionNotice=latestStep?.s_id===4 ? (latestStep.correction || (latestCorrectionAction ? {
    message:String(latestCorrectionAction.action_type).replace(/^Sent Back for Revision:\s*/i,'').trim(),
    name:latestCorrectionAction.full_name,
    timestamp:latestCorrectionAction.action_timestamp,
    office_name:latestCorrectionAction.office_name
  } : null)) : null;
  const officeFeatures=!readOnly && !isHistoryDetails && processorOfficeId != null;
  const mine=officeFeatures && step && Number(step.current_office_id)===Number(processorOfficeId);
  const pending=mine && step.time_in && step.s_id===1;
  const act=async action=>{
    setBusy(true);setError('');
    try{
      const path=action==='adhoc'?'/api/processor/documents/ad-hoc':action.startsWith('time-')?`/api/documents/scan-${action==='time-in'?'in':'out'}`:`/api/office/${action}`;
      const res=await fetchWithAuth(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({iniId:doc.ini_id,qrCode:doc.qr_code,reason,targetOfficeId:Number(target)})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);onRefresh?.();onClose();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const getQrBase64=()=>new Promise(resolve=>{
    const svg=qrContainerRef.current?.querySelector('svg');if(!svg)return resolve(null);
    const canvas=document.createElement('canvas');const size=512;canvas.width=size;canvas.height=size;
    const img=new Image();img.onload=()=>{const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.drawImage(img,0,0,size,size);resolve(canvas.toDataURL('image/png'));};
    img.src=`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))}`;
  });
  const handleDownloadImage=async()=>{setShowExportMenu(false);const png=await getQrBase64();if(!png)return;const link=document.createElement('a');link.download=`QR-${doc?.qr_code||'Document'}.png`;link.href=png;link.click();};
  const handlePrintPdf=async()=>{setShowExportMenu(false);const png=await getQrBase64();if(!png)return;const w=window.open('','_blank');if(!w)return;w.document.write(`<html><head><title>Routing Slip - ${doc.qr_code}</title><style>body{font-family:Arial;padding:40px;text-align:center}.card{max-width:480px;margin:auto;border:2px solid #e5e7eb;border-radius:12px;padding:24px}.qr{width:180px;height:180px}.details{text-align:left;border-top:1px dashed #d1d5db;margin-top:20px;padding-top:14px;font-size:13px}.details p{margin:8px 0}</style></head><body><div class="card"><h2>BSU - Trace Verification Slip</h2><img class="qr" src="${png}"/><p><b>${doc.qr_code}</b></p><div class="details"><p><b>Document:</b> ${doc.title||'Untitled'}</p><p><b>Requestor:</b> ${doc.submitted_by||'N/A'}</p><p><b>Requestor office:</b> ${doc.requestor_office_name||'N/A'}</p><p><b>Created:</b> ${formatPhilippineDateTime(doc.created_at)}</p></div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);w.document.close();};
  const button='trace-button dark:bg-[#1c1113] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2b1317]';
  return (
    <div className="fixed inset-0 bg-neutral-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="document-tracking-title" className="bg-white dark:bg-[#180e10] rounded-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden text-left shadow-2xl border border-white/30 dark:border-[#42292f]">
        <header className="trace-dialog-header shrink-0 px-5 py-4 sm:px-6 flex items-center justify-between gap-3 bg-[#701126] dark:bg-red-950 text-white">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/15 p-2.5"><FileText size={21}/></span>
            <div>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/70 mb-0.5">BSU · Document tracking</p>
              <h2 id="document-tracking-title" className="font-bold text-base">Document Details</h2>
            </div>
          </div>
          <button disabled={busy} onClick={onClose} aria-label="Close document" className="p-2 rounded-full hover:bg-white/15 text-white cursor-pointer"><X size={20}/></button>
        </header>

        <div className="trace-dialog-body min-h-0 overflow-y-auto overscroll-contain">
          {error && <p role="alert" className="m-5 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 text-sm text-rose-800 dark:text-rose-300">{error}</p>}
          {!doc ? (
            <p className="p-6 text-sm text-neutral-500 dark:text-gray-400">Loading document…</p>
          ) : (
            <div className="p-5 sm:p-6 space-y-5">
              {doc.lifecycle_state==='cancelled' && (
                <section className="rounded-xl border border-neutral-300 dark:border-gray-700 bg-neutral-100 dark:bg-[#1c1113] p-4 text-xs text-neutral-800 dark:text-gray-200">
                  <div className="font-black uppercase tracking-wide">Processing stopped by submitter</div>
                  <p className="mt-2 rounded-lg border border-neutral-200 dark:border-gray-700 bg-white dark:bg-[#180e10] p-3 font-medium leading-relaxed">{doc.cancellation_reason||'No reason was recorded.'}</p>
                  <p className="mt-2 text-[10px] text-neutral-500 dark:text-gray-400">Stopped {formatPhilippineDateTime(doc.cancelled_at)} · retained in the permanent history</p>
                </section>
              )}
              {correctionNotice && doc.lifecycle_state!=='cancelled' && (
                <section className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 p-4 text-xs text-rose-950 dark:text-rose-300" aria-label="Correction request">
                  <div className="flex items-center gap-2 font-black uppercase tracking-wide"><Undo2 size={15}/>Correction requested</div>
                  <p className="mt-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#180e10] p-3 font-medium leading-relaxed text-rose-800 dark:text-rose-300">{correctionNotice.message||'Corrections are required before processing can continue.'}</p>
                  {correctionNotice.name && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-rose-800 dark:text-rose-400">
                      <UserRound size={12}/>
                      <span>Requested by <strong>{correctionNotice.name}</strong>{correctionNotice.office_name?` · ${correctionNotice.office_name}`:''}</span>
                      {correctionNotice.timestamp && <span>· {formatPhilippineDateTime(correctionNotice.timestamp)}</span>}
                    </p>
                  )}
                </section>
              )}

              <div className="grid md:grid-cols-[1fr_180px] gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-md bg-rose-50 dark:bg-red-900/30 border border-rose-100 dark:border-red-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-800 dark:text-red-400">{doc.process_name}</span>
                    <StatusBadge step={step||doc.steps.at(-1)}/>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white break-words">{doc.title}</h3>
                  <p className="font-mono text-[11px] text-rose-800 dark:text-red-400 mt-2 break-all">{doc.qr_code}</p>
                  <dl className="text-xs grid grid-cols-2 gap-x-5 gap-y-4 mt-5">
                    <div><dt className="trace-field-label">Requestor name</dt><dd className="font-semibold text-neutral-700 dark:text-gray-300">{doc.submitted_by||'N/A'}</dd></div>
                    {doc.requestor_office_name && <div><dt className="trace-field-label">Requestor office</dt><dd className="font-semibold text-neutral-700 dark:text-gray-300">{doc.requestor_office_name}</dd></div>}
                    <div><dt className="trace-field-label">Originating office</dt><dd className="font-semibold text-neutral-700 dark:text-gray-300">{doc.steps[0]?.office_name||'Origin Station'}</dd></div>
                    <div><dt className="trace-field-label">Created</dt><dd className="text-neutral-600 dark:text-gray-400">{formatPhilippineDateTime(doc.created_at)}</dd></div>
                    <div><dt className="trace-field-label">Estimated delivery</dt><dd className="text-neutral-600 dark:text-gray-400">{doc.edc?formatPhilippineDate(doc.edc):'Not set at submission'}</dd></div>
                  </dl>
                </div>
                <div ref={qrContainerRef} className="rounded-2xl border border-rose-100 dark:border-red-900 bg-rose-50/50 dark:bg-red-900/10 p-4 flex flex-col items-center justify-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-red-400"><ShieldCheck size={14}/> Tracking QR</span>
                  <div className="bg-white dark:bg-[#180e10] p-3 rounded-xl border border-rose-100 dark:border-gray-700 shadow-sm"><QRCodeSVG value={doc.qr_code} size={116} fgColor="#701126" level="M"/></div>
                  <p className="text-[10px] text-center text-neutral-500 dark:text-gray-400">Scan to identify this document</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 rounded-xl border border-rose-100 dark:border-[#42292f] bg-gradient-to-r from-rose-50 to-white dark:from-[#1c1113] dark:to-[#180e10] p-4">
                <div className="flex gap-2.5"><Building2 size={17} className="text-rose-800 dark:text-red-400 shrink-0 mt-0.5"/><div><span className="trace-field-label">Current office</span><p className="text-xs font-semibold text-neutral-800 dark:text-white">{step?.office_name||doc.steps.at(-1)?.office_name||'—'}</p></div></div>
                <ArrowRight size={17} className="hidden sm:block text-rose-300 dark:text-gray-600 self-center"/>
                <div><span className="trace-field-label">Next office</span><p className="text-xs font-semibold text-neutral-700 dark:text-gray-300">{step?.next_office_name||'—'}</p></div>
              </div>

              {doc.route_names?.length>0 && (
                <section>
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-white mb-3 flex items-center gap-2"><GitBranch size={16} className="text-rose-800 dark:text-red-400"/>Document Route</h3>
                  <ol className="grid sm:grid-cols-2 gap-2">
                    {doc.route_names.map((name,i)=>{
                      const routeStep=doc.route_steps?.findLast(s=>!s.is_adhoc&&s.route_position===i);
                      const current=Boolean(step&&routeStep?.pd_id===step.pd_id);
                      const done=!current&&routeStep?.time_out&&[3,5].includes(routeStep.s_id);
                      return (
                        <li key={i} aria-current={current?'step':undefined} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${current?'bg-rose-50 dark:bg-red-900/30 border-rose-300 dark:border-red-800 text-rose-900 dark:text-red-300':'bg-neutral-50/60 dark:bg-[#1c1113] border-neutral-100 dark:border-gray-800 text-neutral-600 dark:text-gray-400'}`}>
                          <span className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center font-bold ${current?'bg-rose-800 dark:bg-red-700 text-white':done?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-white dark:bg-[#180e10] border border-neutral-200 dark:border-gray-700 text-neutral-500 dark:text-gray-400'}`}>
                            {done?<CheckCircle2 size={14}/>:i+1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">
                            {name}
                            {routeStep?.completed_via_adhoc && <span className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">Completed via ad hoc</span>}
                            {current && <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-red-400 mt-0.5">Current step</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              <section className="rounded-xl border border-rose-100 dark:border-[#42292f] overflow-hidden">
                <div className="px-4 py-3 bg-rose-50/50 dark:bg-[#1c1113] flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-white flex items-center gap-2"><Clock3 size={16} className="text-rose-800 dark:text-red-400"/>Office processing history</h3>
                  <span className="text-[10px] text-neutral-500 dark:text-gray-400">Philippine time · UTC+8</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="text-left text-neutral-500 dark:text-gray-400 border-b border-neutral-100 dark:border-gray-800">
                        <th className="px-4 py-2.5">Office</th>
                        <th className="px-3 py-2.5">Time In</th>
                        <th className="px-3 py-2.5">Time Out</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-gray-800/50">
                      {doc.steps.map(s=>(
                        <tr key={s.pd_id} className="align-top">
                          <td className="px-4 py-3 font-semibold text-neutral-700 dark:text-gray-300">
                            {s.office_name}
                            {s.is_adhoc && <span className="block text-[10px] text-purple-700 dark:text-purple-400 mt-1">Ad Hoc verification</span>}
                          </td>
                          <td className="px-3 py-3 text-neutral-500 dark:text-gray-400">
                            {formatPhilippineDateTime(s.time_in)}
                            <ActorLine label="Accepted by" actor={s.time_in_actor}/>
                          </td>
                          <td className="px-3 py-3 text-neutral-500 dark:text-gray-400">
                            {formatPhilippineDateTime(s.time_out)}
                            <ActorLine label="Released by" actor={s.time_out_actor}/>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge step={s}/>
                            <ActorLine label="Signed by" actor={s.signed_actor}/>
                            <ActorLine label="Correction requested by" actor={s.correction}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {isHistoryDetails ? (
                <p className="text-xs text-neutral-500 dark:text-gray-400">History view · read only</p>
              ) : !mine && officeFeatures && (
                <p className="text-xs text-neutral-500 dark:text-gray-400">{step?`Currently with ${step.office_name}.`:'No active processing step.'}</p>
              )}

              <div ref={actionPanel}>
                {mode==='return' && pending && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/20 p-4 space-y-3">
                    <label className="block text-sm font-semibold text-rose-900 dark:text-rose-300">Reason for correction
                      <textarea maxLength={75} value={reason} onChange={e=>setReason(e.target.value)} className="block w-full border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#1c1113] rounded-lg p-3 mt-2 text-neutral-800 dark:text-white outline-none"/>
                    </label>
                    <button className={button} disabled={busy||!reason.trim()} onClick={()=>act('return')}><Undo2 size={15}/>Send Back</button>
                  </div>
                )}
                {mode==='adhoc' && pending && (
                  <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/20 p-4 space-y-3">
                    <label className="block text-xs font-bold text-purple-900 dark:text-purple-300">Ad Hoc destination
                      <select aria-label="Ad Hoc destination" value={target} onChange={e=>setTarget(e.target.value)} className="block w-full border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#1c1113] rounded-lg p-3 mt-2 text-sm text-neutral-800 dark:text-white outline-none cursor-pointer">
                        <option value="">Select destination office</option>
                        {officesList.filter(o=>Number(o.id)!==Number(processorOfficeId)&&Number(o.id)!==999).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </label>
                    <button disabled={busy||!target} className={button} onClick={()=>act('adhoc')}><GitBranch size={15}/>Route Ad Hoc</button>
                  </div>
                )}
                {confirmation && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-xl space-y-3 text-sm">
                    <p className="text-rose-900 dark:text-rose-300 leading-relaxed">{confirmation==='sign'?'Confirm that the document is signed or stamped and ready for release. This action will be recorded under your name.':'Confirm that the document is being released from your office.'}</p>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} className={button+' trace-button-primary dark:bg-red-800 dark:hover:bg-red-700'} onClick={()=>act(confirmation)}>Confirm {confirmation==='sign'?'Signature':'Time Out'}</button>
                      <button disabled={busy} className={button} onClick={()=>setConfirmation('')}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 px-5 py-4 border-t border-rose-100 dark:border-[#42292f] bg-[#fffafa] dark:bg-[#1c1113] flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {doc && onOpenChat && doc.lifecycle_state!=='cancelled' && (
              <button className={button} onClick={()=>{onClose();onOpenChat(doc)}}><MessageSquare size={15}/>Chat regarding this file</button>
            )}
            {doc && (doc.permissions?.isOwner || doc.permissions?.isCollaborator) && (
              <DocumentAccessControls document={doc} onChanged={onRefresh} onCloseParent={onClose}/>
            )}
            {doc && (
              <div className="relative" ref={dropdownRef}>
                <button className={button} onClick={()=>setShowExportMenu(v=>!v)}><Download size={14}/>Download QR<ChevronDown size={14}/></button>
                {showExportMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-[#180e10] border border-neutral-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1.5 text-xs font-semibold">
                    <button onClick={handleDownloadImage} className="w-full px-3.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer text-neutral-800 dark:text-gray-200"><ImageIcon size={14}/>Image (PNG)</button>
                    <button onClick={handlePrintPdf} className="w-full px-3.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer text-neutral-800 dark:text-gray-200"><FileText size={14}/>Printable PDF Slip</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {doc && officeFeatures && doc.lifecycle_state!=='cancelled' && (
              <>
                {mine && !step.time_in && (
                  <button disabled={busy} className={button+' trace-button-primary dark:bg-red-800 dark:hover:bg-red-700'} onClick={()=>act('time-in')}><LogIn size={15}/>Accept</button>
                )}
                {pending && (
                  <>
                    <button disabled={busy} className={button} onClick={()=>{setMode('adhoc');setConfirmation('')}}><GitBranch size={15}/>Ad Hoc</button>
                    <button disabled={busy} className={button} onClick={()=>{setMode('return');setConfirmation('')}}><Undo2 size={15}/>Send Back</button>
                    <button disabled={busy} className={button+' trace-button-primary dark:bg-red-800 dark:hover:bg-red-700'} onClick={()=>{setConfirmation('sign');setMode('')}}><PenLine size={15}/>Sign Document</button>
                  </>
                )}
                {mine && step.time_in && [3,4].includes(step.s_id) && (
                  <button disabled={busy} className={button+' trace-button-primary dark:bg-red-800 dark:hover:bg-red-700'} onClick={()=>setConfirmation('time-out')}><LogOut size={15}/>{step.s_id===4?'Release for Correction':'Release'}</button>
                )}
              </>
            )}
            <button disabled={busy} className={button} onClick={onClose}>Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
}