import React, { useEffect, useState } from 'react';
import { X, Car, User, Clock, AlertCircle } from 'lucide-react';
import { resourceApi, confirmResourceAction, resourceSuccess, resourceError } from '../resourceActions';
import { publicReference } from '../../../../utils/publicReference';

export default function VehicleAssignmentModal({ request, onClose, onSaved }) {
  // Read-only times defined by the requestor
  const start = request.start_time?.slice(0, 5) || '08:00';
  const end = request.end_time?.slice(0, 5) || '17:00';

  const [options, setOptions] = useState(null);
  const [vehicleId, setVehicleId] = useState(request.assigned_vehicle_id ? String(request.assigned_vehicle_id) : '');
  const [driverId, setDriverId] = useState(request.assigned_driver_id ? String(request.assigned_driver_id) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectClass = 'mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-medium focus:ring-1 focus:ring-red-800 outline-none bg-white';

  useEffect(() => {
    let cancelled = false;
    setError('');

    const formattedStart = start.length === 5 ? `${start}:00` : start;
    const formattedEnd = end.length === 5 ? `${end}:00` : end;

    const query = new URLSearchParams({
      start: formattedStart,
      end: formattedEnd
    });

    resourceApi(`assignments/${request.booking_id}/options?${query}`)
      .then(data => {
        if (cancelled) return;
        setOptions(data);

        // Retain selections if they still exist in available options
        if (data.vehicles?.length > 0 && !vehicleId) {
          if (request.assigned_vehicle_id && data.vehicles.some(v => v.vehicle_id === request.assigned_vehicle_id)) {
            setVehicleId(String(request.assigned_vehicle_id));
          }
        }
        if (data.drivers?.length > 0 && !driverId) {
          if (request.assigned_driver_id && data.drivers.some(d => d.driver_id === request.assigned_driver_id)) {
            setDriverId(String(request.assigned_driver_id));
          }
        }
      })
      .catch(e => {
        if (!cancelled) setError(e.message || 'Unable to check vehicle and driver availability.');
      });

    return () => { cancelled = true; };
  }, [request.booking_id, start, end]);

  async function save(e) {
    e.preventDefault();
    if (busy) return;

    if (!vehicleId || !driverId) {
      setError('Please select both a vehicle and an assigned driver.');
      return;
    }

    setBusy(true);
    try {
      const confirmed = await confirmResourceAction(
        'Confirm Assignment?',
        `Assign selected vehicle and driver for ${request.requestor || 'this request'} on ${request.reservation_date}?`
      );

      if (!confirmed) {
        setBusy(false);
        return;
      }

      const formattedStart = start.length === 5 ? `${start}:00` : start;
      const formattedEnd = end.length === 5 ? `${end}:00` : end;

      const result = await resourceApi(`assignments/${request.booking_id}`, 'PUT', {
        vehicleId: Number(vehicleId),
        driverId: Number(driverId),
        start: formattedStart,
        end: formattedEnd
      });

      await onSaved();
      onClose();
      await resourceSuccess(result.message || 'Assignment saved successfully.');
    } catch (e) {
      await resourceError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <form 
        role="dialog" 
        aria-modal="true" 
        aria-label="Assign Vehicle and Driver" 
        onSubmit={save} 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-lg space-y-4 text-left"
      >
        <header className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Car size={18} className="text-red-800" /> Assign Vehicle & Driver
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {publicReference('REQ', request.booking_id)} · {request.requestor || request.requestor_name}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* READ-ONLY REQUEST TIMEFRAME */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Travel Date</span>
            <span className="font-bold text-gray-900">{request.reservation_date || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
              <Clock size={12} /> Requested Time Window
            </span>
            <span className="font-bold text-gray-900 font-mono">{start} – {end}</span>
          </div>
        </div>

        <fieldset disabled={busy} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!options && !error && (
            <p className="text-xs text-gray-500 py-4 text-center animate-pulse">Checking fleet & driver availability…</p>
          )}

          {options && (
            <div className="space-y-3">
              <div className="text-xs rounded-xl bg-gray-50 border border-gray-200 p-3 text-gray-700 font-medium leading-relaxed">
                {options.reason}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Available Vehicle</label>
                <select 
                  required 
                  value={vehicleId} 
                  onChange={e => setVehicleId(e.target.value)} 
                  className={selectClass}
                >
                  <option value="">Choose an available vehicle</option>
                  {options.vehicles.map(v => (
                    <option key={v.vehicle_id} value={String(v.vehicle_id)}>
                      {v.vehicle_name} ({v.plate_number})
                    </option>
                  ))}
                </select>
                {options.vehicles.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">No vehicles available for this requested time window.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Available Driver</label>
                <select 
                  required 
                  value={driverId} 
                  onChange={e => setDriverId(e.target.value)} 
                  className={selectClass}
                >
                  <option value="">Choose an available driver</option>
                  {options.drivers.map(d => (
                    <option key={d.driver_id} value={String(d.driver_id)}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
                {options.drivers.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">No drivers available for this requested time window.</p>
                )}
              </div>
            </div>
          )}
        </fieldset>

        <footer className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button 
            disabled={busy} 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            disabled={busy || !vehicleId || !driverId || !options?.vehicles?.length || !options?.drivers?.length} 
            className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
          >
            {busy ? 'Saving...' : 'Save Assignment'}
          </button>
        </footer>
      </form>
    </div>
  );
}
