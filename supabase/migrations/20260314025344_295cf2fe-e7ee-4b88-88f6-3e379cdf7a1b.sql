
-- Drop and recreate triggers to ensure they use the updated function
DROP TRIGGER IF EXISTS trg_waitlist_auto_fill_delete ON public.appointments;
DROP TRIGGER IF EXISTS trg_waitlist_auto_fill_update ON public.appointments;

CREATE TRIGGER trg_waitlist_auto_fill_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.waitlist_auto_fill();

CREATE TRIGGER trg_waitlist_auto_fill_update
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.waitlist_auto_fill();
