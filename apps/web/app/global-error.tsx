'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

// Catches errors thrown by the root layout itself, so it must render its own
// <html> and <body> and cannot rely on app styles being loaded.
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>Something went wrong</h2>
        <p style={{ margin: 0, color: '#71717a', maxWidth: 420, fontSize: 14 }}>
          WeGarden hit an unexpected error.
          {error.digest ? ` (Error ID: ${error.digest})` : ''}
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #d4d4d8',
            background: '#18181b',
            color: '#fafafa',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
