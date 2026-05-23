import { createClient } from "@/lib/supabase/server";

const DEMO_PLANTS = [
  { id: "1", common_name: "Tomato", scientific_name: "Solanum lycopersicum", days_to_harvest: 75, zones: ["5", "6", "7", "8", "9"] },
  { id: "2", common_name: "Basil", scientific_name: "Ocimum basilicum", days_to_harvest: 30, zones: ["4", "5", "6", "7", "8", "9", "10"] },
  { id: "3", common_name: "Zucchini", scientific_name: "Cucurbita pepo", days_to_harvest: 55, zones: ["3", "4", "5", "6", "7", "8", "9"] },
  { id: "4", common_name: "Kale", scientific_name: "Brassica oleracea", days_to_harvest: 60, zones: ["2", "3", "4", "5", "6", "7", "8", "9"] },
  { id: "5", common_name: "Carrot", scientific_name: "Daucus carota", days_to_harvest: 70, zones: ["3", "4", "5", "6", "7", "8", "9", "10"] },
  { id: "6", common_name: "Sunflower", scientific_name: "Helianthus annuus", days_to_harvest: 80, zones: ["2", "3", "4", "5", "6", "7", "8", "9"] },
];

export default async function Home() {
  let plants = null;
  let isDemo = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plants")
      .select("id, common_name, scientific_name, days_to_harvest, zones")
      .order("common_name");
    plants = data;
  } catch {
    isDemo = true;
    plants = DEMO_PLANTS;
  }

  if (!plants || plants.length === 0) {
    isDemo = true;
    plants = DEMO_PLANTS;
  }

  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight">Claude Garden</h1>
      <p className="text-zinc-500 mt-2 mb-12">
        Answer &ldquo;What should I plant now?&rdquo; — drag-and-drop bed designer,
        mobile reminders, and social sharing.
      </p>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Plant catalog</h2>
        {isDemo && (
          <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
            demo data
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {plants.map((p) => (
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

      <p className="text-xs text-zinc-400 mt-12">
        {isDemo
          ? "Showing demo data — connect a Supabase project to load real plants."
          : `${plants.length} plants loaded from database.`}
      </p>
    </main>
  );
}
