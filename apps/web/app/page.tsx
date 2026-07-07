import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PlantNow } from '@/components/plant-now';
import { PostCard } from '@/components/post-card';
import { PostComposer } from '@/components/post-composer';
import { POST_SELECT, decoratePosts } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'WeGarden',
  description:
    'What should I plant now? Plan beds, get daily reminders, and share your garden.',
};

const FEED_PAGE_SIZE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Landing />;
  }

  const { before } = await searchParams;

  // Home feed: everything the posts RLS lets this user see — their own posts,
  // followed gardeners, and posts attached to public gardens (discovery).
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  if (before) {
    query = query.lt('created_at', before);
  }
  const { data: rows } = await query;

  const page = (rows ?? []).slice(0, FEED_PAGE_SIZE);
  const hasMore = (rows ?? []).length > FEED_PAGE_SIZE;
  const posts = await decoratePosts(supabase, page, user.id);
  const oldest = posts[posts.length - 1]?.created_at;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Home</h1>

      <PlantNow userId={user.id} />

      <PostComposer placeholder="What's growing in your garden?" />

      {posts.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-sm text-zinc-500">
          <p className="mb-2">Your feed is empty.</p>
          <p>
            <Link href="/explore" className="underline underline-offset-4 hover:no-underline">
              Explore public gardens
            </Link>{' '}
            and follow gardeners to fill it up — or write your first post above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} path="/" />
          ))}
          {hasMore && oldest && (
            <div className="pt-2 text-center">
              <Link
                href={`/?before=${encodeURIComponent(oldest)}`}
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Older posts →
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Landing() {
  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight">WeGarden</h1>
      <p className="text-zinc-500 mt-2 mb-8 max-w-xl">
        Answer &ldquo;What should I plant now?&rdquo; — drag-and-drop bed designer,
        daily reminders on your phone, and a community of gardeners to learn from.
      </p>
      <div className="flex gap-3 mb-16">
        <Link
          href="/auth"
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>
        <Link
          href="/plants"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          Browse the plant catalog
        </Link>
      </div>
      <ul className="grid gap-6 sm:grid-cols-3 text-sm">
        <li>
          <h2 className="font-semibold mb-1">🌱 Plan</h2>
          <p className="text-zinc-500">
            Drag plants onto a to-scale bed with spacing conflicts flagged as you go.
          </p>
        </li>
        <li>
          <h2 className="font-semibold mb-1">⏰ Grow</h2>
          <p className="text-zinc-500">
            Water, sow, and harvest reminders tuned to your USDA zone and frost dates.
          </p>
        </li>
        <li>
          <h2 className="font-semibold mb-1">🧑‍🌾 Share</h2>
          <p className="text-zinc-500">
            Follow gardeners, swap tips, and post progress photos from your phone.
          </p>
        </li>
      </ul>
    </main>
  );
}
