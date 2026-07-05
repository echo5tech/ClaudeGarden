import { supabase } from '@/lib/supabase';

export type FeedPost = {
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
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type PostComment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null; display_name: string } | null;
};

const POST_SELECT =
  'id, body, image_url, created_at, user_id, profiles(username, display_name, avatar_url), gardens(id, name), likes(count), comments(count)';

type RawPostRow = Omit<FeedPost, 'likeCount' | 'commentCount' | 'likedByMe'> & {
  likes: { count: number }[];
  comments: { count: number }[];
};

export async function fetchFeed(
  userId: string,
  limit = 30,
): Promise<{ posts: FeedPost[]; error: string | null }> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { posts: [], error: error.message };

  const rows = (data ?? []) as unknown as RawPostRow[];
  if (rows.length === 0) return { posts: [], error: null };

  const { data: myLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in(
      'post_id',
      rows.map((r) => r.id),
    );
  const liked = new Set((myLikes ?? []).map((l) => l.post_id));

  return {
    posts: rows.map((r) => ({
      id: r.id,
      body: r.body,
      image_url: r.image_url,
      created_at: r.created_at,
      user_id: r.user_id,
      profiles: r.profiles,
      gardens: r.gardens,
      likeCount: r.likes?.[0]?.count ?? 0,
      commentCount: r.comments?.[0]?.count ?? 0,
      likedByMe: liked.has(r.id),
    })),
    error: null,
  };
}

export async function setLiked(userId: string, postId: string, liked: boolean) {
  if (liked) {
    return supabase.from('likes').insert({ user_id: userId, post_id: postId });
  }
  return supabase.from('likes').delete().eq('user_id', userId).eq('post_id', postId);
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, profiles(username, display_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100);
  return (data ?? []) as unknown as PostComment[];
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
