'use client';

import { useOptimistic, useTransition } from 'react';
import { likePost, unlikePost } from '@/app/social/actions';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  /** Path revalidated after the toggle (the page the button lives on). */
  path: string;
}

export function LikeButton({ postId, initialLiked, initialCount, path }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (_current, next: { liked: boolean; count: number }) => next,
  );

  function toggle() {
    if (isPending) return;
    const next = {
      liked: !state.liked,
      count: state.count + (state.liked ? -1 : 1),
    };
    startTransition(async () => {
      setOptimistic(next);
      if (next.liked) {
        await likePost(postId, path);
      } else {
        await unlikePost(postId, path);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Unlike' : 'Like'}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        state.liked
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400'
      }`}
    >
      <span aria-hidden>{state.liked ? '♥' : '♡'}</span>
      {state.count > 0 && <span>{state.count}</span>}
    </button>
  );
}
