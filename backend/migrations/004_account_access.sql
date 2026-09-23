BEGIN;

-- Keep legacy addresses usable while enforcing the university address format
-- for new accounts and explicit email changes only. A CHECK constraint cannot
-- be used here because PostgreSQL would re-check legacy addresses during
-- unrelated updates such as saving a login session token.
ALTER TABLE public."User"
  DROP CONSTRAINT IF EXISTS user_bsu_email_check;

CREATE OR REPLACE FUNCTION public.enforce_bsu_user_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.uni_email IS DISTINCT FROM OLD.uni_email THEN
    NEW.uni_email := lower(btrim(NEW.uni_email));
    IF NEW.uni_email !~ '^[a-z0-9._%+\-]+@g\.batstate-u\.edu\.ph$' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'user_bsu_email_check',
        MESSAGE = 'Use an official email ending in @g.batstate-u.edu.ph.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bsu_user_email_trigger ON public."User";
CREATE TRIGGER enforce_bsu_user_email_trigger
  BEFORE INSERT OR UPDATE OF uni_email ON public."User"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bsu_user_email();

CREATE UNIQUE INDEX IF NOT EXISTS user_uni_email_lower_unique
  ON public."User" (lower(btrim(uni_email)));

CREATE TABLE IF NOT EXISTS public.account_access_assignments (
  assignment_id bigserial PRIMARY KEY,
  u_id integer NOT NULL REFERENCES public."User"(u_id) ON DELETE CASCADE,
  scope_type character varying(20) NOT NULL CHECK (scope_type IN ('office', 'department')),
  office_id integer REFERENCES public.offices(o_id) ON DELETE CASCADE,
  department_id integer REFERENCES public.department(d_id) ON DELETE CASCADE,
  can_view_submissions boolean DEFAULT true NOT NULL,
  can_recommend boolean DEFAULT false NOT NULL,
  can_approve boolean DEFAULT false NOT NULL,
  position_title character varying(120),
  starts_on date,
  ends_on date,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp without time zone DEFAULT timezone('Asia/Manila', now()) NOT NULL,
  updated_at timestamp without time zone DEFAULT timezone('Asia/Manila', now()) NOT NULL,
  CONSTRAINT account_access_scope_target_check CHECK (
    (scope_type = 'office' AND office_id IS NOT NULL AND department_id IS NULL)
    OR
    (scope_type = 'department' AND department_id IS NOT NULL AND office_id IS NULL)
  ),
  CONSTRAINT account_access_date_order_check CHECK (
    ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on
  ),
  CONSTRAINT account_access_has_permission_check CHECK (
    can_view_submissions OR can_recommend OR can_approve
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS account_access_user_office_unique
  ON public.account_access_assignments (u_id, office_id)
  WHERE scope_type = 'office';

CREATE UNIQUE INDEX IF NOT EXISTS account_access_user_department_unique
  ON public.account_access_assignments (u_id, department_id)
  WHERE scope_type = 'department';

CREATE INDEX IF NOT EXISTS account_access_active_office_idx
  ON public.account_access_assignments (office_id, u_id)
  WHERE is_active AND scope_type = 'office';

CREATE INDEX IF NOT EXISTS account_access_active_department_idx
  ON public.account_access_assignments (department_id, u_id)
  WHERE is_active AND scope_type = 'department';

ALTER TABLE public.vehicle_requirements
  ADD COLUMN IF NOT EXISTS prepared_by_user_id integer REFERENCES public."User"(u_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recommending_approval_user_id integer REFERENCES public."User"(u_id) ON DELETE SET NULL;

INSERT INTO public.trace_schema_migrations(name)
VALUES ('004_account_access')
ON CONFLICT (name) DO NOTHING;

COMMIT;
