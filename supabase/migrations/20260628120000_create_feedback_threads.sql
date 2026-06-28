-- Maintainer inbox for private user feedback
CREATE OR REPLACE FUNCTION public.is_test_maintainer(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT lower(trim(COALESCE(display_name, name, ''))) LIKE 'test%'
      FROM profiles
      WHERE id = uid
    ),
    false
  );
$$;

CREATE TABLE IF NOT EXISTS public.feedback_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.feedback_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_threads_user_id_idx ON public.feedback_threads(user_id);
CREATE INDEX IF NOT EXISTS feedback_threads_status_idx ON public.feedback_threads(status);
CREATE INDEX IF NOT EXISTS feedback_threads_updated_at_idx ON public.feedback_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS feedback_messages_thread_id_idx ON public.feedback_messages(thread_id);

ALTER TABLE public.feedback_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_threads_select ON public.feedback_threads;
CREATE POLICY feedback_threads_select ON public.feedback_threads
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_test_maintainer()
  );

DROP POLICY IF EXISTS feedback_threads_insert ON public.feedback_threads;
CREATE POLICY feedback_threads_insert ON public.feedback_threads
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS feedback_threads_update ON public.feedback_threads;
CREATE POLICY feedback_threads_update ON public.feedback_threads
  FOR UPDATE USING (public.is_test_maintainer());

DROP POLICY IF EXISTS feedback_messages_select ON public.feedback_messages;
CREATE POLICY feedback_messages_select ON public.feedback_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.feedback_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid() OR public.is_test_maintainer())
    )
  );

DROP POLICY IF EXISTS feedback_messages_insert ON public.feedback_messages;
CREATE POLICY feedback_messages_insert ON public.feedback_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.feedback_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid() OR public.is_test_maintainer())
    )
  );
