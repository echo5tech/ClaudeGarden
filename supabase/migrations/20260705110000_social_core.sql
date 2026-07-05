-- Social core: comments, likes, notifications, blocks, reports, and richer
-- profiles (username / avatar / bio). Follows previously fed nothing; these
-- tables are what the home feed, post interactions, and safety layer consume.

-- ── profiles: public identity fields ─────────────────────────────────────────

alter table profiles
  add column username   text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  add column avatar_url text,
  add column bio        text check (char_length(bio) <= 500);

-- Backfill a stable placeholder handle for existing users; new rows get one
-- from the trigger below. Users can change it in Settings.
update profiles
set username = 'gardener_' || substr(md5(user_id::text), 1, 8)
where username is null;

create or replace function public.assign_default_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is null then
    new.username := 'gardener_' || substr(md5(new.user_id::text), 1, 8);
  end if;
  return new;
end;
$$;

create trigger profiles_default_username
  before insert on profiles
  for each row execute function public.assign_default_username();

-- profiles.zip is PII and the open select policy exposed it to every authed
-- user. No client reads it, so drop the table-wide grant and re-grant only
-- the non-sensitive columns. (New public profile columns must be added to
-- this grant list explicitly.)
revoke select on profiles from authenticated, anon;
grant select (user_id, display_name, hardiness_zone, last_frost_date,
              username, avatar_url, bio, created_at, updated_at)
  on profiles to authenticated;

-- ── blocks ───────────────────────────────────────────────────────────────────

create table blocks (
  blocker_id uuid not null references profiles(user_id) on delete cascade,
  blocked_id uuid not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on blocks (blocked_id);

alter table blocks enable row level security;

create policy "blocks_select_own" on blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks_insert_own" on blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks_delete_own" on blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- True when either side has blocked the other.
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- ── comments ─────────────────────────────────────────────────────────────────

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(user_id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_post_created_idx on comments (post_id, created_at);
create index comments_user_id_idx on comments (user_id);

alter table comments enable row level security;

-- Visible wherever the underlying post is visible (posts RLS applies inside
-- the subquery), unless either party blocked the other.
create policy "comments_select_via_post" on comments
  for select to authenticated
  using (
    exists (select 1 from posts p where p.id = comments.post_id)
    and not public.is_blocked_pair(comments.user_id, (select auth.uid()))
  );

create policy "comments_insert_own" on comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from posts p where p.id = comments.post_id)
  );

create policy "comments_delete_own" on comments
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── likes ────────────────────────────────────────────────────────────────────

create table likes (
  user_id    uuid not null references profiles(user_id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index likes_post_id_idx on likes (post_id);

alter table likes enable row level security;

create policy "likes_select_via_post" on likes
  for select to authenticated
  using (exists (select 1 from posts p where p.id = likes.post_id));

create policy "likes_insert_own" on likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from posts p where p.id = likes.post_id)
  );

create policy "likes_delete_own" on likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── notifications ────────────────────────────────────────────────────────────

create type notification_type as enum ('follow', 'like', 'comment');

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(user_id) on delete cascade,
  actor_id   uuid not null references profiles(user_id) on delete cascade,
  type       notification_type not null,
  post_id    uuid references posts(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

-- Rows are created by the security-definer triggers below; clients only read
-- their own and mark them read.
create policy "notifications_select_own" on notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own" on notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;

create trigger follows_notify
  after insert on follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

create trigger likes_notify
  after insert on likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on comments
  for each row execute function public.notify_on_comment();

-- ── reports (minimal moderation footing) ─────────────────────────────────────

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(user_id) on delete cascade,
  post_id     uuid references posts(id) on delete set null,
  comment_id  uuid references comments(id) on delete set null,
  reason      text not null check (char_length(reason) between 1 and 1000),
  created_at  timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

alter table reports enable row level security;

-- Insert-only for clients; reads are service-role (moderation tooling).
create policy "reports_insert_own" on reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- ── fold blocks into existing visibility ─────────────────────────────────────

drop policy "posts_select_visible" on posts;
create policy "posts_select_visible" on posts
  for select to authenticated using (
    (
      user_id = (select auth.uid())
      or exists (
        select 1 from follows
        where follower_id = (select auth.uid()) and followee_id = posts.user_id
      )
      or exists (
        select 1 from gardens g where g.id = posts.garden_id and g.visibility = 'public'
      )
    )
    and not public.is_blocked_pair(posts.user_id, (select auth.uid()))
  );

-- Blocking someone removes the follow edge in both directions and prevents
-- re-following.
drop policy "follows_insert_as_follower" on follows;
create policy "follows_insert_as_follower" on follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and not public.is_blocked_pair(followee_id, (select auth.uid()))
  );

create or replace function public.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_remove_follows
  after insert on blocks
  for each row execute function public.remove_follows_on_block();

-- ── avatars storage bucket policies ──────────────────────────────────────────
-- The bucket itself is declared in supabase/config.toml (public read).
-- Objects are keyed as <user_id>/<filename>.

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_select_all" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

-- ── post images live in a public bucket too ─────────────────────────────────
-- posts.image_url stores a full public URL; the bucket is declared in
-- config.toml. Objects keyed as <user_id>/<filename>.

create policy "post_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "post_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "post_images_select_all" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'post-images');
