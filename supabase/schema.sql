create extension if not exists "pgcrypto";

create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  color text not null check (color in ('blue', 'green', 'red', 'orange', 'purple', 'teal')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.task_lists(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 500),
  completed boolean not null default false,
  due_date date,
  end_date date,
  description text,
  priority text check (priority in ('low', 'medium', 'high')),
  recurrence text check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  recurrence_unit text check (recurrence_unit in ('day', 'week', 'month', 'year')),
  recurrence_weekdays smallint[] not null default '{}',
  recurrence_stop text not null default 'never' check (recurrence_stop in ('never', 'date', 'occurrences')),
  recurrence_end_date date,
  recurrence_occurrences integer check (recurrence_occurrences > 0),
  check (recurrence is null or due_date is not null),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 500),
  start_date timestamp without time zone not null,
  end_date timestamp without time zone not null,
  all_day boolean not null default false,
  description text,
  location text,
  check (end_date >= start_date)
);

create index if not exists task_lists_user_id_idx on public.task_lists(user_id);
create index if not exists calendars_user_id_idx on public.calendars(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_list_id_idx on public.tasks(list_id);
create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_calendar_id_idx on public.events(calendar_id);

alter table public.task_lists enable row level security;
alter table public.calendars enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;

create policy "Users can manage their task lists"
  on public.task_lists for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their calendars"
  on public.calendars for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their tasks"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.task_lists
      where task_lists.id = tasks.list_id
        and task_lists.user_id = (select auth.uid())
    )
  );

create policy "Users can manage their events"
  on public.events for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.calendars
      where calendars.id = events.calendar_id
        and calendars.user_id = (select auth.uid())
    )
  );

revoke all on public.task_lists, public.calendars, public.tasks, public.events from anon;
grant select, insert, update, delete on public.task_lists, public.calendars, public.tasks, public.events to authenticated;
