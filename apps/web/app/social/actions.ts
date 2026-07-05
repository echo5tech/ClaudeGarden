'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');
  return { supabase, user };
}

export async function likePost(postId: string, path: string) {
  const { supabase, user } = await requireUser();
  await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
  revalidatePath(path);
}

export async function unlikePost(postId: string, path: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from('likes')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);
  revalidatePath(path);
}

export async function addComment(formData: FormData) {
  const postId = formData.get('postId') as string;
  const path = (formData.get('path') as string | null) ?? `/posts/${postId}`;
  const body = ((formData.get('body') as string | null) ?? '').trim();
  if (!body || !postId) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, body });
  revalidatePath(path);
}

export async function deleteComment(formData: FormData) {
  const commentId = formData.get('commentId') as string;
  const path = (formData.get('path') as string | null) ?? '/';
  if (!commentId) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);
  revalidatePath(path);
}

export async function createFeedPost(formData: FormData) {
  const body = ((formData.get('body') as string | null) ?? '').trim();
  const gardenId = (formData.get('gardenId') as string | null) || null;
  const imageUrl = (formData.get('imageUrl') as string | null) || null;
  if (!body) return;

  const { supabase, user } = await requireUser();
  await supabase.from('posts').insert({
    user_id: user.id,
    garden_id: gardenId,
    body,
    image_url: imageUrl,
  });
  revalidatePath(gardenId ? `/explore/${gardenId}` : '/');
}

export async function reportContent(formData: FormData) {
  const postId = (formData.get('postId') as string | null) || null;
  const commentId = (formData.get('commentId') as string | null) || null;
  const reason = ((formData.get('reason') as string | null) ?? '').trim();
  if ((!postId && !commentId) || !reason) return;

  const { supabase, user } = await requireUser();
  await supabase.from('reports').insert({
    reporter_id: user.id,
    post_id: postId,
    comment_id: commentId,
    reason,
  });
}

export async function blockUser(formData: FormData) {
  const blockedId = formData.get('blockedId') as string;
  const path = (formData.get('path') as string | null) ?? '/';
  if (!blockedId) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  revalidatePath(path);
}

export async function unblockUser(formData: FormData) {
  const blockedId = formData.get('blockedId') as string;
  const path = (formData.get('path') as string | null) ?? '/';
  if (!blockedId) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
  revalidatePath(path);
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  revalidatePath('/notifications');
}
