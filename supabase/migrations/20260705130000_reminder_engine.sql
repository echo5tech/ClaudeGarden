-- Reminder engine correctness:
--   • per-user timezones (tasks were generated on UTC "today" for everyone)
--   • water cadence derived from plants.water_needs (was: daily for every
--     plant, disagreeing with waterIntervalDays in @garden/shared/tasks)
--   • lifecycle end via bed_plants.removed_at + a post-harvest grace period
--     (water tasks previously accumulated forever)
--   • sow reminders finally reach the DB pipeline (the enum and TS planner
--     supported them; the cron never emitted them)
--   • RLS performance pass: initplan-wrapped auth.uid() + missing indexes

-- ── profiles.timezone ─────────────────────────────────────────────────────────

alter table profiles add column timezone text not null default 'UTC';

-- profiles uses column-level select grants (see 20260705110000); expose the
-- new column.
grant select (timezone) on profiles to authenticated;

-- ── bed_plants.removed_at ─────────────────────────────────────────────────────

alter table bed_plants add column removed_at timestamptz;

-- ── generate_daily_tasks(): per-user local time + cadence + lifecycle ────────

create or replace function public.generate_daily_tasks() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Runs HOURLY. All inserts are idempotent via the unique constraint
  -- (bed_plant_id, task_type, due_date), so within a user's day only the
  -- first run after their local 06:00 inserts anything.

  -- Water: every N days from planted_date. N mirrors waterIntervalDays() in
  -- packages/shared/src/tasks (keep the two in sync). Skips removed plants
  -- and stops 14 days after the expected harvest date.
  insert into public.tasks (user_id, bed_plant_id, task_type, due_date)
  select g.user_id, bp.id, 'water'::public.task_type, u.local_today
  from public.bed_plants bp
  join public.plants p  on p.id = bp.plant_id
  join public.beds b    on b.id = bp.bed_id
  join public.gardens g on g.id = b.garden_id
  join lateral (
    select (now() at time zone pr.timezone)::date as local_today,
           extract(hour from (now() at time zone pr.timezone)) as local_hour
    from public.profiles pr
    where pr.user_id = g.user_id
  ) u on true
  where u.local_hour >= 6
    and bp.removed_at is null
    and bp.planted_date <= u.local_today
    and (u.local_today - bp.planted_date) % (
          case
            when p.water_needs is null then 2
            when p.water_needs ~* '(high|frequent|daily|moist|wet)' then 1
            when p.water_needs ~* '(low|drought|tolerant|occasional|infrequent|dry|xeric)' then 3
            else 2
          end
        ) = 0
    and (p.days_to_harvest is null
         or u.local_today <= bp.planted_date + p.days_to_harvest + 14)
  on conflict (bed_plant_id, task_type, due_date) do nothing;

  -- Harvest: once, at planted_date + days_to_harvest (today or upcoming).
  insert into public.tasks (user_id, bed_plant_id, task_type, due_date)
  select g.user_id, bp.id, 'harvest'::public.task_type,
         bp.planted_date + p.days_to_harvest
  from public.bed_plants bp
  join public.plants p  on p.id = bp.plant_id
  join public.beds b    on b.id = bp.bed_id
  join public.gardens g on g.id = b.garden_id
  join public.profiles pr on pr.user_id = g.user_id
  where p.days_to_harvest is not null
    and bp.removed_at is null
    and bp.planted_date + p.days_to_harvest
          >= (now() at time zone pr.timezone)::date
  on conflict (bed_plant_id, task_type, due_date) do nothing;

  -- Sow (indoor start): once, at last_frost − sow_weeks_before_frost weeks,
  -- for upcoming dates only.
  insert into public.tasks (user_id, bed_plant_id, task_type, due_date)
  select g.user_id, bp.id, 'sow'::public.task_type,
         pr.last_frost_date - (p.sow_weeks_before_frost * 7)
  from public.bed_plants bp
  join public.plants p  on p.id = bp.plant_id
  join public.beds b    on b.id = bp.bed_id
  join public.gardens g on g.id = b.garden_id
  join public.profiles pr on pr.user_id = g.user_id
  where p.sow_weeks_before_frost is not null
    and pr.last_frost_date is not null
    and bp.removed_at is null
    and pr.last_frost_date - (p.sow_weeks_before_frost * 7)
          >= (now() at time zone pr.timezone)::date
  on conflict (bed_plant_id, task_type, due_date) do nothing;
