-- Events are entered as local wall-clock values by <input type="datetime-local">.
-- Keep the displayed hour stable instead of converting it through a timezone.
alter table public.events
  alter column start_date type timestamp without time zone
    using start_date at time zone 'UTC',
  alter column end_date type timestamp without time zone
    using end_date at time zone 'UTC';