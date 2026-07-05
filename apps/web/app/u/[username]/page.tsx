import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar, PostCard } from '@/components/post-card';
import { POST_SELECT, decoratePosts } from '@/lib/posts';
import { followUser, unfollowUser } from '@/app/explore/actions';
import { blockUser, unblockUser } from '@/app/social/actions';
import { Button } from '@/components/ui/button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — WeGarden`,
    description: `Gardens and posts from @${username} on WeGarden.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirectTo=${encodeURIComponent(`/u/${username}`)}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, bio, hardiness_zone, created_at')
    .eq('username', username)
    .maybeSingle();
  if (!profile) notFound();

  const isOwn = profile.user_id === user.id;
  const path = `/u/${username}`;

  const [
    { count: followerCount },
    { count: followingCount },
    { data: followRow },
    { data: blockRow },
    { data: gardens },
    { data: postRows },
  ] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', profile.user_id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.user_id),
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followee_id', profile.user_id)
      .maybeSingle(),
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', profile.user_id)
      .maybeSingle(),
    supabase
      .from('gardens')
      .select('id, name, created_at, beds(count)')
      .eq('user_id', profile.user_id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false }),
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const posts = await decoratePosts(supabase, postRows ?? [], user.id);
  const isFollowing = !!followRow;
  const isBlocked = !!blockRow;
  const gardenList = (gardens ?? []) as unknown as Array<{
    id: string;
    name: string;
    beds: Array<{ count: number }>;
  }>;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto">
      <header className="flex items-start gap-4 mb-8">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
          <p className="text-zinc-500 text-sm">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>
          )}
          <p className="text-xs text-zinc-400 mt-2">
            {followerCount ?? 0} followers · {followingCount ?? 0} following
            {profile.hardiness_zone && ` · zone ${profile.hardiness_zone}`}
          </p>
        </div>
        {isOwn ? (
          <Link
            href="/settings"
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shrink-0"
          >
            Edit profile
          </Link>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {!isBlocked && (
              <form action={isFollowing ? unfollowUser : followUser}>
                <input type="hidden" name="followeeId" value={profile.user_id} />
                <input type="hidden" name="path" value={path} />
                <Button type="submit" variant={isFollowing ? 'outline' : 'default'} size="sm">
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              </form>
            )}
            <form action={isBlocked ? unblockUser : blockUser}>
              <input type="hidden" name="blockedId" value={profile.user_id} />
              <input type="hidden" name="path" value={path} />
              <button
                type="submit"
                className="text-xs text-zinc-400 hover:text-destructive transition-colors"
              >
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </form>
          </div>
        )}
      </header>

      {isBlocked ? (
        <p className="text-sm text-zinc-500">
          You blocked this gardener. Their posts and gardens are hidden.
        </p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">
              Public gardens{' '}
              <span className="text-zinc-400 font-normal text-sm">({gardenList.length})</span>
            </h2>
            {gardenList.length === 0 ? (
              <p className="text-sm text-zinc-500">No public gardens yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {gardenList.map((garden) => (
                  <li key={garden.id}>
                    <Link
                      href={`/explore/${garden.id}`}
                      className="block border rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <div className="font-medium text-sm">{garden.name}</div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {garden.beds?.[0]?.count ?? 0}{' '}
                        {(garden.beds?.[0]?.count ?? 0) === 1 ? 'bed' : 'beds'}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Posts</h2>
            {posts.length === 0 ? (
              <p className="text-sm text-zinc-500">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} path={path} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
