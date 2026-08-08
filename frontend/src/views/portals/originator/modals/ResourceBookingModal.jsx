import React from 'react';
import { X } from 'lucide-react';

export default function ResourceBookingModal({
  activeFacility,
  setShowFormModal,
  handleBookingSubmit,
  userName,
  todayString,
  currentTimeString,
  form,
  setForm
}) {
  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col text-left overflow-hidden">
        <div className="p-5 border-b bg-red-800 text-white flex items-center justify-between">
          <h3 className="font-black uppercase text-sm tracking-wider">{activeFacility} Reservation</h3>
          <button onClick={() => setShowFormModal(false)} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Requestor's Name</label>
              <input type="text" readOnly value={userName} className="w-full border px-3 py-2 text-xs font-semibold bg-neutral-50 cursor-not-allowed text-neutral-400 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reservation Date</label>
              <input type="date" required min={todayString} value={form.reservationDate} onChange={e => setForm({...form, reservationDate: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Department Unit</label>
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none bg-white font-bold text-neutral-700">
                <option value="College of Education">College of Education</option>
                <option value="CICS Department">CICS Department</option>
                <option value="CABEIHM">CABEIHM</option>
                <option value="CAS Department">CAS Department</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Purpose of Reservation</label>
            <textarea required rows={3} placeholder="Describe the purpose..." value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none resize-none" />
          </div>

          {activeFacility !== 'Van' ? (
            <div className="space-y-4 pt-2 border-t border-dashed border-neutral-200 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                  <input type="time" required min={form.reservationDate === todayString ? currentTimeString : undefined} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Time</label>
                  <input type="time" required min={form.startTime || (form.reservationDate === todayString ? currentTimeString : undefined)} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Expected Attendance</label>
                <input type="number" required placeholder="Estimated headcount" value={form.expectedAttendees} onChange={e => setForm({...form, expectedAttendees: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-dashed border-neutral-200 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Destination Target</label>
                  <input type="text" required placeholder="e.g., BatStateU Main Campus" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Passenger Count</label>
                  <input type="number" required placeholder="e.g., 12" value={form.passengerCount} onChange={e => setForm({...form, passengerCount: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Service Type</label>
                <div className="flex gap-4 items-center text-xs font-bold text-neutral-600 mt-2">
                  {[{ id: '1', l: 'Pick-up' }, { id: '2', l: 'Drop-off' }, { id: '3', l: 'Both' }].map(s => (
                    <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="srv" checked={form.serviceTypeId === s.id} onChange={() => setForm({...form, serviceTypeId: s.id})} className="text-red-800 focus:ring-red-700" />
                      {s.l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pick-up Time</label>
                  <input type="time" required={form.serviceTypeId === '1' || form.serviceTypeId === '3'} disabled={form.serviceTypeId === '2'} min={form.reservationDate === todayString ? currentTimeString : undefined} value={form.pickUpTime} onChange={e => setForm({...form, pickUpTime: e.target.value})} className={`w-full border px-3 py-2 text-xs rounded-lg outline-none transition-all ${form.serviceTypeId === '2' ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Drop-off Time</label>
                  <input type="time" required={form.serviceTypeId === '2' || form.serviceTypeId === '3'} disabled={form.serviceTypeId === '1'} min={form.pickUpTime || (form.reservationDate === todayString ? currentTimeString : undefined)} value={form.dropOffTime} onChange={e => setForm({...form, dropOffTime: e.target.value})} className={`w-full border px-3 py-2 text-xs rounded-lg outline-none transition-all ${form.serviceTypeId === '1' ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'}`} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 pt-3">
            <input type="checkbox" id="resConfirm" required className="mt-0.5 rounded text-red-800 focus:ring-red-700 w-3.5 h-3.5" />
            <label htmlFor="resConfirm" className="text-[11px] text-gray-400 leading-tight">
              I verify that all information provided is accurate and I agree to follow the institutional resource usage policies.
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border font-bold text-gray-500 text-xs rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" className="px-5 py-2 font-bold bg-red-800 hover:bg-red-900 text-white text-xs rounded-lg">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}