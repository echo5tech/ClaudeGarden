-- RLS visibility matrix. RLS is the app's entire authorization model, so the
-- core guarantees are pinned here: garden visibility, block symmetry, the zip
-- column grant, own-row tasks, hidden-content takedown, and notification
-- triggers. Runs via `supabase test db` (pg_prove).

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- ── Seed (as postgres; bypasses RLS) ─────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.dev');

insert into public.profiles (user_id, display_name, zip) values
  ('00000000-0000-0000-0000-00000000000a', 'Alice', '94103'),
  ('00000000-0000-0000-0000-00000000000b', 'Bob', null),
  ('00000000-0000-0000-0000-00000000000c', 'Carol', null);

insert into public.gardens (id, user_id, name, visibility) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alice public', 'public'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Alice private', 'private');

-- Bob follows Alice (fires the follow-notification trigger).
insert into public.follows (follower_id, followee_id) values
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');

insert into public.posts (id, user_id, garden_id, body) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'public-garden post'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', null, 'followers-only post');

-- A moderated (hidden) post on the public garden.
insert into public.posts (id, user_id, garden_id, body, hidden_at) values
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'taken down', now());

-- Bob comments on the public post (fires the comment-notification trigger).
insert into public.comments (id, post_id, user_id, body) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'nice tomatoes');

-- A private task for Alice.
insert into public.beds (id, garden_id, width_inches, height_inches) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 96, 48);
insert into public.plants (id, common_name, scientific_name) values
  ('50000000-0000-0000-0000-000000000001', 'Test Tomato', 'Solanum testum');
insert into public.bed_plants (id, bed_id, plant_id, x_inches, y_inches, planted_date) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 10, 10, current_date);
insert into public.tasks (user_id, bed_plant_id, task_type, due_date) values
  ('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001', 'water', current_date);

-- Carol blocks Alice.
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

-- ── As Bob (follows Alice) ───────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.gardens
   where user_id = '00000000-0000-0000-0000-00000000000a'),
  2,
  'follower sees both public and private gardens of the followee');

select is(
  (select count(*)::int from public.posts
   where user_id = '00000000-0000-0000-0000-00000000000a'),
  2,
  'follower sees public + followers-only posts, but not hidden ones');

select is(
  (select count(*)::int from public.tasks),
  0,
  'tasks are own-row only — another user''s tasks are invisible');

select throws_ok(
  $$select zip from public.profiles$$,
  '42501',
  null,
  'zip column is excluded from the authenticated select grant');

select lives_ok(
  $$select display_name, username from public.profiles$$,
  'granted profile columns remain selectable');

select is(
  (select count(*)::int from public.comments
   where post_id = '20000000-0000-0000-0000-000000000001'),
  1,
  'comments are visible where the underlying post is visible');

select throws_ok(
  $$insert into public.tasks (user_id, bed_plant_id, task_type, due_date)
    values ('00000000-0000-0000-0000-00000000000a',
            '60000000-0000-0000-0000-000000000001', 'water', current_date + 1)$$,
  '42501',
  null,
  'cannot insert tasks for another user');

-- ── As Carol (blocked pair with Alice, follows nobody) ───────────────────────

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.gardens
   where user_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'stranger sees only the public garden');

select is(
  (select count(*)::int from public.posts
   where user_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'blocking hides all of the blocked user''s posts');

select is(
  (select count(*)::int from public.comments
   where post_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'comments disappear when the underlying post is blocked from view');

select throws_ok(
  $$insert into public.follows (follower_id, followee_id)
    values ('00000000-0000-0000-0000-00000000000c',
            '00000000-0000-0000-0000-00000000000a')$$,
  '42501',
  null,
  'cannot follow across a block');

-- ── As Alice ─────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.tasks),
  1,
  'owner sees their own tasks');

select is(
  (select count(*)::int from public.notifications),
  2,
  'follow + comment triggers created notifications for the recipient');

select * from finish();

rollback;
