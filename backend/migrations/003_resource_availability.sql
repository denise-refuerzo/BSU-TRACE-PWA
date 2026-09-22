BEGIN;

ALTER TABLE public.asset_details
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

INSERT INTO public.trace_schema_migrations(name)
VALUES ('003_resource_availability')
ON CONFLICT (name) DO NOTHING;

COMMIT;
