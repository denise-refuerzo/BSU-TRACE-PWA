import React from 'react';
import FacilityRequestFields from './FacilityRequestFields';
import { X } from 'lucide-react';

export default function ResourceBookingModal({
  activeFacility,
  isSubmitting,
  setShowFormModal,
  handleBookingSubmit,
  userName,
  todayString,
  currentTimeString,
  form,
  setForm
}) {
  const isVan = activeFacility === 'Van';
  const passengers = form.officialPassengers || [''];
  const inputClass = 'w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white';

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col text-left overflow-hidden">
        <div className="p-5 border-b bg-red-800 text-white flex items-center justify-between">
          <h3 className="font-black uppercase text-sm tracking-wider">{activeFacility} Request</h3>
          <button onClick={() => setShowFormModal(false)} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleBookingSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {isVan && <>
          <h4 className="font-semibold text-neutral-800 border-b pb-3">Request details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Requestor's Name</label>
              <input type="text" readOnly value={userName} className="w-full border px-3 py-2 text-xs font-semibold bg-neutral-50 cursor-not-allowed text-neutral-400 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Reservation Date</label>
              <input type="date" required min={todayString} value={form.reservationDate} onChange={e => setForm({...form, reservationDate: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{isVan ? 'Department/Office :' : 'Department Unit'}</label>
              {isVan ? (
                <input aria-label="Department/Office" type="text" required value={form.department} onChange={e => setForm({...form, department: e.target.value})} className={inputClass} />
              ) : (
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none bg-white font-bold text-neutral-700">
                <option value="College of Education">College of Education</option>
                <option value="CICS Department">CICS Department</option>
                <option value="CABEIHM">CABEIHM</option>
                <option value="CAS Department">CAS Department</option>
              </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{isVan ? 'Nature and Purpose of travel:' : 'Purpose of Reservation'}</label>
            <textarea required rows={3} placeholder="Describe the purpose..." value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none resize-none" />
          </div>

          </>}

          {activeFacility !== 'Van' ? (
            <FacilityRequestFields {...{activeFacility, form, setForm, todayString, currentTimeString}} />
          ) : (
            <div className="space-y-4 pt-2 border-t border-dashed border-neutral-200 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Destination Target</label>
                  <input type="text" required placeholder="e.g., BatStateU Main Campus" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full border px-3 py-2 text-xs rounded-lg border-neutral-300 outline-none bg-white" />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-gray-600 mb-1">Official passengers:</legend>
                {passengers.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input aria-label={`Official passenger ${index + 1}`} type="text" required placeholder={`Passenger ${index + 1} name`} value={name} onChange={e => setForm({...form, officialPassengers: passengers.map((value, i) => i === index ? e.target.value : value)})} className={inputClass} />
                    <button type="button" disabled={passengers.length === 1} aria-label={`Remove passenger ${index + 1}`} onClick={() => setForm({...form, officialPassengers: passengers.filter((_, i) => i !== index)})} className="text-xs text-red-800 disabled:opacity-30">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({...form, officialPassengers: [...passengers, '']})} className="text-xs font-bold text-red-800">+ Add Passenger</button>
              </fieldset>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Service Type</label>
                <div className="flex gap-4 items-center text-xs font-bold text-neutral-600 mt-2">
                  {[{ id: '1', l: 'Pick-up' }, { id: '2', l: 'Drop-off' }, { id: '3', l: 'Both' }].map(s => (
                    <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="srv" checked={form.serviceTypeId === s.id} onChange={() => setForm({...form, serviceTypeId: s.id})} className="text-red-800 focus:ring-red-700" />
                      {s.l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Time of Departure:</label>
                  <input type="time" required min={form.reservationDate === todayString ? currentTimeString : undefined} value={form.pickUpTime} onChange={e => setForm({...form, pickUpTime: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Time of Arrival:</label>
                  <input type="time" required min={form.pickUpTime || (form.reservationDate === todayString ? currentTimeString : undefined)} value={form.dropOffTime} onChange={e => setForm({...form, dropOffTime: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {isVan && (
            <div className="space-y-5 border-t border-neutral-200 pt-5">
              <h4 className="font-semibold text-neutral-800">GSO assignment and signatories</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Vehicle to be Used:', 'Designated Driver:', 'Plate Number:', 'License Number:'].map(label => (
                  <label key={label} className="block text-xs font-semibold text-gray-600">
                    {label}
                    <input type="text" readOnly value="To be assigned" className={`${inputClass} mt-1 bg-neutral-50 text-neutral-400 cursor-not-allowed`} />
                  </label>
                ))}
              </div>
              {[{title: 'Prepared/Requested by:', name: 'preparedByName', position: 'preparedByPosition'}, {title: 'Recommending Approval:', name: 'recommendingApprovalName', position: 'recommendingApprovalPosition'}].map(section => (
                <fieldset key={section.name}>
                  <legend className="text-xs font-semibold text-gray-600 mb-2">{section.title}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-xs text-neutral-600">Name
                      <input type="text" required value={form[section.name] || ''} onChange={e => setForm({...form, [section.name]: e.target.value})} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="text-xs text-neutral-600">Position
                      <input type="text" required value={form[section.position] || ''} onChange={e => setForm({...form, [section.position]: e.target.value})} className={`${inputClass} mt-1`} />
                    </label>
                  </div>
                </fieldset>
              ))}
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
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 font-bold bg-red-800 hover:bg-red-900 text-white text-xs rounded-lg">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}