BEGIN;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS session_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone;

INSERT INTO public.trace_schema_migrations(name)
VALUES ('007_session_expiry')
ON CONFLICT (name) DO NOTHING;

COMMIT;
