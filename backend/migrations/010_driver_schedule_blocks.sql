BEGIN;

ALTER TABLE public.asset_blackouts
  ALTER COLUMN asd_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS driver_id integer REFERENCES public.resource_drivers(driver_id);

CREATE INDEX IF NOT EXISTS asset_blackouts_driver_window_idx
  ON public.asset_blackouts(driver_id,start_time,end_time)
  WHERE driver_id IS NOT NULL;

INSERT INTO public.trace_schema_migrations(name)
VALUES ('010_driver_schedule_blocks')
ON CONFLICT (name) DO NOTHING;

COMMIT;
