-- GA readiness: in-app account deletion, content moderation flags, and
-- write-side abuse limits.

-- ── Account deletion ─────────────────────────────────────────────────────────
-- App Store guideline 5.1.1(v) requires in-app account deletion. Deleting the
-- auth.users row cascades through profiles into every owned table; storage
-- object rows are removed explicitly (their buckets key objects by user id).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from storage.objects where owner_id = uid::text;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ── Moderation flags ─────────────────────────────────────────────────────────
-- Reports need a takedown mechanism. hidden_at is set by moderation tooling
-- (service role — see docs/MODERATION.md); hidden content disappears for all
-- clients, including the author.

alter table posts add column hidden_at timestamptz;
alter table comments add column hidden_at timestamptz;

drop policy "posts_select_visible" on posts;
create policy "posts_select_visible" on posts
  for select to authenticated using (
    posts.hidden_at is null
    and (
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

drop policy "comments_select_via_post" on comments;
create policy "comments_select_via_post" on comments
  for select to authenticated
  using (
    comments.hidden_at is null
    and exists (select 1 from posts p where p.id = comments.post_id)
    and not public.is_blocked_pair(comments.user_id, (select auth.uid()))
  );

-- ── Write-side rate limits ───────────────────────────────────────────────────
-- Storage and the botanist are capped elsewhere; posts/comments were not.

create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.posts
    where user_id = new.user_id and created_at > now() - interval '1 day'
  ) >= 50 then
    raise exception 'Daily post limit reached — try again tomorrow.';
  end if;
  return new;
end;
$$;

create trigger posts_rate_limit
  before insert on posts
  for each row execute function public.enforce_post_rate_limit();

create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.comments
    where user_id = new.user_id and created_at > now() - interval '1 day'
  ) >= 200 then
    raise exception 'Daily comment limit reached — try again tomorrow.';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on comments
  for each row execute function public.enforce_comment_rate_limit();

-- ── Feed index ───────────────────────────────────────────────────────────────
-- The home feed orders all visible posts by recency; only the per-user index
-- existed.

create index posts_created_idx on posts (created_at desc);
