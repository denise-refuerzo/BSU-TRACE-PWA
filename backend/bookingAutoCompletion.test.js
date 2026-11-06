const test = require('node:test');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const {completeExpiredBookings,cancelExpiredPendingBookings} = require('./bookingAutoCompletion');

test('completes overdue active bookings once, using the current end time', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public."User" (u_id integer PRIMARY KEY, uni_email text);
      CREATE TABLE public.bookings (
        booking_id integer PRIMARY KEY, u_id integer, booking_type text, purpose text,
        status text, reservation_date date, updated_at timestamp
      );
      CREATE TABLE public.gm_requirements (booking_id integer, start_time time, end_time time);
      CREATE TABLE public.vehicle_requirements (booking_id integer, pick_up_time time, drop_off_time time);
      CREATE TABLE public.booking_status_updates (
        booking_id integer, previous_status text, new_status text, reason text, notification_message text,
        previous_date date, new_date date, previous_start time, new_start time,
        previous_end time, new_end time
      );
      INSERT INTO public."User" VALUES (1,'requester@example.edu');
      INSERT INTO public.bookings
        SELECT id,1,CASE WHEN id=3 THEN 'Vehicle' WHEN id=2 THEN 'Gymnasium' ELSE 'Room' END,
          'Booking ' || id,
          CASE id WHEN 1 THEN 'Approved' WHEN 2 THEN 'Rescheduled' WHEN 3 THEN 'Delayed'
            WHEN 4 THEN 'Cancelled' WHEN 5 THEN 'Pending' WHEN 6 THEN 'Completed' ELSE 'Approved' END,
          timezone('Asia/Manila',now())::date + CASE WHEN id=7 THEN 1 ELSE -1 END,NULL
        FROM generate_series(1,7) id;
      INSERT INTO public.gm_requirements
        SELECT id,'09:00','12:00' FROM generate_series(1,2) id;
      INSERT INTO public.gm_requirements
        SELECT id,'09:00','12:00' FROM generate_series(4,7) id;
      INSERT INTO public.vehicle_requirements VALUES (3,'09:00','12:00');
      INSERT INTO public.bookings
        SELECT id,1,'Room','Boundary ' || id,'Approved',
          (timezone('Asia/Manila',now()) - INTERVAL '3 hours' +
            CASE WHEN id=8 THEN INTERVAL '-1 minute' ELSE INTERVAL '1 minute' END)::date,NULL
        FROM generate_series(8,9) id;
      INSERT INTO public.gm_requirements
        SELECT id,'00:00',
          (timezone('Asia/Manila',now()) - INTERVAL '3 hours' +
            CASE WHEN id=8 THEN INTERVAL '-1 minute' ELSE INTERVAL '1 minute' END)::time
        FROM generate_series(8,9) id;
      INSERT INTO public.bookings VALUES
        (10,1,'Gymnasium','Today pending','Pending',timezone('Asia/Manila',now())::date,NULL),
        (11,1,'Vehicle','Future pending','Reserved',timezone('Asia/Manila',now())::date + 1,NULL);
    `);
    const pool = {connect: async () => ({query: (...args) => db.query(...args), release() {}})};
    const emails = [];
    let broadcasts = 0;
    const run = () => completeExpiredBookings(pool, async (...args) => {emails.push(args); return {success:true};}, () => {broadcasts++;});
    assert.equal(await run(), 4);
    assert.equal(await run(), 0);
    const result = await db.query('SELECT booking_id,status FROM public.bookings ORDER BY booking_id');
    assert.deepEqual(result.rows.map(row=>row.status),['Completed','Completed','Completed','Cancelled','Pending','Completed','Approved','Completed','Approved','Pending','Reserved']);
    const updates = await db.query("SELECT booking_id,previous_status,new_status FROM public.booking_status_updates ORDER BY booking_id");
    assert.deepEqual(updates.rows.map(row=>row.previous_status),['Approved','Rescheduled','Delayed','Approved']);
    assert.ok(updates.rows.every(row=>row.new_status==='Completed'));
    assert.equal(emails.length,4);
    assert.equal(broadcasts,1);
  } finally {
    await db.close();
  }
});

test('cancels unapproved requests after their start time, including today', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public."User" (u_id integer PRIMARY KEY, uni_email text);
      CREATE TABLE public.bookings (booking_id integer PRIMARY KEY,u_id integer,booking_type text,purpose text,status text,reservation_date date,updated_at timestamp);
      CREATE TABLE public.gm_requirements (booking_id integer,start_time time,end_time time);
      CREATE TABLE public.vehicle_requirements (booking_id integer,pick_up_time time,drop_off_time time);
      CREATE TABLE public.booking_status_updates (booking_id integer,previous_status text,new_status text,reason text,notification_message text,previous_date date,new_date date,previous_start time,new_start time,previous_end time,new_end time);
      INSERT INTO public."User" VALUES(1,'requester@example.edu');
      INSERT INTO public.bookings VALUES
        (1,1,'Room','Past room','Pending',timezone('Asia/Manila',now())::date - 1,NULL),
        (2,1,'Vehicle','Past vehicle','Reserved',timezone('Asia/Manila',now())::date - 1,NULL),
        (3,1,'Gymnasium','Today gym','Pending',timezone('Asia/Manila',now())::date,NULL),
        (4,1,'Vehicle','Approved trip','Approved',timezone('Asia/Manila',now())::date - 1,NULL),
        (5,1,'Room','Already cancelled','Cancelled',timezone('Asia/Manila',now())::date - 1,NULL),
        (6,1,'Room','Started today','Pending',timezone('Asia/Manila',now())::date,NULL);
      INSERT INTO public.gm_requirements VALUES
        (1,'09:00','11:00'),(3,'23:59','23:59'),(5,'09:00','11:00'),(6,'00:00','01:00');
      INSERT INTO public.vehicle_requirements VALUES (2,'09:00','11:00'),(4,'09:00','11:00');
    `);
    const pool = {connect: async () => ({query: (...args) => db.query(...args), release() {}})};
    const emails = [];
    const run = () => cancelExpiredPendingBookings(pool, async (...args) => {emails.push(args);return {success:true};});
    assert.equal(await run(),3);
    assert.equal(await run(),0);
    const statuses = await db.query('SELECT status FROM public.bookings ORDER BY booking_id');
    assert.deepEqual(statuses.rows.map(row=>row.status),['Cancelled','Cancelled','Pending','Approved','Cancelled','Cancelled']);
    const updates = await db.query('SELECT previous_status,new_status,reason FROM public.booking_status_updates ORDER BY booking_id');
    assert.deepEqual(updates.rows.map(row=>row.previous_status),['Pending','Reserved','Pending']);
    assert.ok(updates.rows.every(row=>row.new_status==='Cancelled' && /start time passed/.test(row.reason)));
    assert.deepEqual(emails.map(email=>email[1].status),['Cancelled','Cancelled','Cancelled']);
  } finally {
    await db.close();
  }
});
