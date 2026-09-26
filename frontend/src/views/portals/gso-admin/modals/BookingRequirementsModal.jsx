import React from 'react';
import { 
  X, FileText, Calendar, Clock, MapPin, Users, Building, 
  Car, UserCheck
} from 'lucide-react';
import { publicReference } from '../../../../utils/publicReference';

export default function BookingRequirementsModal({
  showActiveChecklistModal,
  setShowActiveChecklistModal,
  activeChecklistBooking,
  activeChecklistItems,
  handleToggleChecklistItem,
  busy
}) {
  if (!showActiveChecklistModal || !activeChecklistBooking) return null;

  const b = activeChecklistBooking;
  const isVehicle = b.booking_type === 'Vehicle';
  const isFacility = b.booking_type === 'Room' || b.booking_type === 'Gymnasium';

  let details = b.request_details;
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch (e) { details = {}; }
  }
  details = details || {};

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 px-6 border-b border-gray-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Request Review & Checklist</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{publicReference('REQ', b.booking_id)} · {b.requestor}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowActiveChecklistModal(false)} 
            className="text-neutral-400 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-200 p-1 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
          
          {/* TOP SUMMARY */}
          <div className="bg-neutral-50/80 dark:bg-[#1c1113] border border-neutral-200/80 dark:border-[#42292f] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-200/60 dark:border-gray-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-neutral-400 dark:text-gray-500 tracking-wider block">Requested By</span>
                <p className="font-extrabold text-neutral-900 dark:text-white text-sm mt-0.5">{b.requestor}</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] font-medium">{b.department || 'Department Not Specified'}</p>
              </div>

              <div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  ['Confirmed','Approved'].includes(b.status)
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}>
                  {b.status === 'Reserved' ? 'Pending' : b.status}
                </span>
              </div>
            </div>

            {/* META DETAILS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                  <Calendar size={12} /> Schedule
                </span>
                <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.reservation_date || 'N/A'}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                  <Clock size={12} /> Time Window
                </span>
                <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                  {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                </p>
              </div>

              {isVehicle ? (
                <>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                      <Car size={12} /> Assigned Vehicle
                    </span>
                    {b.vehicle_to_be_used ? (
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {b.vehicle_to_be_used} <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">({b.plate_number})</span>
                      </p>
                    ) : (
                      <p className="font-bold text-amber-600 dark:text-amber-400 italic mt-0.5">To be assigned</p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                      <UserCheck size={12} /> Assigned Driver
                    </span>
                    {b.designated_driver ? (
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.designated_driver}</p>
                    ) : (
                      <p className="font-bold text-amber-600 dark:text-amber-400 italic mt-0.5">To be assigned</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                    <Building size={12} /> Facility
                  </span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.asset_name || b.booking_type}</p>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Purpose / Event</span>
              <p className="text-gray-700 dark:text-gray-300 font-semibold mt-0.5 bg-white dark:bg-[#180e10] p-2 rounded-lg border border-neutral-200/60 dark:border-gray-800 leading-relaxed">
                {b.purpose || 'No description provided'}
              </p>
            </div>
          </div>

          {/* VEHICLE TRIP DETAILS */}
          {isVehicle && (
            <div className="border border-neutral-200 dark:border-[#42292f] rounded-xl p-4 bg-white dark:bg-[#180e10] space-y-3">
              <span className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <Car size={14} className="text-blue-600 dark:text-blue-400" /> Travel Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 dark:bg-[#1c1113] p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Destination</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.destination || 'Not Specified'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Service Type</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.trip_type || 'General Service'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Prepared By</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{b.prepared_by_name || '—'} {b.prepared_by_position ? `(${b.prepared_by_position})` : ''}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Recommending Approval</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{b.recommending_approval_name || '—'} {b.recommending_approval_position ? `(${b.recommending_approval_position})` : ''}</p>
                </div>
              </div>

              {b.official_passengers && b.official_passengers.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">
                    Official Passengers ({b.official_passengers.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {b.official_passengers.map((p, idx) => (
                      <span key={idx} className="bg-neutral-100 dark:bg-gray-800 text-neutral-800 dark:text-gray-200 font-bold px-2 py-0.5 rounded text-[11px] border border-neutral-200 dark:border-gray-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FACILITY DETAILS */}
          {isFacility && (
            <div className="border border-neutral-200 dark:border-[#42292f] rounded-xl p-4 bg-white dark:bg-[#180e10] space-y-3">
              <span className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <Building size={14} className="text-purple-600 dark:text-purple-400" /> Facility Booking Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 dark:bg-[#1c1113] p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Expected Attendees</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{b.expected_attendees || 'Not Specified'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Participants</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{details.participants?.join(', ') || 'General'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Person in Charge</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{details.personInChargeName || '—'} {details.personInChargePosition ? `(${details.personInChargePosition})` : ''}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Approved By</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{details.approvedByName || '—'} {details.approvedByPosition ? `(${details.approvedByPosition})` : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* CHECKLIST */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-neutral-500 dark:text-gray-400 tracking-wider">
                Required Documents Checklist
              </span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                {activeChecklistItems.filter(i => i.is_checked).length} of {activeChecklistItems.length} verified
              </span>
            </div>

            <div className="space-y-2">
              {activeChecklistItems.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-neutral-200 dark:border-gray-700 rounded-xl text-neutral-400 dark:text-gray-500 text-xs font-bold">
                  No required documents configured for this request type.
                </div>
              ) : (
                activeChecklistItems.map((item) => (
                  <label 
                    key={item.check_id} 
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      item.is_checked 
                        ? 'bg-emerald-50/60 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300' 
                        : 'bg-white dark:bg-[#1c1113] border-neutral-200 dark:border-gray-700 hover:bg-neutral-50 dark:hover:bg-gray-800 text-neutral-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="relative flex items-center justify-center shrink-0">
                      <input 
                        type="checkbox"
                        disabled={busy}
                        checked={item.is_checked} 
                        onChange={() => handleToggleChecklistItem(item.check_id, item.is_checked)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-red-800 focus:ring-red-700 cursor-pointer"
                      />
                    </div>
                    <span className={`text-xs font-bold flex-1 ${item.is_checked ? 'line-through opacity-80' : ''}`}>
                      {item.item_name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 px-6 border-t border-gray-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex justify-end">
          <button 
            type="button" 
            onClick={() => setShowActiveChecklistModal(false)} 
            className="px-6 py-2.5 bg-neutral-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}