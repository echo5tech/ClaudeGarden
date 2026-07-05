import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/post-card';
import { markAllNotificationsRead } from '@/app/social/actions';
import { timeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Notifications — WeGarden',
  description: 'Follows, likes, and comments on your gardening posts.',
};

type NotificationRow = {
  id: string;
  type: 'follow' | 'like' | 'comment';
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    username: string | null;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

const VERB: Record<NotificationRow['type'], string> = {
  follow: 'started following you',
  like: 'liked your post',
  comment: 'commented on your post',
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?redirectTo=%2Fnotifications');

  const { data } = await supabase
    .from('notifications')
    .select(
      'id, type, post_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as unknown as NotificationRow[];
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing yet. When gardeners follow you or react to your posts, it shows up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const name = n.actor?.display_name ?? 'Someone';
            const body = (
              <span className="flex items-center gap-3">
                <Avatar url={n.actor?.avatar_url ?? null} name={name} size={32} />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{name}</span> {VERB[n.type]}
                  <span className="block text-xs text-zinc-400 mt-0.5">
                    {timeAgo(n.created_at)}
                  </span>
                </span>
                {!n.read_at && (
                  <span
                    aria-label="Unread"
                    className="w-2 h-2 rounded-full bg-green-600 shrink-0"
                  />
                )}
              </span>
            );
            const href = n.post_id
              ? `/posts/${n.post_id}`
              : n.actor?.username
                ? `/u/${n.actor.username}`
                : null;
            return (
              <li key={n.id}>
                {href ? (
                  <Link
                    href={href}
                    className={`block border rounded-lg px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors ${
                      n.read_at ? '' : 'border-green-600/40'
                    }`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="border rounded-lg px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
