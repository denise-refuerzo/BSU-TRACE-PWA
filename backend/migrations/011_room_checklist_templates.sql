BEGIN;

ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS asd_id integer REFERENCES public.asset_details(asd_id);

CREATE INDEX IF NOT EXISTS checklist_templates_type_asset_idx
  ON public.checklist_templates(booking_type,asd_id);

INSERT INTO public.checklist_templates(booking_type,item_name,asd_id)
SELECT 'Room', t.item_name, a.asd_id
FROM public.asset_details a
CROSS JOIN public.checklist_templates t
WHERE a.ast_id=1 AND t.booking_type='Room' AND t.asd_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.checklist_templates existing
    WHERE existing.booking_type='Room' AND existing.asd_id=a.asd_id
      AND existing.item_name=t.item_name
  );

CREATE OR REPLACE FUNCTION public.initialize_room_checklist_templates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ast_id = 1 THEN
    INSERT INTO public.checklist_templates(booking_type,item_name,asd_id)
    SELECT 'Room',t.item_name,NEW.asd_id
    FROM public.checklist_templates t
    WHERE t.booking_type='Room' AND t.asd_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.checklist_templates existing
        WHERE existing.booking_type='Room' AND existing.asd_id=NEW.asd_id
          AND existing.item_name=t.item_name
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS initialize_room_checklist_templates ON public.asset_details;
CREATE TRIGGER initialize_room_checklist_templates
AFTER INSERT OR UPDATE OF ast_id ON public.asset_details
FOR EACH ROW EXECUTE FUNCTION public.initialize_room_checklist_templates();

INSERT INTO public.trace_schema_migrations(name)
VALUES ('011_room_checklist_templates')
ON CONFLICT (name) DO NOTHING;

COMMIT;
