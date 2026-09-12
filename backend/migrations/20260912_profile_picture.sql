-- Run in Neon before deploying profile-picture uploads.
-- Keep existing values; new accounts continue to use NULL and display an initial.
BEGIN;
ALTER TABLE public."User" ALTER COLUMN profile_pic TYPE text;
COMMIT;
