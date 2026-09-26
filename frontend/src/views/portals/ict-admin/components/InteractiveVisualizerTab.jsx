import React from 'react';
import CategoryManagement from './CategoryManagement';
import CustomRouteReview from './CustomRouteReview';

export default function InteractiveVisualizerTab({
  formMeta, setFormMeta, newProcessName, setNewProcessName, selectedStops, setSelectedStops,
  handleStopSelectorChange, handleStopKindChange, handleAddStopSlot, handleRemoveTrailingStopSlot,
  offices, routeGroups, resetWorkflowForm, handleProcessFormSubmit, processTypes,
  categories, categoryId, setCategoryId, catalogError, refreshCatalogs, deletePipeline
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200 text-left">
      
      <div className="lg:col-span-3">
        <div className="mb-6 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-900/20 p-4 text-sm text-blue-950 dark:text-blue-200">
          <p className="font-bold flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 dark:bg-blue-600 text-white text-xs">?</span> How flexible routing works</p>
          <p className="mt-2 text-xs leading-relaxed text-blue-900 dark:text-blue-300">For official pipelines, each stop can be a fixed office or an office-category placeholder. A placeholder lets the submitter choose one actual office from ICT’s allowed category, and that choice is saved to the document’s route snapshot. Custom routes remain explicit and always use specific offices.</p>
        </div>
        {catalogError && <p role="alert" className="text-red-700 dark:text-red-400 mb-3">{catalogError} <button type="button" onClick={refreshCatalogs} className="underline cursor-pointer">Retry</button></p>}
        <div className="mb-8"><CustomRouteReview onChanged={refreshCatalogs} /></div>
        <CategoryManagement categories={categories} onChanged={refreshCatalogs} />
      </div>

      {/* LEFT COLUMN: WORKFLOW BUILDER FORM */}
      <div className="lg:col-span-2 bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col h-full">
        
        {/* Header & Reset Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8 pb-5 border-b border-gray-100 dark:border-[#42292f]">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D32F2F] dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              {formMeta.currentProcessId ? "Update Workflow Blueprint" : "Compile New Workflow Template"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Design linear multi-stop routing pipelines mapping across campus destinations.</p>
          </div>
          {formMeta.currentProcessId && (
            <button 
              type="button" 
              onClick={resetWorkflowForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 border border-gray-200 dark:border-gray-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Cancel Edit Mode
            </button>
          )}
        </div>

        <form onSubmit={handleProcessFormSubmit} className="space-y-6 flex-1 flex flex-col">
          
          <div>
            <label htmlFor="pipeline-category" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Document Category</label>
            <select id="pipeline-category" required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm cursor-pointer outline-none">
              <option value="">Select a category...</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>

          {/* Process Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2">
              Process Action Name
            </label>
            <input 
              type="text" 
              required 
              value={newProcessName} 
              onChange={e => setNewProcessName(e.target.value)} 
              placeholder="e.g. Equipment Borrowing Request" 
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] outline-none transition-all shadow-sm" 
            />
          </div>

          {/* Stops Matrix */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              Pipeline Tracking Progress Sequence
            </label>
            
            <div className="bg-gray-50 dark:bg-[#1c1113] border border-gray-200 dark:border-gray-700 p-4 rounded-xl space-y-3">
              {selectedStops.map((stop, index) => (
                <div key={index} className="flex items-center gap-3 relative animate-in slide-in-from-top-2 duration-200">
                  {/* Visual Timeline Connector */}
                  {index !== selectedStops.length - 1 && (
                    <div className="absolute left-3.5 top-8 bottom-[-16px] w-0.5 bg-gray-300 dark:bg-gray-700 z-0"></div>
                  )}
                  
                  <span className="w-7 h-7 rounded-full bg-white dark:bg-[#180e10] border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs shadow-sm z-10 shrink-0">
                    {index + 1}
                  </span>
                  
                  <div className="flex-1 relative space-y-2">
                    <div className="absolute top-10 bottom-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <select
                      aria-label={`Stop ${index + 1} type`}
                      value={stop?.type === 'group' ? 'group' : 'office'}
                      onChange={e => handleStopKindChange(index, e.target.value)}
                      className="w-full bg-white dark:bg-[#180e10] text-gray-900 dark:text-white border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="office">Specific office</option>
                      <option value="group">Category placeholder</option>
                    </select>
                    <select
                      required={index < 2}
                      value={stop?.type === 'group' ? (stop.groupId || '') : (stop || '')}
                      onChange={e => handleStopSelectorChange(index, e.target.value)}
                      className="w-full bg-white dark:bg-[#180e10] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] transition-all cursor-pointer shadow-sm appearance-none"
                    >
                      <option value="" className="text-gray-400">
                        {index < 2 ? `-- Select Target Stop Location (Required) --` : `-- Select Downstream Station (Optional) --`}
                      </option>
                      {stop?.type === 'group'
                        ? routeGroups.filter(group => group.offices?.length).map(group => <option key={group.group_id} value={group.group_id}>{group.group_name} category ({group.offices.length} offices)</option>)
                        : offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add / Remove Stop Buttons */}
          <div className="flex flex-wrap gap-3">
            <button 
              type="button" 
              onClick={handleAddStopSlot} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1c1113] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white text-gray-700 dark:text-gray-300 transition-colors text-xs font-bold cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Add Downstream Step
            </button>
            <button 
              type="button" 
              onClick={handleRemoveTrailingStopSlot} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1c1113] border border-gray-300 dark:border-gray-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/35 hover:border-red-200 transition-colors text-xs font-bold cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete Last Step
            </button>
          </div>

          <div className="flex-1"></div>

          {formMeta.currentProcessId && (
            <div className="bg-white dark:bg-[#1c1113] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 mt-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white select-none">Template Operational Status</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Archiving hides this workflow option from faculty dashboards.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormMeta({ ...formMeta, is_active: !formMeta.is_active })}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm cursor-pointer shrink-0 ${
                  formMeta.is_active 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' 
                    : 'bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {formMeta.is_active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${formMeta.is_active ? 'bg-emerald-500' : 'bg-[#D32F2F]'}`}></span>
                </span>
                {formMeta.is_active ? "Template Active" : "Archived / Hidden"}
              </button>
            </div>
          )}

          <div className="flex justify-end pt-5 border-t border-gray-100 dark:border-[#42292f] mt-4">
            <button 
              type="submit" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D32F2F] dark:bg-red-700 text-white text-sm tracking-wide font-bold hover:bg-[#b71c1c] dark:hover:bg-red-800 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              {formMeta.currentProcessId ? "Save Structural Changes" : "Deploy Tracking Template"}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: BLUEPRINTS DIRECTORY */}
      <div className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] p-6 rounded-2xl shadow-sm flex flex-col h-[600px] lg:sticky lg:top-6">
        <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-[#42292f] pb-4 shrink-0">
          <h4 className="text-sm font-bold tracking-wide text-gray-900 dark:text-white uppercase flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Pipeline Blueprints ({processTypes.length})
          </h4>
          {formMeta.currentProcessId && (
            <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-[#D32F2F] dark:text-red-400 font-bold px-2 py-1 rounded-md border border-red-100 dark:border-red-800 animate-pulse tracking-wide uppercase">
              Editing Mode
            </span>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
          {processTypes.map((p) => {
            const stopsArray = Array.from({length: 7}, (_, index) => p[`stop_${index + 1}_kind`] === 'group' ? `${p[`stop_${index + 1}_group_name`]} category` : p[`stop_${index + 1}_name`]).filter(Boolean);
            const stopsIdsArray = Array.from({length: 7}, (_, index) => p[`stop_${index + 1}_kind`] === 'group' ? {type: 'group', groupId: p[`stop_${index + 1}_group_id`]} : p[`stop_${index + 1}`]).filter(Boolean);
            const isSelectedCard = formMeta.currentProcessId === p.p_id;

            return (
              <div 
                key={p.p_id} 
                onClick={() => {
                  setNewProcessName(p.process_name);
                  setCategoryId(String(p.category_id));
                  setSelectedStops(stopsIdsArray);
                  setFormMeta({ currentProcessId: p.p_id, currentRouteId: p.r_id, is_active: p.is_active ?? true });
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelectedCard 
                    ? 'bg-red-50/50 dark:bg-red-900/20 border-[#D32F2F] dark:border-red-600 shadow-sm ring-1 ring-[#D32F2F]'
                    : p.is_active === false 
                      ? 'bg-gray-50 dark:bg-[#1c1113] opacity-60 border-gray-200 dark:border-gray-800 hover:opacity-100 grayscale-[50%]' 
                      : 'bg-white dark:bg-[#1c1113] border-gray-200 dark:border-[#42292f] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSelectedCard ? 'bg-[#D32F2F] dark:bg-red-600' : p.is_active === false ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300'}`}></div>
                
                <div className="flex justify-between items-start pl-2">
                  <p className={`font-bold text-sm ${isSelectedCard ? 'text-[#D32F2F] dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {p.process_name}
                  </p>
                  <button type="button" aria-label={`Delete ${p.process_name}`} onClick={e => { e.stopPropagation(); deletePipeline(p); }} className="text-xs text-red-800 dark:text-red-400 underline shrink-0 cursor-pointer">Delete</button>
                  {p.is_active === false && (
                    <span className="text-[9px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-2">
                      Archived
                    </span>
                  )}
                </div>
                
                <div className="mt-3 pl-2">
                  <p className="text-xs text-red-800 dark:text-red-400 mb-2">{p.category_name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {stopsArray.map((stopName, index) => (
                      <React.Fragment key={index}>
                        <span className={`px-1.5 py-0.5 rounded ${isSelectedCard ? 'bg-white dark:bg-[#180e10] border border-red-100 dark:border-red-900' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                          {stopName}
                        </span>
                        {index < stopsArray.length - 1 && (
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className={`flex items-center gap-1.5 mt-3 text-[10px] italic ${isSelectedCard ? 'text-[#D32F2F] dark:text-red-400' : 'text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    {isSelectedCard ? "Currently editing this blueprint" : "Click to edit blueprint"}
                  </div>
                </div>
              </div>
            );
          })}
          
          {processTypes.length === 0 && (
            <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-[#1c1113]">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No blueprints found.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}