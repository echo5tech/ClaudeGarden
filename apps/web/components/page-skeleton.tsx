/** Generic pulse skeleton rendered by route-level loading.tsx files. */
export function PageSkeleton() {
  return (
    <main
      className="page-wrap"
      aria-busy="true"
      aria-label="Loading your garden"
    >
      <div className="mb-8 h-7 w-48 animate-pulse rounded-md bg-[#e4eadb]" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 w-full animate-pulse rounded-xl bg-[#edf1e5]"
          />
        ))}
      </div>
    </main>
  );
}
