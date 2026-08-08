import React from 'react';
import { X } from 'lucide-react';

export default function DocumentSubmissionModal({
  setShowModal,
  submitDocument,
  form,
  setForm,
  handleProcessChange,
  processTypes,
  estimatedDate,
  selectedRoutePreview,
  setSelectedRoutePreview,
  setEstimatedDate
}) {
  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-950">Submit New Document</h3>
          <button type="button" onClick={() => { setShowModal(false); setSelectedRoutePreview([]); setEstimatedDate(''); }} className="text-neutral-400 hover:text-neutral-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submitDocument} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Document Title</label>
            <input type="text" required placeholder="e.g., Curriculum Revision Request" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-700 border-neutral-300" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Process Type</label>
              <select required value={form.processTypeId} onChange={e => handleProcessChange(e.target.value)} className="w-full border bg-white rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-700 border-neutral-300">
                <option value="">Select process pattern...</option>
                {processTypes.map(p => (<option key={p.p_id} value={p.p_id}>{p.process_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Automatic Estimate Based On Route (EDC)</label>
              <input type="text" readOnly value={estimatedDate || "Select a process type..."} className="w-full border bg-neutral-50 font-medium text-neutral-500 rounded-lg px-3 py-2 text-xs outline-none cursor-not-allowed border-neutral-200" />
            </div>
          </div>
          {selectedRoutePreview.length > 0 && (
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
          <div className="flex items-start gap-2.5 pt-2">
            <input type="checkbox" id="confirmBox" required checked={form.confirmation} onChange={e => setForm({...form, confirmation: e.target.checked})} className="mt-0.5 rounded text-red-800 focus:ring-red-700 w-3.5 h-3.5" />
            <label htmlFor="confirmBox" className="text-[11px] text-gray-500 leading-tight select-none">I confirm that the information provided is accurate and all necessary supporting documents are attached as per institutional guidelines.</label>
          </div>
          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => { setShowModal(false); setSelectedRoutePreview([]); setEstimatedDate(''); }} className="px-4 py-2 border font-medium text-gray-500 text-xs rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" className="px-5 py-2 font-medium bg-red-800 hover:bg-red-900 text-white text-xs rounded-lg">Submit Document</button>
          </div>
        </form>
      </div>
    </div>
  );
}