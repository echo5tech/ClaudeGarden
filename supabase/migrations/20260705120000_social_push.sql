-- Social push fan-out: track which notifications have been pushed, and
-- invoke send-push in social mode every 10 minutes. (invoke_edge_function
-- appends its argument to the /functions/v1/ URL, so the query string
-- selects the mode; the body is always '{}'.)

alter table notifications add column pushed_at timestamptz;

create index notifications_unpushed_idx on notifications (created_at)
  where pushed_at is null;

select cron.schedule(
  'send-social-push',
  '*/10 * * * *',
  $$select public.invoke_edge_function('send-push?mode=social');$$
);
