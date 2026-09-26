BEGIN;

ALTER TABLE public.initial_document
  ADD COLUMN IF NOT EXISTS lifecycle_state character varying(20) DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason character varying(500);

ALTER TABLE public.initial_document
  DROP CONSTRAINT IF EXISTS initial_document_lifecycle_state_check;

ALTER TABLE public.initial_document
  ADD CONSTRAINT initial_document_lifecycle_state_check
  CHECK (lifecycle_state IN ('active', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.document_collaborators (
  collaborator_id bigserial PRIMARY KEY,
  public_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  ini_id integer NOT NULL REFERENCES public.initial_document(ini_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."User"(u_id) ON DELETE CASCADE,
  added_by integer NOT NULL REFERENCES public."User"(u_id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT document_collaborators_document_user_unique UNIQUE (ini_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_collaborators_user_idx
  ON public.document_collaborators (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.document_user_archives (
  archive_id bigserial PRIMARY KEY,
  ini_id integer NOT NULL REFERENCES public.initial_document(ini_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public."User"(u_id) ON DELETE CASCADE,
  archived_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT document_user_archives_document_user_unique UNIQUE (ini_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_user_archives_user_idx
  ON public.document_user_archives (user_id, archived_at DESC);

CREATE TABLE IF NOT EXISTS public.document_activity_history (
  activity_id bigserial PRIMARY KEY,
  public_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  ini_id integer NOT NULL REFERENCES public.initial_document(ini_id) ON DELETE CASCADE,
  actor_user_id integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  activity_type character varying(80) NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS document_activity_history_document_idx
  ON public.document_activity_history (ini_id, created_at DESC);

INSERT INTO public.trace_schema_migrations(name)
VALUES ('009_document_collaboration')
ON CONFLICT (name) DO NOTHING;

COMMIT;
