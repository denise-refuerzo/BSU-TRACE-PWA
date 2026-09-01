import React from 'react';

export default function InteractiveVisualizerTab({
  formMeta, setFormMeta, newProcessName, setNewProcessName, selectedStops,
  handleStopSelectorChange, handleAddStopSlot, handleRemoveTrailingStopSlot,
  offices, resetWorkflowForm, handleProcessFormSubmit, processTypes
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: WORKFLOW BUILDER FORM */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col h-full">
        
        {/* Header & Reset Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8 pb-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              {formMeta.currentProcessId ? "Update Workflow Blueprint" : "Compile New Workflow Template"}
            </h3>
            <p className="text-xs text-gray-500 mt-1.5">Design linear multi-stop routing pipelines mapping across campus destinations.</p>
          </div>
          {formMeta.currentProcessId && (
            <button 
              type="button" 
              onClick={resetWorkflowForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 border border-gray-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Cancel Edit Mode
            </button>
          )}
        </div>

        <form onSubmit={handleProcessFormSubmit} className="space-y-6 flex-1 flex flex-col">
          
          {/* Process Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
              Process Action Name
            </label>
            <input 
              type="text" 
              required 
              value={newProcessName} 
              onChange={e => setNewProcessName(e.target.value)} 
              placeholder="e.g. Equipment Borrowing Request" 
              className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] outline-none transition-all shadow-sm" 
            />
          </div>

          {/* Stops Matrix */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              Pipeline Tracking Progress Sequence
            </label>
            
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
              {selectedStops.map((stop, index) => (
                <div key={index} className="flex items-center gap-3 relative animate-in slide-in-from-top-2 duration-200">
                  {/* Visual Timeline Connector */}
                  {index !== selectedStops.length - 1 && (
                    <div className="absolute left-3.5 top-8 bottom-[-16px] w-0.5 bg-gray-300 z-0"></div>
                  )}
                  
                  <span className="w-7 h-7 rounded-full bg-white border-2 border-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shadow-sm z-10 shrink-0">
                    {index + 1}
                  </span>
                  
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <select
                      required={index < 2}
                      value={stop || ''}
                      onChange={e => handleStopSelectorChange(index, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D32F2F] transition-all cursor-pointer shadow-sm appearance-none"
                    >
                      <option value="" className="text-gray-400">
                        {index < 2 ? `-- Select Target Stop Location (Required) --` : `-- Select Downstream Station (Optional) --`}
                      </option>
                      {offices.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 text-gray-700 transition-colors text-xs font-bold cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Add Downstream Step
            </button>
            <button 
              type="button" 
              onClick={handleRemoveTrailingStopSlot} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors text-xs font-bold cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete Last Step
            </button>
          </div>

          {/* 🔒 SOFT SUSPENSION OVERVIEW FOR WORKFLOW BLUEPRINTS */}
          <div className="flex-1"></div> {/* Spacer to push bottom controls down */}

          {formMeta.currentProcessId && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 mt-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 select-none">Template Operational Status</label>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Archiving hides this workflow option from faculty dashboards.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormMeta({ ...formMeta, is_active: !formMeta.is_active })}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm cursor-pointer shrink-0 ${
                  formMeta.is_active 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-red-50 text-[#D32F2F] border border-red-200 hover:bg-red-100'
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

          <div className="flex justify-end pt-5 border-t border-gray-100 mt-4">
            <button 
              type="submit" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D32F2F] text-white text-sm tracking-wide font-bold hover:bg-[#b71c1c] rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              {formMeta.currentProcessId ? "Save Structural Changes" : "Deploy Tracking Template"}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: BLUEPRINTS DIRECTORY (Fixed Height + Scrollable) */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col h-[600px] lg:sticky lg:top-6">
        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4 shrink-0">
          <h4 className="text-sm font-bold tracking-wide text-gray-900 uppercase flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Pipeline Blueprints ({processTypes.length})
          </h4>
          {formMeta.currentProcessId && (
            <span className="text-[10px] bg-red-50 text-[#D32F2F] font-bold px-2 py-1 rounded-md border border-red-100 animate-pulse tracking-wide uppercase">
              Editing Mode
            </span>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
          {processTypes.map((p) => {
            const stopsArray = [p.stop_1_name, p.stop_2_name, p.stop_3_name, p.stop_4_name, p.stop_5_name, p.stop_6_name, p.stop_7_name].filter(Boolean);
            const stopsIdsArray = [p.stop_1, p.stop_2, p.stop_3, p.stop_4, p.stop_5, p.stop_6, p.stop_7].filter(Boolean);
            const isSelectedCard = formMeta.currentProcessId === p.p_id;

            return (
              <div 
                key={p.p_id} 
                onClick={() => {
                  setNewProcessName(p.process_name);
                  setSelectedStops(stopsIdsArray);
                  setFormMeta({ currentProcessId: p.p_id, currentRouteId: p.r_id, is_active: p.is_active ?? true });
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelectedCard 
                    ? 'bg-red-50/50 border-[#D32F2F] shadow-sm ring-1 ring-[#D32F2F]'
                    : p.is_active === false 
                      ? 'bg-gray-50 opacity-60 border-gray-200 hover:opacity-100 grayscale-[50%]' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Visual indicator bar on the left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSelectedCard ? 'bg-[#D32F2F]' : p.is_active === false ? 'bg-gray-300' : 'bg-gray-200 group-hover:bg-gray-300'}`}></div>
                
                <div className="flex justify-between items-start pl-2">
                  <p className={`font-bold text-sm ${isSelectedCard ? 'text-[#D32F2F]' : 'text-gray-900'}`}>
                    {p.process_name}
                  </p>
                  {p.is_active === false && (
                    <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-2">
                      Archived
                    </span>
                  )}
                </div>
                
                <div className="mt-3 pl-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 font-medium">
                    {stopsArray.map((stopName, index) => (
                      <React.Fragment key={index}>
                        <span className={`px-1.5 py-0.5 rounded ${isSelectedCard ? 'bg-white border border-red-100' : 'bg-gray-100 border border-gray-200'}`}>
                          {stopName}
                        </span>
                        {index < stopsArray.length - 1 && (
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className={`flex items-center gap-1.5 mt-3 text-[10px] italic ${isSelectedCard ? 'text-[#D32F2F]' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    {isSelectedCard ? "Currently editing this blueprint" : "Click to edit blueprint"}
                  </div>
                </div>
              </div>
            );
          })}
          
          {processTypes.length === 0 && (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-500 font-medium">No blueprints found.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}