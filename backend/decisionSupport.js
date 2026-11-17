const {availability} = require('./resourceScheduling');

async function suggestFleetAssignment(db, booking) {
  const free = await availability(db, {
    date: booking.date, start: booking.start, end: booking.end,
    type: 'Vehicle', exclude: booking.booking_id, allowLegacy: true
  });
  if (!free.available) return {...free, suggestion: null};

  const vehicleIds = free.vehicles.map(vehicle => Number(vehicle.vehicle_id));
  const driverIds = free.drivers.map(driver => Number(driver.driver_id));
  let usage;
  try {
    usage = await db.query(`
    SELECT vr.assigned_vehicle_id AS vehicle_id, vr.assigned_driver_id AS driver_id,
      COUNT(*)::integer AS trips
    FROM public.vehicle_requirements vr
    JOIN public.bookings b USING (booking_id)
    WHERE b.reservation_date >= ($1::date - INTERVAL '30 days')
      AND b.reservation_date < $1::date
      AND b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned','Completed')
      AND (vr.assigned_vehicle_id = ANY($2::integer[]) OR vr.assigned_driver_id = ANY($3::integer[]))
    GROUP BY vr.assigned_vehicle_id, vr.assigned_driver_id
    `, [booking.date, vehicleIds, driverIds]);
  } catch (error) {
    // Historical analytics should never prevent GSO from assigning a free pair.
    return {...free, suggestion: null};
  }
  const vehicleTrips = new Map();
  const driverTrips = new Map();
  for (const row of usage.rows) {
    if (row.vehicle_id) vehicleTrips.set(Number(row.vehicle_id), (vehicleTrips.get(Number(row.vehicle_id)) || 0) + Number(row.trips));
    if (row.driver_id) driverTrips.set(Number(row.driver_id), (driverTrips.get(Number(row.driver_id)) || 0) + Number(row.trips));
  }
  const vehicle = [...free.vehicles].sort((a, b) =>
    (vehicleTrips.get(Number(a.vehicle_id)) || 0) - (vehicleTrips.get(Number(b.vehicle_id)) || 0)
      || String(a.vehicle_name).localeCompare(String(b.vehicle_name)))[0];
  const driver = [...free.drivers].sort((a, b) =>
    (driverTrips.get(Number(a.driver_id)) || 0) - (driverTrips.get(Number(b.driver_id)) || 0)
      || String(a.full_name).localeCompare(String(b.full_name)))[0];
  return {...free, suggestion: {
    vehicleId: Number(vehicle.vehicle_id), driverId: Number(driver.driver_id),
    vehicleName: vehicle.vehicle_name, driverName: driver.full_name,
    vehicleTrips: vehicleTrips.get(Number(vehicle.vehicle_id)) || 0,
    driverTrips: driverTrips.get(Number(driver.driver_id)) || 0
  }};
}

async function getOfficeSignals(db, officeIds) {
  if (!officeIds.length) return [];
  const result = await db.query(`
    WITH history AS (
      SELECT pd.current_office_id AS office_id,
        COUNT(*)::integer AS completed_stops,
        ROUND((AVG(EXTRACT(EPOCH FROM (pd.time_out - pd.time_in)) / 3600))::numeric, 1) AS avg_hours
      FROM public.processed_document pd
      WHERE pd.current_office_id = ANY($1::integer[])
        AND pd.time_in IS NOT NULL AND pd.time_out IS NOT NULL
        AND pd.time_out >= NOW() - INTERVAL '90 days'
      GROUP BY pd.current_office_id
    ), queue AS (
      SELECT pd.current_office_id AS office_id, COUNT(*)::integer AS open_stops
      FROM public.processed_document pd
      WHERE pd.current_office_id = ANY($1::integer[]) AND pd.time_out IS NULL
      GROUP BY pd.current_office_id
    )
    SELECT o.o_id AS office_id, o.office_name,
      COALESCE(h.completed_stops,0) AS completed_stops, h.avg_hours,
      COALESCE(q.open_stops,0) AS open_stops
    FROM public.offices o
    LEFT JOIN history h ON h.office_id=o.o_id
    LEFT JOIN queue q ON q.office_id=o.o_id
    WHERE o.o_id = ANY($1::integer[])
    ORDER BY o.office_name
  `, [officeIds]);
  return result.rows;
}

module.exports = {suggestFleetAssignment, getOfficeSignals};
