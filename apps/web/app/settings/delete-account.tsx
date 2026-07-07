'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function DeleteAccount() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <Card className="mt-6 border-destructive/40">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your account, gardens, posts, photos, and all other data.
          This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {confirming ? (
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete everything'}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        ) : (
          <div>
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Delete my account…
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
