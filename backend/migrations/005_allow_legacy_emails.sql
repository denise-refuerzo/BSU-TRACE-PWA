BEGIN;

-- Replace the earlier CHECK constraint so existing accounts with legacy email
-- addresses are not blocked when unrelated fields are updated during login.
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

INSERT INTO public.trace_schema_migrations(name)
VALUES ('005_allow_legacy_emails')
ON CONFLICT (name) DO NOTHING;

COMMIT;
