import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedPost } from '@/components/post-card';

export const POST_SELECT =
  'id, body, image_url, created_at, user_id, profiles(username, display_name, avatar_url), gardens(id, name), likes(count), comments(count)';

interface RawPostRow {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string;
    avatar_url: string | null;
  } | null;
  gardens: { id: string; name: string } | null;
  likes: Array<{ count: number }>;
  comments: Array<{ count: number }>;
}

/**
 * Convert raw post rows (POST_SELECT shape) into FeedPost, resolving
 * liked-by-me in a single extra query.
 */
export async function decoratePosts(
  // Keep the client loosely typed: nested selects defeat the generated types.
  supabase: SupabaseClient,
  rows: unknown[],
  currentUserId: string,
): Promise<FeedPost[]> {
  const posts = (rows ?? []) as RawPostRow[];
  if (posts.length === 0) return [];

  const { data: myLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', currentUserId)
    .in(
      'post_id',
      posts.map((p) => p.id),
    );

  const likedIds = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));

  return posts.map((p) => ({
    id: p.id,
    body: p.body,
    image_url: p.image_url,
    created_at: p.created_at,
    user_id: p.user_id,
    profiles: p.profiles,
    gardens: p.gardens,
    likeCount: p.likes?.[0]?.count ?? 0,
    commentCount: p.comments?.[0]?.count ?? 0,
    likedByMe: likedIds.has(p.id),
  }));
}