end;
$$;

-- Task generation and the push fan-out both go hourly; each checks users'
-- local clocks (generation gates on >= 06:00 local, send-push notifies the
-- 06:00–07:00 local window).
select cron.unschedule('generate-daily-tasks');
select cron.schedule(
  'generate-daily-tasks',
  '5 * * * *',
  $$select public.generate_daily_tasks();$$
);

select cron.unschedule('send-push-fanout');
select cron.schedule(
  'send-push-fanout',
  '20 * * * *',
  $$select public.invoke_edge_function('send-push');$$
);

-- ── RLS performance pass ─────────────────────────────────────────────────────
-- Bare auth.uid() re-evaluates per candidate row; (select auth.uid()) runs
-- once as an initplan (Supabase guidance). Recreate the original policies
-- from 20260523002658 and later with the wrapped form.

drop policy "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "gardens_select_visible" on gardens;
create policy "gardens_select_visible" on gardens
  for select to authenticated using (
    user_id = (select auth.uid())
    or visibility = 'public'
    or exists (
      select 1 from follows
      where follower_id = (select auth.uid()) and followee_id = gardens.user_id
    )
  );

drop policy "gardens_write_own" on gardens;
create policy "gardens_write_own" on gardens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "beds_select_via_garden" on beds;
create policy "beds_select_via_garden" on beds
  for select to authenticated using (
    exists (
      select 1 from gardens g
      where g.id = beds.garden_id
        and (
          g.user_id = (select auth.uid())
          or g.visibility = 'public'
          or exists (
            select 1 from follows
            where follower_id = (select auth.uid()) and followee_id = g.user_id
          )
        )
    )
  );

drop policy "beds_write_via_garden_owner" on beds;
create policy "beds_write_via_garden_owner" on beds
  for all to authenticated
  using (
    exists (select 1 from gardens g where g.id = beds.garden_id and g.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from gardens g where g.id = beds.garden_id and g.user_id = (select auth.uid()))
  );

drop policy "bed_plants_select_via_garden" on bed_plants;
create policy "bed_plants_select_via_garden" on bed_plants
  for select to authenticated using (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id
        and (
          g.user_id = (select auth.uid())
          or g.visibility = 'public'
          or exists (
            select 1 from follows
            where follower_id = (select auth.uid()) and followee_id = g.user_id
          )
        )
    )
  );

drop policy "bed_plants_write_via_garden_owner" on bed_plants;
create policy "bed_plants_write_via_garden_owner" on bed_plants
  for all to authenticated
  using (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id and g.user_id = (select auth.uid())
    )
  );

drop policy "tasks_own" on tasks;
create policy "tasks_own" on tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "posts_write_own" on posts;
create policy "posts_write_own" on posts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "follows_select_either_side" on follows;
create policy "follows_select_either_side" on follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

drop policy "follows_delete_as_follower" on follows;
create policy "follows_delete_as_follower" on follows
  for delete to authenticated using (follower_id = (select auth.uid()));

drop policy "device_tokens: own upsert" on device_tokens;
create policy "device_tokens: own upsert" on device_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "device_tokens: own select" on device_tokens;
create policy "device_tokens: own select" on device_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy "plant_photos_own" on plant_photos;
create policy "plant_photos_own" on plant_photos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "chat_sessions_own" on chat_sessions;
create policy "chat_sessions_own" on chat_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "chat_messages_own" on chat_messages;
create policy "chat_messages_own" on chat_messages
  for all to authenticated
  using (exists (
    select 1 from chat_sessions
    where id = chat_messages.session_id and user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from chat_sessions
    where id = chat_messages.session_id and user_id = (select auth.uid())
  ));

-- ── Missing indexes on RLS predicate / hot-path columns ──────────────────────

create index chat_messages_session_created_idx on chat_messages (session_id, created_at);
create index chat_sessions_user_id_idx on chat_sessions (user_id);
create index plant_photos_user_taken_idx on plant_photos (user_id, taken_at desc);
create index plant_photos_bed_plant_id_idx on plant_photos (bed_plant_id);
