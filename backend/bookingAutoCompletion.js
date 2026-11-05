const {lockSchedule} = require('./resourceScheduling');

const ACTIVE_STATUSES = ['Confirmed', 'Approved', 'Ongoing', 'Delayed', 'Rescheduled', 'Resource Reassigned'];
const PENDING_STATUSES = ['Reserved', 'Pending'];

const completion = {
  statuses: ACTIVE_STATUSES,
  nextStatus: 'Completed',
  due: `COALESCE(gm.end_time,vr.drop_off_time) IS NOT NULL
    AND b.reservation_date + COALESCE(gm.end_time,vr.drop_off_time) + INTERVAL '3 hours'
      <= timezone('Asia/Manila',now())`,
  message: booking => `The ${booking.booking_type === 'Vehicle' ? 'trip' : 'event'} “${booking.purpose}” has been automatically marked completed three hours after its scheduled end time.`
};

const expiration = {
  statuses: PENDING_STATUSES,
  nextStatus: 'Cancelled',
  due: `b.reservation_date < timezone('Asia/Manila',now())::date`,
  reason: 'The requested date passed before the booking was approved.',
  message: booking => `Your ${booking.booking_type === 'Vehicle' ? 'vehicle' : booking.booking_type === 'Room' ? 'multimedia room' : 'gymnasium'} request “${booking.purpose}” was automatically cancelled because its requested date passed without approval.`
};

async function processExpiredBookings(pool, sendEmail, broadcast, rule) {
  let processed = 0;
  for (;;) {
    const client = await pool.connect();
    let rows;
    try {
      await client.query('BEGIN');
      await lockSchedule(client);
      const due = await client.query(`SELECT b.booking_id,b.booking_type,b.purpose,b.status,
        to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date,
        COALESCE(gm.start_time,vr.pick_up_time) AS start_time,
        COALESCE(gm.end_time,vr.drop_off_time) AS end_time,
        u.uni_email AS requestor_email
        FROM public.bookings b JOIN public."User" u ON u.u_id=b.u_id
        LEFT JOIN public.gm_requirements gm USING(booking_id)
        LEFT JOIN public.vehicle_requirements vr USING(booking_id)
        WHERE b.status = ANY($1::text[]) AND ${rule.due}
        ORDER BY b.reservation_date,b.booking_id
        LIMIT 100 FOR UPDATE OF b SKIP LOCKED`, [rule.statuses]);
      rows = due.rows;
      for (const booking of rows) {
        const message = rule.message(booking);
        await client.query("UPDATE public.bookings SET status=$1,updated_at=timezone('Asia/Manila',now()) WHERE booking_id=$2", [rule.nextStatus,booking.booking_id]);
        await client.query(`INSERT INTO public.booking_status_updates
          (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,
           previous_start,new_start,previous_end,new_end)
          VALUES($1,$2,$3,$4,$5,$6,$6,$7,$7,$8,$8)`,
          [booking.booking_id,booking.status,rule.nextStatus,rule.reason || null,message,
            booking.reservation_date,booking.start_time,booking.end_time]);
        booking.notification = message;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (rows.length) {
      processed += rows.length;
      broadcast();
      for (const booking of rows) {
        if (!booking.requestor_email) continue;
        try {
          const result = await sendEmail(booking.requestor_email, {
            bookingType:booking.booking_type,purpose:booking.purpose,status:rule.nextStatus,
            date:booking.reservation_date,start:booking.start_time,end:booking.end_time,
            reason:rule.reason,message:booking.notification
          });
          if (result?.success === false) console.error(`Booking ${rule.nextStatus.toLowerCase()} email failed for booking ${booking.booking_id}.`);
        } catch (error) {
          console.error(`Booking ${rule.nextStatus.toLowerCase()} email failed for booking ${booking.booking_id}:`, error);
        }
      }
    }
    if (rows.length < 100) return processed;
  }
}

const completeExpiredBookings = (pool, sendEmail, broadcast = () => {}) => processExpiredBookings(pool, sendEmail, broadcast, completion);
const cancelExpiredPendingBookings = (pool, sendEmail, broadcast = () => {}) => processExpiredBookings(pool, sendEmail, broadcast, expiration);

module.exports = {completeExpiredBookings, cancelExpiredPendingBookings};
