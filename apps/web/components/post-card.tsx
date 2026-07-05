import Image from 'next/image';
import Link from 'next/link';
import { LikeButton } from '@/components/like-button';
import { timeAgo } from '@/lib/format';

export interface FeedPost {
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
}

export function Avatar({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 inline-flex items-center justify-center font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PostCard({ post, path }: { post: FeedPost; path: string }) {
  const author = post.profiles;
  const authorName = author?.display_name ?? 'Unknown';
  const profileHref = author?.username ? `/u/${author.username}` : null;

  return (
    <article className="border rounded-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        {profileHref ? (
          <Link href={profileHref} className="flex items-center gap-2 hover:opacity-80">
            <Avatar url={author?.avatar_url ?? null} name={authorName} size={28} />
            <span className="font-medium">{authorName}</span>
            <span className="text-zinc-400 text-xs">@{author?.username}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Avatar url={null} name={authorName} size={28} />
            <span className="font-medium">{authorName}</span>
          </div>
        )}
        <span className="text-zinc-400 text-xs ml-auto">{timeAgo(post.created_at)}</span>
      </div>

      <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{post.body}</p>

      {post.image_url && (
        <div className="mt-3 relative w-full overflow-hidden rounded-lg" style={{ maxHeight: 480 }}>
          <Image
            src={post.image_url}
            alt=""
            width={800}
            height={600}
            className="w-full h-auto max-h-[480px] object-cover rounded-lg"
          />
        </div>
      )}

      {post.gardens && (
        <Link
          href={`/explore/${post.gardens.id}`}
          className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:opacity-80"
        >
          🌱 {post.gardens.name}
        </Link>
      )}

      <div className="flex items-center gap-4 mt-3">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByMe}
          initialCount={post.likeCount}
          path={path}
        />
        <Link
          href={`/posts/${post.id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          💬 {post.commentCount > 0 ? post.commentCount : ''}{' '}
          {post.commentCount === 1 ? 'comment' : 'comments'}
        </Link>
      </div>
    </article>
  );
}
