import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Plant catalog — WeGarden',
  description: 'Browse vegetables, herbs, and flowers with spacing, zones, and harvest times.',
};

const PAGE_SIZE = 50;

export default async function PlantCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from('plants')
    .select('id, common_name, scientific_name, days_to_harvest, zones', { count: 'exact' })
    .order('common_name')
    .range(from, from + PAGE_SIZE - 1);
  if (q?.trim()) {
    const escaped = q.trim().replace(/[%_]/g, '\\$&');
    query = query.or(`common_name.ilike.%${escaped}%,scientific_name.ilike.%${escaped}%`);
  }
  const { data: plants, count } = await query;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/plants?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Plant catalog</h1>

      <form action="/plants" method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search plants…"
          aria-label="Search plants"
          className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <button
          type="submit"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          Search
        </button>
      </form>

      {(plants ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">
          {q ? `No plants match “${q}”.` : 'No plants in the catalog yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {(plants ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/plants/${p.id}`}
                className="block border rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="font-medium">{p.common_name}</div>
                <div className="text-sm italic text-zinc-500">{p.scientific_name}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {p.days_to_harvest != null
                    ? `${p.days_to_harvest} days to harvest`
                    : 'harvest time unknown'}
                  {(p.zones ?? []).length > 0 && ` · zones ${(p.zones ?? []).join(', ')}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between mt-8 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="underline underline-offset-4 hover:no-underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-zinc-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="underline underline-offset-4 hover:no-underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
