BEGIN;

ALTER TABLE public.account_access_assignments
  ADD COLUMN IF NOT EXISTS can_request_registration boolean DEFAULT false NOT NULL;

ALTER TABLE public.account_access_assignments
  DROP CONSTRAINT IF EXISTS account_access_has_permission_check;

ALTER TABLE public.account_access_assignments
  ADD CONSTRAINT account_access_has_permission_check CHECK (
    can_view_submissions OR can_recommend OR can_approve OR can_request_registration
  );

CREATE TABLE IF NOT EXISTS public.registration_links (
  link_id bigserial PRIMARY KEY,
  public_id uuid DEFAULT gen_random_uuid() NOT NULL,
  requested_by integer NOT NULL REFERENCES public."User"(u_id) ON DELETE RESTRICT,
  approved_by integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  account_type integer NOT NULL REFERENCES public.account(a_id) ON DELETE RESTRICT,
  office_id integer REFERENCES public.offices(o_id) ON DELETE RESTRICT,
  department_id integer REFERENCES public.department(d_id) ON DELETE RESTRICT,
  requested_max_registrations integer NOT NULL,
  requested_expires_at timestamp with time zone NOT NULL,
  max_registrations integer,
  registration_count integer DEFAULT 0 NOT NULL,
  expires_at timestamp with time zone,
  token_hash character(64),
  status character varying(20) DEFAULT 'pending' NOT NULL,
  request_note character varying(500),
  decision_note character varying(500),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_at timestamp with time zone,
  revoked_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT registration_links_public_id_unique UNIQUE (public_id),
  CONSTRAINT registration_links_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT registration_links_account_type_check CHECK (account_type IN (1, 2)),
  CONSTRAINT registration_links_scope_check CHECK (
    (account_type = 1 AND department_id IS NOT NULL AND office_id IS NULL)
    OR
    (account_type = 2 AND office_id IS NOT NULL AND department_id IS NULL)
  ),
  CONSTRAINT registration_links_requested_limit_check CHECK (requested_max_registrations BETWEEN 1 AND 100),
  CONSTRAINT registration_links_limit_check CHECK (max_registrations IS NULL OR max_registrations BETWEEN 1 AND 100),
  CONSTRAINT registration_links_usage_check CHECK (registration_count >= 0 AND (max_registrations IS NULL OR registration_count <= max_registrations)),
  CONSTRAINT registration_links_status_check CHECK (status IN ('pending', 'active', 'rejected', 'revoked', 'expired', 'exhausted')),
  CONSTRAINT registration_links_approval_state_check CHECK (
    (status = 'pending' AND approved_by IS NULL AND token_hash IS NULL AND max_registrations IS NULL AND expires_at IS NULL)
    OR
    (status = 'rejected' AND token_hash IS NULL)
    OR
    (status IN ('active', 'revoked', 'expired', 'exhausted') AND approved_by IS NOT NULL AND token_hash IS NOT NULL AND max_registrations IS NOT NULL AND expires_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS registration_links_requester_idx
  ON public.registration_links (requested_by, created_at DESC);

CREATE INDEX IF NOT EXISTS registration_links_status_idx
  ON public.registration_links (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.account_registration_origins (
  origin_id bigserial PRIMARY KEY,
  u_id integer NOT NULL UNIQUE REFERENCES public."User"(u_id) ON DELETE CASCADE,
  link_id bigint NOT NULL REFERENCES public.registration_links(link_id) ON DELETE RESTRICT,
  registered_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS account_registration_origins_link_idx
  ON public.account_registration_origins (link_id, registered_at DESC);

CREATE TABLE IF NOT EXISTS public.account_administration_audit (
  audit_id bigserial PRIMARY KEY,
  public_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  actor_user_id integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  target_user_id integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  registration_link_id bigint REFERENCES public.registration_links(link_id) ON DELETE SET NULL,
  action character varying(80) NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS account_administration_audit_target_idx
  ON public.account_administration_audit (target_user_id, created_at DESC);

INSERT INTO public.trace_schema_migrations(name)
VALUES ('008_registration_onboarding')
ON CONFLICT (name) DO NOTHING;

COMMIT;
