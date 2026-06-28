DROP POLICY IF EXISTS feedback_threads_delete ON public.feedback_threads;
CREATE POLICY feedback_threads_delete ON public.feedback_threads
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_test_maintainer()
  );

DROP POLICY IF EXISTS feedback_messages_delete ON public.feedback_messages;
CREATE POLICY feedback_messages_delete ON public.feedback_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.feedback_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid() OR public.is_test_maintainer())
    )
  );
