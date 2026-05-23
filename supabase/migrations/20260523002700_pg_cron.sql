-- Daily task-generation job via pg_cron.
-- Supabase enables pg_cron on local and most paid plans; on free-tier hosted
-- you may need to flip it on in the dashboard before this runs in prod.

create extension if not exists pg_cron;

create or replace function generate_daily_tasks() returns void
language plpgsql security definer as $$
declare
  today date := current_date;
begin
  -- Water tasks: one per bed_plant per day. The unique constraint
  -- (bed_plant_id, task_type, due_date) makes this idempotent.
  insert into tasks (user_id, bed_plant_id, task_type, due_date)
  select g.user_id, bp.id, 'water'::task_type, today
  from bed_plants bp
  join beds b     on b.id = bp.bed_id
  join gardens g  on g.id = b.garden_id
  on conflict (bed_plant_id, task_type, due_date) do nothing;

  -- Harvest tasks: due on planted_date + days_to_harvest, when known.
  insert into tasks (user_id, bed_plant_id, task_type, due_date)
  select g.user_id, bp.id, 'harvest'::task_type,
         (bp.planted_date + (p.days_to_harvest || ' days')::interval)::date
  from bed_plants bp
  join plants p   on p.id = bp.plant_id
  join beds b     on b.id = bp.bed_id
  join gardens g  on g.id = b.garden_id
  where p.days_to_harvest is not null
  on conflict (bed_plant_id, task_type, due_date) do nothing;
end;
$$;

select cron.schedule(
  'generate-daily-tasks',
  '0 6 * * *',
  $$select public.generate_daily_tasks();$$
);
