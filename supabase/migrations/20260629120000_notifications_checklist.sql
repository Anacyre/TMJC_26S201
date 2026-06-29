alter table public.notifications
  add column if not exists checklist jsonb not null default '[]'::jsonb;

comment on column public.notifications.checklist is 'Step-by-step items with optional per-step deadlines (same shape as tasks.checklist)';
