import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: plants, error } = await supabase
    .from("plants")
    .select("id, common_name, scientific_name, days_to_harvest, zones")
    .order("common_name");

  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight">Claude Garden</h1>
      <p className="text-zinc-500 mt-2 mb-12">
        Cross-platform gardening app — Supabase smoke test
      </p>

      <h2 className="text-2xl font-semibold mb-4">Plant catalog</h2>

      {error ? (
        <p className="text-red-600 font-mono text-sm">
          Connection error: {error.message}
        </p>
      ) : (
        <ul className="space-y-3">
          {(plants ?? []).map((p) => (
            <li
              key={p.id}
              className="border rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="font-medium">{p.common_name}</div>
              <div className="text-sm italic text-zinc-500">
                {p.scientific_name}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {p.days_to_harvest != null
                  ? `${p.days_to_harvest} days to harvest`
                  : "harvest time unknown"}{" "}
                · zones {p.zones.join(", ")}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-400 mt-12">
        Loaded {plants?.length ?? 0} rows from local Supabase via Server Component.
      </p>
    </main>
  );
}
