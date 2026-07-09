alter table public.notifications
  add column if not exists reminder text not null default 'None';

comment on column public.notifications.reminder is 'Reminder display string (same shape as tasks.reminder), e.g. date/time/repeat or None';
