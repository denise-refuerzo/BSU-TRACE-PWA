import FacilityRequestFields from './FacilityRequestFields';
import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { fetchWithAuth } from '../../../../api';

export default function ResourceBookingModal({
  activeFacility,
  isSubmitting,
  setShowFormModal,
  handleBookingSubmit,
  userName,
  todayString,
  currentTimeString,
  form,
  setForm,
  facilityOptions,
  facilityOptionsLoading,
  signatories
}) {
  const isVan = activeFacility === 'Van';
  const [fleetAvailability, setFleetAvailability] = useState(null);
  const fleetWindow = `${form.reservationDate}|${form.pickUpTime}|${form.dropOffTime}`;
  const currentFleetAvailability = fleetAvailability?.window === fleetWindow ? fleetAvailability.data : null;
  const [showFleetInfo, setShowFleetInfo] = useState(false);
  useEffect(() => {
    if (!isVan || !form.reservationDate || !form.pickUpTime || !form.dropOffTime || form.pickUpTime >= form.dropOffTime) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({date:form.reservationDate,start:form.pickUpTime,end:form.dropOffTime,type:'Vehicle'});
        const response = await fetchWithAuth(`/api/resources/availability?${query}`);
        const data = await response.json();
        if (active) setFleetAvailability({window:fleetWindow,data:response.ok ? data : {available:false,reason:data.error}});
      } catch {
        if (active) setFleetAvailability({window:fleetWindow,data:{available:false,reason:'Availability could not be checked. Try again.'}});
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isVan, form.reservationDate, form.pickUpTime, form.dropOffTime, fleetWindow]);
  const passengers = form.officialPassengers || [''];
  const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 dark:border-gray-700 dark:bg-[#1c1113] dark:text-white';
  const cardClass = 'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 dark:border-[#42292f] dark:bg-[#1c1113]/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-2 backdrop-blur-xs animate-in fade-in duration-100 sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="resource-request-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 text-left shadow-2xl dark:border-[#42292f] dark:bg-[#180e10]">
        <div className="flex items-start justify-between gap-4 border-b border-red-900 bg-red-800 p-4 text-white dark:bg-red-900 sm:px-6 sm:py-5">
          <div>
            <h3 id="resource-request-title" className="text-base font-bold">{activeFacility} Request</h3>
            <p className="mt-1 text-xs text-red-100">Complete each section before submitting your request.</p>
          </div>
          <button type="button" aria-label="Close request form" onClick={() => setShowFormModal(false)} className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleBookingSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 space-y-4 overflow-y-auto p-4 custom-scrollbar sm:p-6">
          {isVan && <div className="relative flex justify-end" onMouseEnter={() => setShowFleetInfo(true)} onMouseLeave={() => setShowFleetInfo(false)}>
            <button type="button" aria-label="Show available vehicles and drivers" aria-expanded={showFleetInfo}
              onClick={() => setShowFleetInfo(true)}
              className="rounded-full bg-blue-50 p-2 text-blue-700 ring-2 ring-blue-200 shadow-[0_0_14px_rgba(37,99,235,0.45)] hover:shadow-[0_0_20px_rgba(37,99,235,0.7)] focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Info size={18} />
            </button>
            {showFleetInfo && <div role="status" className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-blue-200 bg-white p-3 text-xs text-gray-700 shadow-lg dark:border-blue-800 dark:bg-[#1c1113] dark:text-gray-200">
              {!form.reservationDate || !form.pickUpTime || !form.dropOffTime ? 'Choose a date, departure, and arrival time to see available vehicles and drivers.' : currentFleetAvailability ? `${currentFleetAvailability.vehicleCount ?? 0} vehicle(s) and ${currentFleetAvailability.driverCount ?? 0} driver(s) available for this time. ${currentFleetAvailability.reason || ''}` : 'Checking availability…'}
            </div>}
          </div>}
          {isVan && <section className={cardClass}>
          <div className="mb-5 border-b border-neutral-100 pb-4 dark:border-[#42292f]">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">1. Request details</h4>
            <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">Who is requesting the vehicle and why?</p>
          </div>
          <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Requestor's Name</label>
              <input type="text" readOnly value={userName} className={`${inputClass} bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-gray-400`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Reservation Date</label>
              <input type="date" required min={todayString} value={form.reservationDate} onChange={e => setForm({...form, reservationDate: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Requesting office or department</label>
              <input aria-label="Requesting office or department" type="text" required readOnly value={form.department} className={`${inputClass} bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{isVan ? 'Nature and Purpose of travel:' : 'Purpose of Reservation'}</label>
            <textarea required rows={3} placeholder="Describe the purpose..." value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className={`${inputClass} resize-y`} />
          </div>

          </div>
          </section>}

          {activeFacility !== 'Van' ? (
            <FacilityRequestFields {...{activeFacility, form, setForm, todayString, currentTimeString, facilityOptions, facilityOptionsLoading, signatories}} />
          ) : (
            <section className={cardClass}>
              <div className="mb-5 border-b border-neutral-100 pb-4 dark:border-[#42292f]">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">2. Travel details</h4>
                <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">Add the destination, passengers, and travel times.</p>
              </div>
              <div className="space-y-5">
              <div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Destination Target</label>
                  <input type="text" required placeholder="e.g., BatStateU Main Campus" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className={inputClass} />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Official passengers:</legend>
                {passengers.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input aria-label={`Official passenger ${index + 1}`} type="text" required placeholder={`Passenger ${index + 1} name`} value={name} onChange={e => setForm({...form, officialPassengers: passengers.map((value, i) => i === index ? e.target.value : value)})} className={`${inputClass} min-w-0 flex-1`} />
                    <button type="button" disabled={passengers.length === 1} aria-label={`Remove passenger ${index + 1}`} onClick={() => setForm({...form, officialPassengers: passengers.filter((_, i) => i !== index)})} className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-red-800 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-900/20 cursor-pointer">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({...form, officialPassengers: [...passengers, '']})} className="text-xs font-bold text-red-800 dark:text-red-400 cursor-pointer">+ Add Passenger</button>
              </fieldset>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Service Type</label>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600 dark:text-gray-300">
                  {[{ id: '1', l: 'Pick-up' }, { id: '2', l: 'Drop-off' }, { id: '3', l: 'Both' }].map(s => (
                    <label key={s.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#1c1113]">
                      <input type="radio" name="srv" checked={form.serviceTypeId === s.id} onChange={() => setForm({...form, serviceTypeId: s.id})} className="text-red-800 dark:text-red-700 focus:ring-red-700 cursor-pointer" />
                      {s.l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Estimated Time of Departure:</label>
                  <input type="time" required min={form.reservationDate === todayString ? currentTimeString : undefined} value={form.pickUpTime} onChange={e => setForm({...form, pickUpTime: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Estimated Time of Arrival:</label>
                  <input type="time" required min={form.pickUpTime || (form.reservationDate === todayString ? currentTimeString : undefined)} value={form.dropOffTime} onChange={e => setForm({...form, dropOffTime: e.target.value})} className={inputClass} />
                </div>
              </div>
              </div>
            </section>
          )}

          {isVan && (
            <section className={cardClass}>
              <div className="mb-5 border-b border-neutral-100 pb-4 dark:border-[#42292f]">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">3. Vehicle assignment and approvals</h4>
                <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">Vehicle details will be assigned after review. Select your recommending signatory below.</p>
              </div>
              <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Vehicle to be Used:', 'Designated Driver:', 'Plate Number:', 'License Number:'].map(label => (
                  <label key={label} className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {label}
                    <input type="text" readOnly value="To be assigned" className={`${inputClass} mt-1 bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-gray-500 cursor-not-allowed`} />
                  </label>
                ))}
              </div>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Prepared/Requested by:</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-xs text-neutral-600 dark:text-gray-400">Position / Office<input type="text" readOnly value={form.preparedByPosition || 'No office assigned'} className={`${inputClass} mt-1 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400 cursor-not-allowed`} /></label>
                  <label className="text-xs text-neutral-600 dark:text-gray-400">Name<input type="text" readOnly value={form.preparedByName || 'Account not found'} className={`${inputClass} mt-1 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-gray-400 cursor-not-allowed`} /></label>
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Recommending Approval:</legend>
                {(() => {
                  const offices = (signatories?.offices || []).filter(office => office.recommenders.length);
                  const selectedOffice = offices.find(office => String(office.officeId) === String(form.recommendingApprovalOfficeId));
                  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-xs text-neutral-600 dark:text-gray-400">Office<select required value={form.recommendingApprovalOfficeId || ''} onChange={e => setForm({...form, recommendingApprovalOfficeId: e.target.value, recommendingApprovalUserId: ''})} className={`${inputClass} mt-1 cursor-pointer`}><option value="">Choose an office</option>{offices.map(office => <option key={office.officeId} value={office.officeId}>{office.officeName}</option>)}</select></label>
                    <label className="text-xs text-neutral-600 dark:text-gray-400">Name<select required disabled={!selectedOffice} value={form.recommendingApprovalUserId || ''} onChange={e => setForm({...form, recommendingApprovalUserId: e.target.value})} className={`${inputClass} mt-1 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-400 dark:disabled:text-gray-600 cursor-pointer`}><option value="">{selectedOffice ? 'Choose a person' : 'Choose an office first'}</option>{(selectedOffice?.recommenders || []).map(person => <option key={person.userId} value={person.userId}>{person.name}{person.position ? ` — ${person.position}` : ''}</option>)}</select></label>
                  </div>;
                })()}
              </fieldset>
              {!(signatories?.offices || []).some(office => office.recommenders.length) && <p className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs font-medium text-amber-800 dark:text-amber-300">A recommending signatory must be assigned by ICT Admin before this request can be submitted.</p>}
              </div>
            </section>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-[#42292f] dark:bg-[#1c1113]/50">
            <input type="checkbox" id="resConfirm" required className="mt-0.5 rounded text-red-800 dark:text-red-700 focus:ring-red-700 w-3.5 h-3.5 cursor-pointer" />
            <label htmlFor="resConfirm" className="text-xs leading-relaxed text-neutral-600 dark:text-gray-300 cursor-pointer">
              I verify that all information provided is accurate and I agree to follow the institutional resource usage policies.
            </label>
          </div>

          </div>
          <div className="flex shrink-0 justify-end gap-2.5 border-t border-neutral-200 bg-white px-4 py-3 dark:border-[#42292f] dark:bg-[#180e10] sm:px-6">
            <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] font-bold text-gray-500 dark:text-gray-300 text-xs rounded-lg hover:bg-neutral-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 font-bold bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white text-xs rounded-lg shadow-sm cursor-pointer">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
