-- Tickets enums
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM ('bug','wrong_diagnosis','feature','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'other',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'open',
  screenshot_url text,
  scan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_insert_own ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tickets_update_own ON public.tickets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY tickets_admin_select ON public.tickets
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY tickets_admin_update ON public.tickets
  FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tm_insert_own ON public.ticket_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND (
      EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.has_role(auth.uid(),'admin')
    )
  );
CREATE POLICY tm_select_own ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);

-- Public bucket for ticket screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-screenshots','ticket-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ticket_shots_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ticket-screenshots');
CREATE POLICY "ticket_shots_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ticket-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "ticket_shots_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ticket-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );