import React, {useEffect, useState} from 'react';
import {fetchWithAuth} from '../../../../api';
import { X } from 'lucide-react';
import ProcessCombobox from '../components/ProcessCombobox';

export default function DocumentSubmissionModal({
  setShowModal,
  submitDocument,
  form,
  setForm,
  handleProcessChange,
  processTypes,
  workflowsLoading, workflowError, retryWorkflows,
  estimatedDate,
  selectedRoutePreview,
  canCompleteOriginProcessing = false,
  submitting = false,
  submissionError = ''
  , placeholderSelections = {}
}) {
  const [catalog,setCatalog] = useState({offices:[],categories:[]});
  const [catalogError,setCatalogError] = useState('');
  const [catalogLoading,setCatalogLoading] = useState(true);
  const [retry,setRetry] = useState(0);
  useEffect(()=>{let cancelled=false; Promise.all(['/api/offices','/api/document-categories'].map(async url=>{
    const res=await fetchWithAuth(url);const data=await res.json();if(!res.ok)throw new Error(data.error || 'Unable to load route options.');return data;
  })).then(([offices,categories])=>{if(!cancelled){setCatalog({offices:offices.filter(o=>Number(o.id)!==999),categories});setCatalogError('');}})
    .catch(err=>{if(!cancelled)setCatalogError(err.message);}).finally(()=>{if(!cancelled)setCatalogLoading(false);});return()=>{cancelled=true;};},[retry]);
  const custom = form.customRoute;
  const selectedOfficial = processTypes.find(p => String(p.p_id) === String(form.processTypeId));
  const placeholderStops = selectedOfficial ? Array.from({length: 7}, (_, index) => ({
    position: index + 1,
    groupId: selectedOfficial[`stop_${index + 1}_group_id`],
    groupName: selectedOfficial[`stop_${index + 1}_group_name`]
  })).filter(stop => stop.groupId) : [];
  const changeCustom = patch => setForm({...form,customRoute:{...custom,...patch},completeOriginProcessing:false});
  const customValid = custom && custom.processName.trim() && (custom.categoryId || custom.categoryName.trim()) && custom.stops.every(Boolean) && !catalogLoading && !catalogError;
  const close = () => { handleProcessChange(''); setShowModal(false); };
  const placeholdersComplete = placeholderStops.every(stop => placeholderSelections[stop.groupId]);
  const verified = custom ? customValid : processTypes.some(p => p.is_active === true && String(p.p_id) === String(form.processTypeId)) && placeholdersComplete;
  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="document-submission-heading" className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border flex flex-col text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 id="document-submission-heading" className="font-bold text-neutral-950">Submit New Document</h3>
          <button type="button" aria-label="Close submission" onClick={close} className="text-neutral-400 hover:text-neutral-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={e => { if (!verified || (!custom && (workflowsLoading || workflowError))) { e.preventDefault(); return; } submitDocument(e); }} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Document Title</label>
            <input type="text" required placeholder="e.g., Curriculum Revision Request" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-700 border-neutral-300" />
          </div>
          <label className="block text-sm font-semibold">Route type<select aria-label="Route type" className="w-full border rounded-lg p-2 mt-1" value={custom?'custom':'official'} onChange={e=>setForm({...form,processTypeId:'',completeOriginProcessing:false,customRoute:e.target.value==='custom'?{processName:'',categoryId:'',categoryName:'',stops:['','']}:undefined})}><option value="official">Official process</option><option value="custom">Create a custom route</option></select></label>
          {custom && <div className="space-y-4 border-2 border-rose-100 rounded-2xl p-5 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 shadow-sm">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Custom route · immediate processing</p><p className="text-xs text-amber-900/80 mt-1">ICT reviews this route separately before making it available to everyone.</p></div>
            <div className="rounded-xl border border-rose-100 bg-white px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Estimated delivery</p><p className="text-sm font-bold text-rose-900 mt-1">{estimatedDate || 'Complete the route stops to calculate'}</p></div>
            <p className="text-xs text-gray-600">Your document starts processing immediately. ICT reviews this route separately before making it available to everyone.</p>
            {catalogLoading && <p role="status">Loading offices and categories�</p>}
            {catalogError && <p role="alert">{catalogError} <button type="button" className="underline" onClick={()=>{setCatalogLoading(true);setRetry(retry+1);}}>Retry</button></p>}
            <label className="block text-sm">Category<select required value={custom.categoryId || 'new'} onChange={e=>changeCustom({categoryId:e.target.value==='new'?'':Number(e.target.value)})} className="w-full border rounded p-2"><option value="new">Create a new category</option>{catalog.categories.map(c=><option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></label>
            {!custom.categoryId && <label className="block text-sm">New category name<input required maxLength={100} value={custom.categoryName} onChange={e=>changeCustom({categoryName:e.target.value})} className="w-full border rounded p-2"/></label>}
            <label className="block text-sm">New process type<input required maxLength={100} value={custom.processName} onChange={e=>changeCustom({processName:e.target.value})} className="w-full border rounded p-2"/></label>
            <p className="text-xs">Select offices in processing order, starting with the office that should receive the document first.</p>
            {custom.stops.map((stop,i)=><label key={i} className="block text-sm">Office {i+1}<select required value={stop} onChange={e=>changeCustom({stops:custom.stops.map((v,j)=>j===i?Number(e.target.value):v)})} className="w-full border rounded p-2"><option value="">Select office�</option>{catalog.offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>)}
            <div className="flex gap-4 text-sm"><button type="button" disabled={custom.stops.length>=7} onClick={()=>changeCustom({stops:[...custom.stops,'']})} className="underline disabled:opacity-40">Add office</button><button type="button" disabled={custom.stops.length<=2} onClick={()=>changeCustom({stops:custom.stops.slice(0,-1)})} className="underline disabled:opacity-40">Remove last office</button></div>
          </div>}
          {!custom && <div className="grid grid-cols-1 gap-4">
            <div>
              {workflowsLoading ? <p role="status" className="text-xs text-gray-500">Loading pipelines...</p>
                : workflowError ? <p role="alert" className="text-xs text-red-800">{workflowError} <button type="button" onClick={retryWorkflows} className="underline">Retry</button></p>
                : <ProcessCombobox processTypes={processTypes} value={form.processTypeId} onChange={handleProcessChange} />}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Automatic Estimate Based On Route (EDC)</label>
              <input type="text" readOnly value={estimatedDate || "Select a process type..."} className="w-full border bg-neutral-50 font-medium text-neutral-500 rounded-lg px-3 py-2 text-xs outline-none cursor-not-allowed border-neutral-200" />
            </div>
          </div>}
          {!custom && selectedRoutePreview.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Submission Route Path</label>
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-700">
                {selectedRoutePreview.map((stop, i) => (
                  <React.Fragment key={i}>
                    <span className="bg-white px-2.5 py-1 rounded-lg border shadow-xs flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-red-800 text-white text-[9px] flex items-center justify-center font-bold">{i+1}</span>
                      {stop}
                    </span>
                    {i < selectedRoutePreview.length - 1 && <span className="text-neutral-400 font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          {!custom && placeholderStops.length > 0 && <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Complete flexible route stops</p><p className="text-xs text-blue-900/80 mt-1">Choose the actual office for each category placeholder in this official pipeline.</p></div>
            {placeholderStops.map(stop => <label key={stop.position} className="block text-sm font-semibold text-blue-950">Stop {stop.position}: {stop.groupName}<select required value={placeholderSelections[stop.groupId] || ''} onChange={event => setForm({...form, placeholderSelections: {...placeholderSelections, [stop.groupId]: Number(event.target.value)}})} className="w-full mt-1 border border-blue-200 rounded-lg p-2 bg-white text-sm"><option value="">Select an office from this category...</option>{catalog.offices.filter(office => office.category === stop.groupName).map(office => <option key={office.id} value={office.id}>{office.name}</option>)}</select></label>)}
          </div>}
          {submissionError && <p role="alert" className="text-sm text-red-800">{submissionError}</p>}
          {canCompleteOriginProcessing && <label className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-xl text-sm">
            <input type="checkbox" checked={!!form.completeOriginProcessing} onChange={e=>setForm({...form,completeOriginProcessing:e.target.checked})}/>
            <span><strong>Complete originating-office processing upon submission</strong><span className="block text-xs mt-1">The document is already signed or stamped and ready for release. Receipt, signing, and release will be recorded under your name. The next office will still record its own Time In.</span></span>
          </label>}
          <div className="flex items-start gap-2.5 pt-2">
            <input type="checkbox" id="confirmBox" required checked={form.confirmation} onChange={e => setForm({...form, confirmation: e.target.checked})} className="mt-0.5 rounded text-red-800 focus:ring-red-700 w-3.5 h-3.5" />
            <label htmlFor="confirmBox" className="text-[11px] text-gray-500 leading-tight select-none">I confirm that the information provided is accurate and all necessary supporting documents are attached as per institutional guidelines.</label>
          </div>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button type="button" onClick={close} className="px-4 py-2 border font-medium text-gray-500 text-xs rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={submitting || !verified || (!custom && (workflowsLoading || !!workflowError))} className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 font-medium bg-red-800 hover:bg-red-900 text-white text-xs rounded-lg">{submitting ? 'Submitting…' : 'Submit Document'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
