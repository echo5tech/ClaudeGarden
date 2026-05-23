-- Row-Level Security policies.
-- Authoring conventions:
--   • `using` controls visibility for SELECT/UPDATE/DELETE.
--   • `with check` controls the post-state for INSERT/UPDATE.
--   • Use separate policies per operation when the predicates differ.

alter table profiles    enable row level security;
alter table plants      enable row level security;
alter table gardens     enable row level security;
alter table beds        enable row level security;
alter table bed_plants  enable row level security;
alter table tasks       enable row level security;
alter table posts       enable row level security;
alter table follows     enable row level security;

-- profiles ----------------------------------------------------------------
create policy "profiles_select_authed" on profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on profiles
  for insert to authenticated with check (user_id = auth.uid());

create policy "profiles_update_self" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- plants (public reference data; writes are service-role only) -----------
create policy "plants_select_all" on plants
  for select to anon, authenticated using (true);

-- gardens -----------------------------------------------------------------
create policy "gardens_select_visible" on gardens
  for select to authenticated using (
    user_id = auth.uid()
    or visibility = 'public'
    or exists (
      select 1 from follows
      where follower_id = auth.uid() and followee_id = gardens.user_id
    )
  );

create policy "gardens_write_own" on gardens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- beds (visibility inherits from owning garden) ---------------------------
create policy "beds_select_via_garden" on beds
  for select to authenticated using (
    exists (
      select 1 from gardens g
      where g.id = beds.garden_id
        and (
          g.user_id = auth.uid()
          or g.visibility = 'public'
          or exists (
            select 1 from follows
            where follower_id = auth.uid() and followee_id = g.user_id
          )
        )
    )
  );

create policy "beds_write_via_garden_owner" on beds
  for all to authenticated
  using (
    exists (select 1 from gardens g where g.id = beds.garden_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from gardens g where g.id = beds.garden_id and g.user_id = auth.uid())
  );

-- bed_plants (visibility inherits from bed → garden) ----------------------
create policy "bed_plants_select_via_garden" on bed_plants
  for select to authenticated using (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id
        and (
          g.user_id = auth.uid()
          or g.visibility = 'public'
          or exists (
            select 1 from follows
            where follower_id = auth.uid() and followee_id = g.user_id
          )
        )
    )
  );

create policy "bed_plants_write_via_garden_owner" on bed_plants
  for all to authenticated
  using (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from beds b
      join gardens g on g.id = b.garden_id
      where b.id = bed_plants.bed_id and g.user_id = auth.uid()
    )
  );

-- tasks (private reminders) ----------------------------------------------
create policy "tasks_own" on tasks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- posts -------------------------------------------------------------------
create policy "posts_select_visible" on posts
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from follows
      where follower_id = auth.uid() and followee_id = posts.user_id
    )
    or exists (
      select 1 from gardens g where g.id = posts.garden_id and g.visibility = 'public'
    )
  );

create policy "posts_write_own" on posts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- follows -----------------------------------------------------------------
create policy "follows_select_either_side" on follows
  for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

create policy "follows_insert_as_follower" on follows
  for insert to authenticated with check (follower_id = auth.uid());

create policy "follows_delete_as_follower" on follows
  for delete to authenticated using (follower_id = auth.uid());
