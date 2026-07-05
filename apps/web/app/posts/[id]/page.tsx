import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar, PostCard } from '@/components/post-card';
import { POST_SELECT, decoratePosts } from '@/lib/posts';
import { addComment, deleteComment, reportContent } from '@/app/social/actions';
import { timeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirectTo=${encodeURIComponent(`/posts/${id}`)}`);

  const { data: row } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (!row) notFound();

  const [post] = await decoratePosts(supabase, [row], user.id);

  const { data: commentRows } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, profiles(username, display_name, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })
    .limit(200);

  const comments = (commentRows ?? []) as unknown as CommentRow[];
  const path = `/posts/${id}`;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Home
        </Link>
      </div>

      <PostCard post={post} path={path} />

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-4">
          Comments{' '}
          <span className="text-zinc-400 font-normal text-sm">({comments.length})</span>
        </h2>

        <form action={addComment} className="mb-6">
          <input type="hidden" name="postId" value={id} />
          <input type="hidden" name="path" value={path} />
          <textarea
            name="body"
            rows={2}
            maxLength={2000}
            placeholder="Add a comment…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            required
          />
          <Button type="submit" size="sm" className="mt-2">
            Comment
          </Button>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">No comments yet. Say something kind!</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const name = comment.profiles?.display_name ?? 'Unknown';
              return (
                <li key={comment.id} className="flex gap-3 text-sm">
                  <Avatar url={comment.profiles?.avatar_url ?? null} name={name} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-0.5">
                      {comment.profiles?.username ? (
                        <Link
                          href={`/u/${comment.profiles.username}`}
                          className="font-medium hover:underline underline-offset-4"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="font-medium">{name}</span>
                      )}
                      <span className="text-zinc-400">{timeAgo(comment.created_at)}</span>
                      {comment.user_id === user.id && (
                        <form action={deleteComment} className="ml-auto">
                          <input type="hidden" name="commentId" value={comment.id} />
                          <input type="hidden" name="path" value={path} />
                          <button
                            type="submit"
                            className="text-zinc-400 hover:text-destructive transition-colors"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {post.user_id !== user.id && (
        <form action={reportContent} className="mt-10 border-t pt-4">
          <input type="hidden" name="postId" value={id} />
          <input type="hidden" name="reason" value="Reported from post page" />
          <button
            type="submit"
            className="text-xs text-zinc-400 hover:text-destructive transition-colors"
          >
            Report this post
          </button>
        </form>
      )}
    </main>
  );
}
