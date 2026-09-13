-- Required by the login and profile 2FA challenge lifecycle.
ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS two_fa_code_expires timestamp without time zone,
  ADD COLUMN IF NOT EXISTS two_fa_attempts integer NOT NULL DEFAULT 0;
