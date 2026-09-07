alter table public.tasks
	add column if not exists recurrence_interval integer not null default 1,
	add column if not exists recurrence_unit text,
	add column if not exists recurrence_weekdays smallint[] not null default '{}',
	add column if not exists recurrence_stop text not null default 'never',
	add column if not exists recurrence_end_date date,
	add column if not exists recurrence_occurrences integer;

do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.tasks'::regclass
		  and conname = 'tasks_recurrence_interval_check'
	) then
		alter table public.tasks
			add constraint tasks_recurrence_interval_check
			check (recurrence_interval > 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.tasks'::regclass
		  and conname = 'tasks_recurrence_unit_check'
	) then
		alter table public.tasks
			add constraint tasks_recurrence_unit_check
			check (
				recurrence_unit is null
				or recurrence_unit in ('day', 'week', 'month', 'year')
			);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.tasks'::regclass
		  and conname = 'tasks_recurrence_stop_check'
	) then
		alter table public.tasks
			add constraint tasks_recurrence_stop_check
			check (recurrence_stop in ('never', 'date', 'occurrences'));
	end if;

	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.tasks'::regclass
		  and conname = 'tasks_recurrence_occurrences_check'
	) then
		alter table public.tasks
			add constraint tasks_recurrence_occurrences_check
			check (recurrence_occurrences is null or recurrence_occurrences > 0);
	end if;

	if not exists (
		select 1
		from pg_constraint
		where conrelid = 'public.tasks'::regclass
		  and conname = 'tasks_recurrence_due_date_check'
	) then
		alter table public.tasks
			add constraint tasks_recurrence_due_date_check
			check (recurrence is null or due_date is not null);
	end if;
end $$;
