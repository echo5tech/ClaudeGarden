'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="max-w-md text-sm text-zinc-500">
        An unexpected error occurred while loading this page. Your data is safe —
        try again, or head back to the catalog.
        {error.digest && (
          <span className="mt-1 block font-mono text-xs">Error ID: {error.digest}</span>
        )}
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </main>
  )
}
