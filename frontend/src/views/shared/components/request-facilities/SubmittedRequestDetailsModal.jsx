import { Bell, Calendar, Car, ClipboardList, MapPin, Users, X } from 'lucide-react';

const parseDetails = value => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const asList = value => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];
  if (value.startsWith('{') && value.endsWith('}')) return value.slice(1, -1).split(',').map(item => item.replace(/^"|"$/g, '').trim()).filter(Boolean);
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

const expandedChoices = (values, otherValue) => asList(values).map(value => value === 'Others' && otherValue ? `Other: ${otherValue}` : value);

const formatDate = value => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  : 'Not provided';

function Detail({ label, children, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[10px] font-black uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-gray-800">{children || 'Not provided'}</dd>
    </div>
  );
}

function Person({ label, name, position }) {
  return <Detail label={label}>{name ? `${name}${position ? ` — ${position}` : ''}` : 'Not provided'}</Detail>;
}

export default function SubmittedRequestDetailsModal({ request, officeName, onClose }) {
  if (!request) return null;
  const details = parseDetails(request.request_details);
  const isVehicle = request.booking_type === 'Vehicle';
  const status = request.status === 'Reserved' ? 'Pending' : (request.status || 'Pending');
  const passengers = asList(request.official_passengers);
  const participants = expandedChoices(details.participants, details.participantsOther);
  const purposes = expandedChoices(details.purposes, details.purposesOther);
  const miscellaneous = expandedChoices(details.miscellaneous, details.miscellaneousOther);
  const submittedAt = request.created_at ? new Date(request.created_at).toLocaleString() : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#FDFBF9] p-5 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-700">Submitted request</p>
            <h4 className="mt-1 text-xl font-black text-gray-900">{request.booking_type === 'Room' ? 'Room' : request.booking_type} request</h4>
          </div>
          <button onClick={onClose} aria-label="Close request details" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          {request.latest_notification && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h5 className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900"><Bell size={16}/> Latest GSO booking update</h5>
              <p className="text-sm font-medium leading-relaxed text-amber-900">{request.latest_notification}</p>
              {request.latest_update_at && <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">Updated {new Date(request.latest_update_at).toLocaleString()}</p>}
            </section>
          )}
          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h5 className="flex items-center gap-2 text-sm font-black text-gray-900"><ClipboardList size={16} className="text-red-700" /> Request summary</h5>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${['Confirmed','Approved'].includes(status) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{status}</span>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Requested by">{request.requestor}</Detail>
              <Detail label="Requesting office">{request.department || officeName}</Detail>
              <Detail label="Requested resource">{request.asset_name || (isVehicle ? 'Vehicle assignment pending' : request.booking_type)}</Detail>
              <Detail label="Submitted">{submittedAt}</Detail>
              <Detail label="Date"><span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {formatDate(request.reservation_date)}</span></Detail>
              <Detail label={isVehicle ? 'Departure and arrival' : 'Start and end time'}>{request.start_time?.slice(0, 5) || 'Not provided'}{request.end_time ? ` – ${request.end_time.slice(0, 5)}` : ''}</Detail>
            </dl>
          </section>

          {isVehicle ? (
            <>
              <section className="rounded-xl border border-gray-200 p-4">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-black text-gray-900"><MapPin size={16} className="text-red-700" /> Travel details</h5>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Detail label="Nature and purpose of travel" wide>{request.purpose}</Detail>
                  <Detail label="Destination">{request.destination}</Detail>
                  <Detail label="Service type">{request.trip_type}</Detail>
                  <Detail label="Passenger count">{request.passenger_count}</Detail>
                  <Detail label="Official passengers" wide>{passengers.length ? passengers.join('\n') : 'Not provided'}</Detail>
                </dl>
              </section>
              <section className="rounded-xl border border-gray-200 p-4">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-black text-gray-900"><Users size={16} className="text-red-700" /> Submitted names and positions</h5>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Person label="Prepared / requested by" name={request.prepared_by_name} position={request.prepared_by_position} />
                  <Person label="Recommending approval" name={request.recommending_approval_name} position={request.recommending_approval_position} />
                </dl>
              </section>
              <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-black text-gray-900"><Car size={16} className="text-red-700" /> GSO assignment</h5>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Detail label="Vehicle">{request.vehicle_to_be_used ? `${request.vehicle_to_be_used}${request.plate_number ? ` — ${request.plate_number}` : ''}` : 'To be assigned by GSO'}</Detail>
                  <Detail label="Driver">{request.designated_driver ? `${request.designated_driver}${request.license_number ? ` — ${request.license_number}` : ''}` : 'To be assigned by GSO'}</Detail>
                </dl>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-xl border border-gray-200 p-4">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-black text-gray-900"><Users size={16} className="text-red-700" /> Event details</h5>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Detail label="Purpose" wide>{purposes.length ? purposes.join(', ') : request.purpose}</Detail>
                  <Detail label="Participants" wide>{participants.length ? participants.join(', ') : 'Not provided'}</Detail>
                  <Detail label="Expected attendance">{request.expected_attendees}</Detail>
                  <Person label="Person in charge" name={details.personInChargeName} position={details.personInChargePosition} />
                  <Detail label="Additional requests" wide>{miscellaneous.length ? miscellaneous.join(', ') : 'None'}</Detail>
                  <Detail label="Remarks" wide>{details.remarks || 'None'}</Detail>
                </dl>
              </section>
              <section className="rounded-xl border border-gray-200 p-4">
                <h5 className="mb-4 text-sm font-black text-gray-900">Submitted names and positions</h5>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Person label="Requested by" name={details.requestedByName} position={details.requestedByPosition} />
                  <Person label="Reviewed by" name={details.reviewedByName} position={details.reviewedByPosition} />
                  <Person label="Approved by" name={details.approvedByName} position={details.approvedByPosition} />
                </dl>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
