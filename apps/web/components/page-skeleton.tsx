/** Generic pulse skeleton rendered by route-level loading.tsx files. */
export function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10" aria-busy="true">
      <div className="mb-8 h-7 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </main>
  )
}
