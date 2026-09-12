// All booking/confirmation writers take this lock inside their transaction.
// It serializes availability checks with confirmations, avoiding double bookings.
const lockSchedule = client => client.query('SELECT pg_advisory_xact_lock(90412026)');
const fail = message => Object.assign(new Error(message), {status: 409});
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
function validateWindow(date, start, end) {
  if (!validDate(date) || !validTime(start) || !validTime(end) || start >= end) throw fail('Choose a valid date and an arrival/end time after departure/start time.');
}
async function availability(client, {date, start, end, type, assetName, exclude = 0, allowLegacy = false}) {
  validateWindow(date, start, end);
  if (type === 'Vehicle') {
    // Old confirmed bookings lack reliable individual assignments. Keep their time blocked
    // until GSO assigns them, rather than silently overbooking the fleet.
    const legacy = await client.query(`SELECT 1 FROM public.bookings b JOIN public.vehicle_requirements vr USING (booking_id)
      WHERE b.status = 'Confirmed' AND b.reservation_date = $1 AND b.booking_id <> $4
      AND (vr.assigned_vehicle_id IS NULL OR vr.assigned_driver_id IS NULL)
      AND (vr.pick_up_time >= vr.drop_off_time OR (vr.pick_up_time < $3::time AND vr.drop_off_time > $2::time)) LIMIT 1`, [date,start,end,exclude]);
    if (legacy.rows.length && !allowLegacy) return {available:false, vehicles:[], drivers:[], reason:'GSO must assign vehicles and drivers to existing confirmed requests in this time period.'};
    const vehicles = await client.query(`SELECT f.vehicle_id, f.vehicle_name, f.plate_number FROM public.fleet_vehicles f
      WHERE f.is_active AND NOT EXISTS (SELECT 1 FROM public.asset_blackouts ab WHERE ab.asd_id = f.asd_id AND (ab.vehicle_id IS NULL OR ab.vehicle_id = f.vehicle_id)
        AND ab.start_time < ($1::date + $3::time) AND ab.end_time > ($1::date + $2::time))
      AND NOT EXISTS (SELECT 1 FROM public.bookings b JOIN public.vehicle_requirements vr USING (booking_id)
        WHERE b.status = 'Confirmed' AND b.reservation_date = $1 AND b.booking_id <> $4 AND vr.assigned_vehicle_id = f.vehicle_id
        AND (vr.pick_up_time >= vr.drop_off_time OR (vr.pick_up_time < $3::time AND vr.drop_off_time > $2::time))) ORDER BY f.vehicle_name`,[date,start,end,exclude]);
    const drivers = await client.query(`SELECT d.driver_id, d.full_name FROM public.resource_drivers d WHERE d.is_active
      AND NOT EXISTS (SELECT 1 FROM public.bookings b JOIN public.vehicle_requirements vr USING (booking_id)
        WHERE b.status = 'Confirmed' AND b.reservation_date = $1 AND b.booking_id <> $4 AND vr.assigned_driver_id = d.driver_id
        AND (vr.pick_up_time >= vr.drop_off_time OR (vr.pick_up_time < $3::time AND vr.drop_off_time > $2::time))) ORDER BY d.full_name`,[date,start,end,exclude]);
    const available = !!vehicles.rows.length && !!drivers.rows.length;
    return {available, vehicles:vehicles.rows, drivers:drivers.rows, reason:available ? 'A vehicle and driver are available. Assignment is subject to GSO confirmation.' : 'No available vehicle and driver pair for this time. Please choose another time or contact GSO.'};
  }
  if (!['Room','Gymnasium'].includes(type)) throw fail('Invalid resource type.');
  const assets = await client.query(`SELECT asd_id FROM public.asset_details WHERE ast_id = $2 ORDER BY (asset_name = $1) DESC, asd_id LIMIT 1`,[assetName,type === 'Room' ? 1 : 2]);
  if (!assets.rows.length) throw fail('Facility not found.');
  const id = assets.rows[0].asd_id;
  const blocked = await client.query(`SELECT 1 FROM public.asset_blackouts WHERE asd_id = $1
    AND start_time < ($2::date + $4::time) AND end_time > ($2::date + $3::time)
    UNION ALL SELECT 1 FROM public.bookings b JOIN public.gm_requirements gm USING (booking_id)
    WHERE gm.asd_id = $1 AND b.reservation_date = $2 AND b.status = 'Confirmed' AND b.booking_id <> $5
    AND gm.start_time < $4::time AND gm.end_time > $3::time`,[id,date,start,end,exclude]);
  return {available:!blocked.rows.length, reason:blocked.rows.length ? 'This facility has a confirmed booking or maintenance closure during this time.' : 'This time is open for a request. Pending requests do not reserve the time.'};
}
async function assertConfirmable(client, bookingId) {
  const result = await client.query(`SELECT b.booking_type, to_char(b.reservation_date, 'YYYY-MM-DD') AS date,
    COALESCE(gm.start_time,vr.pick_up_time)::text AS start, COALESCE(gm.end_time,vr.drop_off_time)::text AS end,
    ad.asset_name, vr.assigned_vehicle_id, vr.assigned_driver_id
    FROM public.bookings b LEFT JOIN public.gm_requirements gm USING (booking_id)
    LEFT JOIN public.vehicle_requirements vr USING (booking_id)
    LEFT JOIN public.asset_details ad ON ad.asd_id = COALESCE(gm.asd_id,vr.asd_id) WHERE b.booking_id = $1`,[bookingId]);
  const b=result.rows[0]; if (!b) throw fail('Request not found.');
  const free=await availability(client,{...b,type:b.booking_type,assetName:b.asset_name,exclude:bookingId});
  if (!free.available) throw fail(free.reason);
  if (b.booking_type === 'Vehicle' && (!free.vehicles.some(v=>v.vehicle_id === b.assigned_vehicle_id) || !free.drivers.some(d=>d.driver_id === b.assigned_driver_id))) throw fail('GSO must assign an available vehicle and driver before confirmation.');
}
module.exports = {lockSchedule, availability, assertConfirmable, validateWindow};
