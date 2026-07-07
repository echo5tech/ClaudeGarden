# Moderation runbook

Reports from the in-app "Report" buttons land in the `reports` table, which is
readable only with the service role (RLS has no client select policy). Review
them from the Supabase SQL editor (which runs as `postgres` and bypasses RLS).

Apple's UGC guideline (1.2) expects reports to be acted on within 24 hours —
check this queue at least daily while user testing is running.

## Review the queue

```sql
select r.id, r.reason, r.created_at,
       reporter.username as reporter,
       p.body  as post_body,  p.hidden_at  as post_hidden,
       c.body  as comment_body, c.hidden_at as comment_hidden,
       author.username as author, author.user_id as author_id
from reports r
join profiles reporter on reporter.user_id = r.reporter_id
left join posts p    on p.id = r.post_id
left join comments c on c.id = r.comment_id
left join profiles author
  on author.user_id = coalesce(p.user_id, c.user_id)
order by r.created_at desc;
```

## Take down content

Hidden content disappears for every client (including the author) via the
select policies; the row is preserved as evidence.

```sql
update posts    set hidden_at = now() where id = '<post-id>';
update comments set hidden_at = now() where id = '<comment-id>';
```

To restore after an appeal: `set hidden_at = null`.

## Sanction a user

```sql
-- Hide everything they ever posted
update posts    set hidden_at = now() where user_id = '<user-id>' and hidden_at is null;
update comments set hidden_at = now() where user_id = '<user-id>' and hidden_at is null;

-- Ban: delete the auth user (cascades through profiles into all content)
delete from auth.users where id = '<user-id>';
```

Banning by deletion is destructive; prefer hiding + a warning for first
offenses. (A `suspended_until` column on profiles is the natural next step if
repeat offenders appear.)

## Clear handled reports

```sql
delete from reports where id = '<report-id>';
-- or, after a sweep:
delete from reports where created_at < now() - interval '30 days';
```

## Abuse limits already in place

- 50 posts / 200 comments per user per day (DB triggers)
- 50 botanist messages per user per day (edge function)
- 10 MiB / image-only uploads (bucket config); users can only write their own
  storage folders
- Blocking severs follows both ways and hides content bidirectionally
