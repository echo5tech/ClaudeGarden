import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("plants")
    .select("common_name")
    .eq("id", id)
    .single();
  return {
    title: data ? `${data.common_name} — WeGarden` : "Plant — WeGarden",
  };
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider self-start pt-0.5">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </>
  );
}

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: plant } = await supabase
    .from("plants")
    .select("*")
    .eq("id", id)
    .single();

  if (!plant) notFound();

  const companions: Array<{ id: string; common_name: string }> = [];
  const antagonists: Array<{ id: string; common_name: string }> = [];

  if (plant.companion_plant_ids?.length > 0) {
    const { data } = await supabase
      .from("plants")
      .select("id, common_name")
      .in("id", plant.companion_plant_ids);
    if (data) companions.push(...data);
  }

  if (plant.antagonist_plant_ids?.length > 0) {
    const { data } = await supabase
      .from("plants")
      .select("id, common_name")
      .in("id", plant.antagonist_plant_ids);
    if (data) antagonists.push(...data);
  }

  const sowNote =
    plant.sow_weeks_before_frost != null
      ? `${plant.sow_weeks_before_frost} weeks before last frost`
      : null;

  const directSowNote =
    plant.direct_sow_weeks_after_frost != null
      ? `${plant.direct_sow_weeks_after_frost} weeks after last frost`
      : null;

  const spacingNote =
    plant.spacing_inches != null ? `${plant.spacing_inches}"` : null;

  return (
    <main className="min-h-screen px-8 py-16 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Catalog
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{plant.common_name}</h1>
      <p className="text-zinc-500 italic mb-8 text-sm">{plant.scientific_name}</p>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 mb-10">
        <InfoRow label="Days to harvest" value={plant.days_to_harvest} />
        <InfoRow label="Spacing" value={spacingNote} />
        <InfoRow
          label="Zones"
          value={plant.zones?.length ? plant.zones.join(", ") : null}
        />
        <InfoRow label="Sunlight" value={plant.sun_exposure} />
        <InfoRow label="Watering" value={plant.water_needs} />
        <InfoRow label="Soil" value={plant.soil_type} />
        <InfoRow label="Fertilizer" value={plant.fertilizer_notes} />
        <InfoRow label="Sow indoors" value={sowNote} />
        <InfoRow label="Direct sow" value={directSowNote} />
      </dl>

      {companions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
            Good companions
          </h2>
          <ul className="flex flex-wrap gap-2">
            {companions.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/plants/${c.id}`}
                  className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:opacity-80 transition-opacity"
                >
                  {c.common_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {antagonists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
            Avoid planting with
          </h2>
          <ul className="flex flex-wrap gap-2">
            {antagonists.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/plants/${a.id}`}
                  className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:opacity-80 transition-opacity"
                >
                  {a.common_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
