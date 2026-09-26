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
      <div role="dialog" aria-modal="true" aria-labelledby="document-submission-heading" className="bg-white dark:bg-[#180e10] w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-xl border border-neutral-200 dark:border-[#42292f] flex flex-col text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-neutral-200 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <h3 id="document-submission-heading" className="font-bold text-neutral-950 dark:text-white">Submit New Document</h3>
          <button type="button" aria-label="Close submission" onClick={close} className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={e => { if (!verified || (!custom && (workflowsLoading || workflowError))) { e.preventDefault(); return; } submitDocument(e); }} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Document Title</label>
            <input type="text" required placeholder="e.g., Curriculum Revision Request" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-700 border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white" />
          </div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Route type
            <select aria-label="Route type" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 mt-1 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-xs cursor-pointer outline-none" value={custom?'custom':'official'} onChange={e=>setForm({...form,processTypeId:'',completeOriginProcessing:false,customRoute:e.target.value==='custom'?{processName:'',categoryId:'',categoryName:'',stops:['','']}:undefined})}>
              <option value="official">Official process</option>
              <option value="custom">Create a custom route</option>
            </select>
          </label>
          {custom && <div className="space-y-4 border-2 border-rose-100 dark:border-rose-900 rounded-2xl p-5 bg-gradient-to-br from-rose-50/70 dark:from-rose-950/40 via-white dark:via-[#180e10] to-amber-50/50 dark:to-amber-950/30 shadow-sm">
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Custom route · immediate processing</p><p className="text-xs text-amber-900/80 dark:text-amber-300 mt-1">ICT reviews this route separately before making it available to everyone.</p></div>
            <div className="rounded-xl border border-rose-100 dark:border-rose-900 bg-white dark:bg-[#1c1113] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-gray-400">Estimated delivery</p><p className="text-sm font-bold text-rose-900 dark:text-rose-400 mt-1">{estimatedDate || 'Complete the route stops to calculate'}</p></div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Your document starts processing immediately. ICT reviews this route separately before making it available to everyone.</p>
            {catalogLoading && <p role="status" className="text-xs text-gray-500 dark:text-gray-400">Loading offices and categories…</p>}
            {catalogError && <p role="alert" className="text-xs text-red-800 dark:text-red-400">{catalogError} <button type="button" className="underline cursor-pointer" onClick={()=>{setCatalogLoading(true);setRetry(retry+1);}}>Retry</button></p>}
            <label className="block text-sm text-gray-700 dark:text-gray-300">Category
              <select required value={custom.categoryId || 'new'} onChange={e=>changeCustom({categoryId:e.target.value==='new'?'':Number(e.target.value)})} className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-xs mt-1 outline-none cursor-pointer">
                <option value="new">Create a new category</option>
                {catalog.categories.map(c=><option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </label>
            {!custom.categoryId && <label className="block text-sm text-gray-700 dark:text-gray-300">New category name<input required maxLength={100} value={custom.categoryName} onChange={e=>changeCustom({categoryName:e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 mt-1 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-xs outline-none"/></label>}
            <label className="block text-sm text-gray-700 dark:text-gray-300">New process type<input required maxLength={100} value={custom.processName} onChange={e=>changeCustom({processName:e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 mt-1 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-xs outline-none"/></label>
            <p className="text-xs text-gray-600 dark:text-gray-300">Select offices in processing order, starting with the office that should receive the document first.</p>
            {custom.stops.map((stop,i)=><label key={i} className="block text-sm text-gray-700 dark:text-gray-300">Office {i+1}<select required value={stop} onChange={e=>changeCustom({stops:custom.stops.map((v,j)=>j===i?Number(e.target.value):v)})} className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 mt-1 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-xs outline-none cursor-pointer"><option value="">Select office…</option>{catalog.offices.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>)}
            <div className="flex gap-4 text-sm"><button type="button" disabled={custom.stops.length>=7} onClick={()=>changeCustom({stops:[...custom.stops,'']})} className="underline disabled:opacity-40 text-red-800 dark:text-red-400 cursor-pointer font-bold text-xs">Add office</button><button type="button" disabled={custom.stops.length<=2} onClick={()=>changeCustom({stops:custom.stops.slice(0,-1)})} className="underline disabled:opacity-40 text-neutral-600 dark:text-gray-400 cursor-pointer font-bold text-xs">Remove last office</button></div>
          </div>}
          {!custom && <div className="grid grid-cols-1 gap-4">
            <div>
              {workflowsLoading ? <p role="status" className="text-xs text-gray-500 dark:text-gray-400">Loading pipelines...</p>
                : workflowError ? <p role="alert" className="text-xs text-red-800 dark:text-red-400">{workflowError} <button type="button" onClick={retryWorkflows} className="underline cursor-pointer">Retry</button></p>
                : <ProcessCombobox processTypes={processTypes} value={form.processTypeId} onChange={handleProcessChange} />}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-gray-500 uppercase tracking-wider mb-1">Automatic Estimate Based On Route (EDC)</label>
              <input type="text" readOnly value={estimatedDate || "Select a process type..."} className="w-full border bg-neutral-50 dark:bg-neutral-900 font-medium text-neutral-500 dark:text-gray-400 rounded-lg px-3 py-2 text-xs outline-none cursor-not-allowed border-neutral-200 dark:border-gray-800" />
            </div>
          </div>}
          {!custom && selectedRoutePreview.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Submission Route Path</label>
              <div className="bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-gray-200">
                {selectedRoutePreview.map((stop, i) => (
                  <React.Fragment key={i}>
                    <span className="bg-white dark:bg-[#180e10] border border-neutral-200 dark:border-gray-700 px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-red-800 dark:bg-red-700 text-white text-[9px] flex items-center justify-center font-bold">{i+1}</span>
                      {stop}
                    </span>
                    {i < selectedRoutePreview.length - 1 && <span className="text-neutral-400 dark:text-gray-500 font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          {!custom && placeholderStops.length > 0 && <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-900/20 p-4 space-y-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">Complete flexible route stops</p><p className="text-xs text-blue-900/80 dark:text-blue-300 mt-1">Choose the actual office for each category placeholder in this official pipeline.</p></div>
            {placeholderStops.map(stop => <label key={stop.position} className="block text-sm font-semibold text-blue-950 dark:text-blue-200">Stop {stop.position}: {stop.groupName}<select required value={placeholderSelections[stop.groupId] || ''} onChange={event => setForm({...form, placeholderSelections: {...placeholderSelections, [stop.groupId]: Number(event.target.value)}}) } className="w-full mt-1 border border-blue-200 dark:border-blue-800 rounded-lg p-2 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white text-sm outline-none cursor-pointer"><option value="">Select an office from this category...</option>{catalog.offices.filter(office => office.category === stop.groupName).map(office => <option key={office.id} value={office.id}>{office.name}</option>)}</select></label>)}
          </div>}
          {submissionError && <p role="alert" className="text-sm text-red-800 dark:text-red-400">{submissionError}</p>}
          {canCompleteOriginProcessing && <label className="flex items-start gap-3 p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm">
            <input type="checkbox" checked={!!form.completeOriginProcessing} onChange={e=>setForm({...form,completeOriginProcessing:e.target.checked})} className="mt-0.5 rounded text-red-800 dark:text-red-700 focus:ring-red-700 cursor-pointer"/>
            <span className="text-gray-700 dark:text-gray-300"><strong className="text-neutral-900 dark:text-white">Complete originating-office processing upon submission</strong><span className="block text-xs mt-1 text-gray-500 dark:text-gray-400">The document is already signed or stamped and ready for release. Receipt, signing, and release will be recorded under your name. The next office will still record its own Time In.</span></span>
          </label>}
          <div className="flex items-start gap-2.5 pt-2">
            <input type="checkbox" id="confirmBox" required checked={form.confirmation} onChange={e => setForm({...form, confirmation: e.target.checked})} className="mt-0.5 rounded text-red-800 dark:text-red-700 focus:ring-red-700 w-3.5 h-3.5 cursor-pointer" />
            <label htmlFor="confirmBox" className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight select-none cursor-pointer">I confirm that the information provided is accurate and all necessary supporting documents are attached as per institutional guidelines.</label>
          </div>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-[#42292f]">
            <button type="button" onClick={close} className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] font-medium text-gray-500 dark:text-gray-300 text-xs rounded-lg hover:bg-neutral-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting || !verified || (!custom && (workflowsLoading || !!workflowError))} className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 font-medium bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white text-xs rounded-lg shadow-sm cursor-pointer">{submitting ? 'Submitting…' : 'Submit Document'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}