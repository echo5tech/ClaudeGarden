import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Page not found</h2>
      <p className="max-w-md text-sm text-zinc-500">
        We couldn&apos;t find what you were looking for. It may have been moved,
        or the garden may be private.
      </p>
      <Link
        href="/"
        className="text-sm font-medium underline underline-offset-4 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Back to Today
      </Link>
    </main>
  );
}
