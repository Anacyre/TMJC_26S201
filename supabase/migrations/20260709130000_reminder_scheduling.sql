-- Reminder scheduling: schedulable timestamp + repeat cadence on both sources.
alter table public.notifications
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_repeat text not null default 'none';

alter table public.tasks
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_repeat text not null default 'none';

comment on column public.notifications.reminder_at is 'Next scheduled reminder fire time (UTC); null when disabled or one-off already fired';
comment on column public.notifications.reminder_repeat is 'none | daily | weekly | monthly | yearly';
comment on column public.tasks.reminder_at is 'Next scheduled reminder fire time (UTC); null when disabled, done, or one-off already fired';
comment on column public.tasks.reminder_repeat is 'none | daily | weekly | monthly | yearly';

create index if not exists notifications_reminder_at_idx on public.notifications (reminder_at) where reminder_at is not null;
create index if not exists tasks_reminder_at_idx on public.tasks (reminder_at) where reminder_at is not null;

-- Per-user delivery inbox. Rows are written only by the security-definer
-- dispatcher (no INSERT policy for clients); users may read/ack their own rows.
create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('task','notice')),
  source_id text not null,
  title text not null default '',
  body text not null default '',
  due_at timestamptz not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, due_at)
);

alter table public.reminder_events enable row level security;

drop policy if exists "reminder_events_select_own" on public.reminder_events;
create policy "reminder_events_select_own" on public.reminder_events
  for select using (auth.uid() = user_id);

drop policy if exists "reminder_events_update_own" on public.reminder_events;
create policy "reminder_events_update_own" on public.reminder_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists reminder_events_user_unseen_idx
  on public.reminder_events (user_id, seen_at, due_at);

-- Advance a repeating reminder to the next future occurrence; null for one-off.
create or replace function public.next_reminder_at(base timestamptz, repeat text)
returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  nxt timestamptz := base;
  step interval;
begin
  if base is null then return null; end if;
  step := case lower(coalesce(repeat, 'none'))
    when 'daily' then interval '1 day'
    when 'weekly' then interval '7 days'
    when 'monthly' then interval '1 month'
    when 'yearly' then interval '1 year'
    else null end;
  if step is null then return null; end if;
  while nxt <= now() loop
    nxt := nxt + step;
  end loop;
  return nxt;
end;
$$;

-- Fan due reminders into per-user reminder_events, then advance/clear the cursor.
create or replace function public.dispatch_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  inserted integer := 0;
  n integer := 0;
begin
  for r in
    select id, user_id, title, reminder_at, reminder_repeat
    from public.tasks
    where reminder_at is not null
      and reminder_at <= now()
      and coalesce(done, false) = false
  loop
    insert into public.reminder_events (user_id, source_type, source_id, title, body, due_at)
    values (r.user_id, 'task', r.id::text, coalesce(r.title, 'Task'), 'Task reminder', r.reminder_at)
    on conflict (user_id, source_type, source_id, due_at) do nothing;
    get diagnostics n = row_count;
    inserted := inserted + n;
    update public.tasks
      set reminder_at = public.next_reminder_at(r.reminder_at, r.reminder_repeat)
      where id = r.id;
  end loop;

  for r in
    select id, title, reminder_at, reminder_repeat
    from public.notifications
    where reminder_at is not null
      and reminder_at <= now()
  loop
    insert into public.reminder_events (user_id, source_type, source_id, title, body, due_at)
    select p.id, 'notice', r.id::text, coalesce(r.title, 'Notice'), 'Notice reminder', r.reminder_at
    from public.profiles p
    on conflict (user_id, source_type, source_id, due_at) do nothing;
    get diagnostics n = row_count;
    inserted := inserted + n;
    update public.notifications
      set reminder_at = public.next_reminder_at(r.reminder_at, r.reminder_repeat)
      where id = r.id;
  end loop;

  return inserted;
end;
$$;

revoke all on function public.dispatch_due_reminders() from public, anon, authenticated;

-- Run the dispatcher every minute.
select cron.unschedule('dispatch-due-reminders')
  where exists (select 1 from cron.job where jobname = 'dispatch-due-reminders');

select cron.schedule(
  'dispatch-due-reminders',
  '* * * * *',
  $$select public.dispatch_due_reminders();$$
);
