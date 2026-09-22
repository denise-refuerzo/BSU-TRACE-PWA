BEGIN;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public."User" SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public."User" ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public."User" ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_public_id_unique ON public."User" (public_id);

ALTER TABLE public.initial_document
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.initial_document SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.initial_document ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.initial_document ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS initial_document_public_id_unique ON public.initial_document (public_id);

ALTER TABLE public.processed_document
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.processed_document SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.processed_document ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.processed_document ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS processed_document_public_id_unique ON public.processed_document (public_id);

ALTER TABLE public.office_action_history
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.office_action_history SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.office_action_history ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.office_action_history ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS office_action_history_public_id_unique ON public.office_action_history (public_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.bookings SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.bookings ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bookings ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_id_unique ON public.bookings (public_id);

ALTER TABLE public.booking_checklists
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.booking_checklists SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.booking_checklists ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.booking_checklists ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS booking_checklists_public_id_unique ON public.booking_checklists (public_id);

ALTER TABLE public.equipment_ledgers
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.equipment_ledgers SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.equipment_ledgers ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.equipment_ledgers ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS equipment_ledgers_public_id_unique ON public.equipment_ledgers (public_id);

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.chat_rooms SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.chat_rooms ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chat_rooms ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_public_id_unique ON public.chat_rooms (public_id);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS public_id uuid;
UPDATE public.chat_messages SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.chat_messages ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chat_messages ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_public_id_unique ON public.chat_messages (public_id);

INSERT INTO public.trace_schema_migrations (name)
VALUES ('001_public_ids')
ON CONFLICT (name) DO NOTHING;

COMMIT;
