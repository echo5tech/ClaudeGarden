'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createFeedPost } from '@/app/social/actions';
import { Button } from '@/components/ui/button';

interface PostComposerProps {
  gardenId?: string;
  placeholder?: string;
}

export function PostComposer({ gardenId, placeholder }: PostComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const file = fileRef.current?.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Image must be under 10 MB.');
        }
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in.');

        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from('post-images').getPublicUrl(path);
        formData.set('imageUrl', publicUrl);
      }

      await createFeedPost(formData);
      formRef.current?.reset();
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mb-6">
      {gardenId && <input type="hidden" name="gardenId" value={gardenId} />}
      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        placeholder={placeholder ?? 'Share a tip, update, or question…'}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
        required
      />
      <div className="flex items-center gap-3 mt-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post'}
        </Button>
        <label className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors">
          📷 {fileName ?? 'Add photo'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {error && (
          <span className="text-xs text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
