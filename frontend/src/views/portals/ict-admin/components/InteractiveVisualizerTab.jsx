import React from 'react';

export default function InteractiveVisualizerTab({
  formMeta, setFormMeta, newProcessName, setNewProcessName, selectedStops,
  handleStopSelectorChange, handleAddStopSlot, handleRemoveTrailingStopSlot,
  offices, resetWorkflowForm, handleProcessFormSubmit, processTypes
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-800">
              {formMeta.currentProcessId ? "🔧 Update Workflow Blueprint" : "Compile New Workflow Template"}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Design linear multi-stop routing pipelines mapping across campus destinations.</p>
          </div>
          {formMeta.currentProcessId && (
            <button 
              type="button" 
              onClick={resetWorkflowForm}
              className="text-[10px] bg-neutral-900 text-white font-bold px-2 py-1 rounded hover:bg-red-800 transition-all cursor-pointer"
            >
              Reset Form Mode
            </button>
          )}
        </div>

        <form onSubmit={handleProcessFormSubmit} className="space-y-4 text-xs font-bold">
          <div>
            <label className="block text-[10px] uppercase text-gray-500 mb-1">Process Action Name (e.g. Equipment borrowing Request)</label>
            <input type="text" required value={newProcessName} onChange={e => setNewProcessName(e.target.value)} placeholder="Enter process title descriptive tag..." className="w-full border border-neutral-300 bg-[#FDFBF9] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-red-700 outline-none" />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] uppercase text-gray-500">Pipeline Tracking Progress Sequence Stops Matrix</label>
            
            {selectedStops.map((stop, index) => (
              <div key={index} className="flex items-center gap-3 bg-neutral-50 p-2 border rounded-xl animate-in slide-in-from-top-2 duration-100">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-mono font-bold text-[10px] shadow-xs">{index + 1}</span>
                <select
                  required={index < 2}
                  value={stop || ''}
                  onChange={e => handleStopSelectorChange(index, e.target.value)}
                  className="flex-1 bg-white border rounded-lg p-2 text-xs outline-none cursor-pointer"
                >
                  <option value="">{index < 2 ? `-- Select Required Target Stop Location (Required) --` : `-- Select Optional Downstream Station (Optional Null Loop) --`}</option>
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>🏬 {o.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleAddStopSlot} className="px-3 py-2 border bg-white border-neutral-300 rounded-lg hover:bg-neutral-50 transition-all text-[11px] font-bold cursor-pointer">➕ Add Downstream Step</button>
            <button type="button" onClick={handleRemoveTrailingStopSlot} className="px-3 py-2 border bg-white border-neutral-300 rounded-lg text-red-700 hover:bg-red-50 transition-all text-[11px] font-bold cursor-pointer">✕ Delete Last Step</button>
          </div>

          {/* 🔒 SOFT SUSPENSION OVERVIEW FOR WORKFLOW BLUEPRINTS */}
          {formMeta.currentProcessId && (
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex items-center justify-between animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-neutral-700 select-none">Template Operational Status</label>
                <p className="text-[10px] text-gray-400 font-normal mt-0.5">Archiving hides this workflow option from faculty dashboards instantly without breaking log integrity profiles.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormMeta({ ...formMeta, is_active: !formMeta.is_active })}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer ${
                  formMeta.is_active 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {formMeta.is_active ? "🟢 Template Active" : "🔴 Archived / Hidden"}
              </button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button type="submit" className="px-5 py-2.5 bg-red-800 text-white text-xs tracking-wider uppercase font-black hover:bg-red-900 rounded-xl shadow-xs transition-all cursor-pointer">
              {formMeta.currentProcessId ? "Save Structural Changes" : "Deploy Tracking Template"}
            </button>
          </div>
        </form>
      </div>

      {/* Dynamic Interactive Blueprints Directory List Sideboard Card */}
      <div className="bg-[#2D1F1E] text-neutral-300 p-5 rounded-2xl shadow-sm space-y-4 text-left">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1">📋 Pipeline Blueprints ({processTypes.length})</h4>
          {formMeta.currentProcessId && (
            <span className="text-[9px] bg-red-600/30 text-red-300 font-mono font-bold px-2 py-0.5 rounded border border-red-500/20 animate-pulse">Editing Mode</span>
          )}
        </div>

        <div className="space-y-2 text-[11px] max-h-[380px] overflow-y-auto custom-scrollbar">
          {processTypes.map((p) => {
            const stopsArray = [p.stop_1, p.stop_2, p.stop_3, p.stop_4, p.stop_5, p.stop_6, p.stop_7].filter(Boolean);
            const isSelectedCard = formMeta.currentProcessId === p.p_id;

            return (
              <div 
                key={p.p_id} 
                onClick={() => {
                  setNewProcessName(p.process_name);
                  setSelectedStops(stopsArray);
                  setFormMeta({ currentProcessId: p.p_id, currentRouteId: p.r_id, is_active: p.is_active ?? true });
                }}
                className={`p-2.5 rounded-lg border transition-all ${
                  isSelectedCard 
                    ? 'bg-red-900/30 border-red-400 shadow-md ring-1 ring-red-400/30'
                    : p.is_active === false 
                      ? 'bg-neutral-800/40 opacity-40 border-neutral-700/30 italic' 
                      : 'bg-white/5 border-neutral-700/50 hover:border-red-400 cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-white text-xs">{p.process_name}</p>
                  {p.is_active === false && <span className="text-[9px] font-mono text-red-400 font-bold uppercase">[Archived]</span>}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono tracking-tight leading-normal space-y-0.5 mt-1">
                  <p>{[p.stop_1_name, p.stop_2_name, p.stop_3_name, p.stop_4_name, p.stop_5_name, p.stop_6_name, p.stop_7_name].filter(Boolean).join(' ➔ ')}</p>
                  <p className="text-neutral-500 text-[9px] mt-1.5 italic">➔ Click template blueprint to edit path columns</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}