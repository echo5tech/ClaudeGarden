'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NotificationsBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setUnread(null);
        return;
      }
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (!cancelled) setUnread(count ?? 0);
    }

    refresh();
    // Re-check when the tab regains focus — cheap and keeps the badge honest
    // without a realtime subscription.
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
    // Refetch on navigation so acting on a notification clears the badge.
  }, [pathname]);

  if (unread === null) return null;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent"
    >
      <span aria-hidden>🔔</span>
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-green-600 text-white text-[10px] leading-4 text-center font-medium"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
