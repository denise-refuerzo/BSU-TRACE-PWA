BEGIN;

-- More than one eligible signatory may serve the same office. The requester
-- chooses the appropriate person when completing a facility request.
DROP INDEX IF EXISTS public.account_access_office_recommender_unique;
DROP INDEX IF EXISTS public.account_access_office_approver_unique;
DROP INDEX IF EXISTS public.account_access_department_recommender_unique;
DROP INDEX IF EXISTS public.account_access_department_approver_unique;

INSERT INTO public.trace_schema_migrations(name)
VALUES ('006_multiple_signatories')
ON CONFLICT (name) DO NOTHING;

COMMIT;
