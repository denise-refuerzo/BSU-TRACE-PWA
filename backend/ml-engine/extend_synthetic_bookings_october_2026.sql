-- Run manually in the Neon SQL Editor for the SYNTHETIC ML database.
-- Source snapshot: ML_database.sql; latest reservation: 2026-10-09.
-- Extends the simulated date range through 2026-10-31. Weekends remain empty,
-- matching the supplied history. This creates requests, not actual observations.
-- No schema changes, deletions, or modifications to existing bookings.
-- Rerunning this exact version skips its existing rows.
-- New data is for demonstration/development, NOT an independent model test set.
-- Expected with the supplied snapshot: 115 requests (62 Vehicle, 24 Gym, 29 Room),
-- plus 115 matching requirements. Nonempty dates: October 12 through October 30.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL DateStyle = 'ISO, YMD';

-- Use the application's scheduling lock; also protect against concurrent inserts.
SELECT pg_advisory_xact_lock(90412026);
LOCK TABLE public.bookings, public.vehicle_requirements, public.gm_requirements
    IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE purpose LIKE 'Synthetic %' AND reservation_date = DATE '2026-10-09'
    ) THEN
        RAISE EXCEPTION 'Expected synthetic source history through 2026-10-09 was not found. Check the selected database.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE reservation_date BETWEEN DATE '2026-10-10' AND DATE '2026-10-31'
          AND purpose NOT LIKE 'Synthetic October 2026 extension v1 | %'
    ) THEN
        RAISE EXCEPTION 'Other bookings already exist in October 10-31. Review them before extending this interval; nothing was inserted.';
    END IF;
END;
$guard$;

-- Deterministic resampling of whole historical weekdays, including zero-count
-- days. Counts and category mix vary naturally; no forecast output is used.
CREATE TEMP TABLE october_seed_plan ON COMMIT DROP AS
WITH target_days AS (
    SELECT DATE '2026-10-10' + i AS target_date
    FROM generate_series(0, 21) AS offsets(i)
    WHERE EXTRACT(ISODOW FROM DATE '2026-10-10' + i) <= 5
), source_days AS (
    SELECT DATE '2026-07-12' + i AS source_date
    FROM generate_series(0, 89) AS offsets(i)
), donor_days AS (
    SELECT t.target_date, donor.source_date
    FROM target_days t
    CROSS JOIN LATERAL (
        SELECT s.source_date
        FROM source_days s
        WHERE EXTRACT(ISODOW FROM s.source_date) = EXTRACT(ISODOW FROM t.target_date)
        ORDER BY md5('bsu-trace-oct2026-v1|' || t.target_date::text || '|' || s.source_date::text), s.source_date
        LIMIT 1
    ) donor
)
SELECT d.target_date, b.booking_id AS source_booking_id, b.booking_type,
       'Synthetic October 2026 extension v1 | target=' || d.target_date::text
           || ' | source=' || b.booking_id::text AS seed_purpose
FROM donor_days d
JOIN public.bookings b ON b.reservation_date = d.source_date
WHERE b.purpose LIKE 'Synthetic %';

DO $seed$
DECLARE
    item record;
    template public.bookings%ROWTYPE;
    new_booking_id integer;
    child_rows integer;
    inserted_rows integer := 0;
    simulated_created timestamp without time zone;
    execution_time timestamp without time zone := timezone('Asia/Manila', now());
BEGIN
    FOR item IN SELECT * FROM october_seed_plan ORDER BY target_date, source_booking_id LOOP
        IF EXISTS (SELECT 1 FROM public.bookings WHERE purpose = item.seed_purpose) THEN
            CONTINUE;
        END IF;
        SELECT * INTO STRICT template FROM public.bookings WHERE booking_id = item.source_booking_id;
        -- Shift the source submission lead time, but never invent a submission
        -- timestamp later than script execution for an already inserted request.
        simulated_created := LEAST(execution_time,
            COALESCE(template.created_at, template.reservation_date::timestamp - INTERVAL '7 days')
            + (item.target_date - template.reservation_date) * INTERVAL '1 day');

        INSERT INTO public.bookings
            (u_id, booking_type, department, reservation_date, purpose, created_at, status, updated_at)
        VALUES
            (template.u_id, template.booking_type, template.department, item.target_date,
             item.seed_purpose, simulated_created,
             CASE WHEN item.target_date >= execution_time::date THEN 'Pending' ELSE template.status END,
             simulated_created)
        RETURNING booking_id INTO new_booking_id;

        IF template.booking_type = 'Vehicle' THEN
            INSERT INTO public.vehicle_requirements
                (asd_id, sv_id, booking_id, destination, passenger_count, pick_up_time, drop_off_time)
            SELECT asd_id, sv_id, new_booking_id, destination, passenger_count, pick_up_time, drop_off_time
            FROM public.vehicle_requirements WHERE booking_id = template.booking_id;
        ELSIF template.booking_type IN ('Gym', 'Gymnasium', 'Room') THEN
            INSERT INTO public.gm_requirements
                (asd_id, booking_id, start_time, end_time, expected_attendees, request_details)
            SELECT asd_id, new_booking_id, start_time, end_time, expected_attendees,
                   jsonb_build_object('synthetic', true, 'seed_batch', 'october-2026-v1')
            FROM public.gm_requirements WHERE booking_id = template.booking_id;
        ELSE
            RAISE EXCEPTION 'Unsupported source booking type: %', template.booking_type;
        END IF;
        GET DIAGNOSTICS child_rows = ROW_COUNT;
        IF child_rows <> 1 THEN
            RAISE EXCEPTION 'Source booking % has % requirement rows; expected exactly one. Transaction aborted.',
                template.booking_id, child_rows;
        END IF;
        inserted_rows := inserted_rows + 1;
    END LOOP;
    RAISE NOTICE 'Inserted % synthetic booking requests and matching requirements.', inserted_rows;
END;
$seed$;

-- Batch verification. An immediate rerun inserts zero new rows and shows the
-- same batch totals. Generated UUIDs and integer IDs use existing defaults.
SELECT booking_type, COUNT(*) AS synthetic_requests,
       MIN(reservation_date) AS first_reservation,
       MAX(reservation_date) AS last_reservation,
       COUNT(*) FILTER (WHERE reservation_date >= timezone('Asia/Manila', now())::date) AS current_or_future_requests
FROM public.bookings
WHERE purpose LIKE 'Synthetic October 2026 extension v1 | %'
GROUP BY booking_type
ORDER BY booking_type;

COMMIT;
