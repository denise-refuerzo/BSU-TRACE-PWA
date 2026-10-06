BEGIN;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
      'Reserved', 'Pending', 'Confirmed', 'Approved', 'Ongoing', 'Delayed',
      'Rescheduled', 'Resource Reassigned', 'Cancelled', 'Completed'
    )
  );

CREATE TABLE IF NOT EXISTS public.booking_status_updates (
  update_id bigserial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
  previous_status character varying(20) NOT NULL,
  new_status character varying(20) NOT NULL,
  reason text,
  notification_message text NOT NULL,
  previous_date date,
  new_date date,
  previous_start time,
  new_start time,
  previous_end time,
  new_end time,
  updated_by integer REFERENCES public."User"(u_id),
  created_at timestamp without time zone DEFAULT timezone('Asia/Manila', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_status_updates_booking_created_idx
  ON public.booking_status_updates (booking_id, created_at DESC);

INSERT INTO public.trace_schema_migrations(name)
VALUES ('002_booking_workflow')
ON CONFLICT (name) DO NOTHING;

COMMIT;
