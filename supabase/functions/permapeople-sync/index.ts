// permapeople-sync: nightly upsert of the Permapeople plant catalog.
//
// Schedule: Supabase dashboard → Edge Functions → Cron (or pg_cron + http extension).
// Suggested cadence: 03:00 UTC daily.
//
// Set env vars: PERMAPEOPLE_KEY_ID, PERMAPEOPLE_KEY_SECRET
// Reference: https://permapeople.org/knowledgebase/api-docs.html
// Companion/care fields added — keep in sync with packages/shared/src/permapeople/index.ts

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PERMAPEOPLE_URL = "https://permapeople.org/api/plants";

interface PermapeopleEntry {
  id: number;
  name: string;
  scientific_name: string;
  data?: Array<{ key: string; value: string }>;
}

// ── Inline duplicate of @garden/shared/permapeople — Deno can't resolve
// workspace packages directly. Keep this in sync with
// packages/shared/src/permapeople/index.ts manually.

/**
 * Parse the first integer from strings like "6-8 weeks before last frost" or
 * "2 weeks after last frost". Returns null when the value is absent or
 * contains no parseable integer.
 */
function parseWeeks(val: string | undefined): number | null {
  if (!val) return null;
  const match = val.match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

interface PlantRow {
  permapeople_id: number;
  common_name: string;
  scientific_name: string;
  spacing_inches: number | null;
  days_to_harvest: number | null;
  zones: string[];
  sun_exposure: string | null;
  water_needs: string | null;
  soil_type: string | null;
  fertilizer_notes: string | null;
  sow_weeks_before_frost: number | null;
  direct_sow_weeks_after_frost: number | null;
}

/** Data kept in memory during the sync run for the companion-resolution pass. */
interface CompanionNames {
  permapeople_id: number;
  good_neighbour_names: string[];
  bad_neighbour_names: string[];
}

function toPlantRow(entry: PermapeopleEntry): {
  row: PlantRow;
  companions: CompanionNames;
} {
  const lookup = new Map((entry.data ?? []).map((d) => [d.key, d.value]));
  const toInt = (k: string) => {
    const v = lookup.get(k);
    const n = v == null ? NaN : Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  const splitNames = (key: string): string[] =>
    (lookup.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    row: {
      permapeople_id: entry.id,
      common_name: entry.name,
      scientific_name: entry.scientific_name,
      spacing_inches: toInt("Row spacing") ?? toInt("Plant spacing"),
      days_to_harvest: toInt("Days to harvest"),
      zones: (lookup.get("USDA Hardiness zone")?.split(",") ?? []).map((z) => z.trim()),
      sun_exposure: lookup.get("Sunlight") ?? null,
      water_needs: lookup.get("Watering") ?? null,
      soil_type: lookup.get("Soil") ?? null,
      fertilizer_notes: lookup.get("Fertiliser") ?? null,
      sow_weeks_before_frost: parseWeeks(lookup.get("Sow Indoors")),
      direct_sow_weeks_after_frost: parseWeeks(lookup.get("Direct Sow")),
    },
    companions: {
      permapeople_id: entry.id,
      good_neighbour_names: splitNames("Good Neighbours"),
      bad_neighbour_names: splitNames("Bad Neighbours"),
    },
  };
}

// ── End inline duplicate ──────────────────────────────────────────────────────

type SupabaseAdmin = Parameters<Parameters<typeof withSupabase>[1]>[1]["supabaseAdmin"];

/**
 * Second pass: resolve companion plant names to UUIDs and write
 * companion_plant_ids / antagonist_plant_ids on each plant row.
 *
 * Strategy:
 * 1. Fetch { id, common_name } for every plant in one query.
 * 2. Build a case-insensitive name → UUID map.
 * 3. For each entry that has neighbour names, resolve them and update.
 *    Unresolvable names are silently skipped (partial matches accepted).
 */
async function resolveCompanions(
  supabaseAdmin: SupabaseAdmin,
  allCompanions: CompanionNames[],
): Promise<{ companionsUpdated: number; errors: string[] }> {
  // Only process entries that actually have companion names.
  const relevant = allCompanions.filter(
    (c) => c.good_neighbour_names.length > 0 || c.bad_neighbour_names.length > 0,
  );
  if (relevant.length === 0) return { companionsUpdated: 0, errors: [] };

  // Fetch the full name→id map from the database.
  const { data: allPlants, error: fetchError } = await supabaseAdmin
    .from("plants")
    .select("id, common_name");
  if (fetchError) {
    return { companionsUpdated: 0, errors: [fetchError.message] };
  }

  const nameToId = new Map<string, string>(
    (allPlants ?? []).map((p: { id: string; common_name: string }) => [
      p.common_name.toLowerCase(),
      p.id,
    ]),
  );

  // Fetch permapeople_id → plant UUID mapping for the update target.
  const { data: idMap, error: idMapError } = await supabaseAdmin
    .from("plants")
    .select("id, permapeople_id");
  if (idMapError) {
    return { companionsUpdated: 0, errors: [idMapError.message] };
  }

  const permapeopleToUuid = new Map<number, string>(
    (idMap ?? []).map((p: { id: string; permapeople_id: number }) => [p.permapeople_id, p.id]),
  );

  const errors: string[] = [];
  let companionsUpdated = 0;

  for (const c of relevant) {
    const plantId = permapeopleToUuid.get(c.permapeople_id);
    if (!plantId) continue; // plant wasn't upserted (shouldn't happen)

    const resolveNames = (names: string[]): string[] =>
      names.map((name) => nameToId.get(name.toLowerCase())).filter(Boolean) as string[];

    const companionIds = resolveNames(c.good_neighbour_names);
    const antagonistIds = resolveNames(c.bad_neighbour_names);

    const { error } = await supabaseAdmin
      .from("plants")
      .update({
        companion_plant_ids: companionIds,
        antagonist_plant_ids: antagonistIds,
      })
      .eq("id", plantId);

    if (error) {
      errors.push(`plant ${plantId}: ${error.message}`);
    } else {
      companionsUpdated += 1;
    }
  }

  return { companionsUpdated, errors };
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const keyId = Deno.env.get("PERMAPEOPLE_KEY_ID");
    const keySecret = Deno.env.get("PERMAPEOPLE_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response("permapeople credentials missing", { status: 500 });
    }

    let upserted = 0;
    let page = 1;
    const allCompanions: CompanionNames[] = [];

    // ── First pass: paginate through Permapeople and upsert plant rows ────────
    while (true) {
      const resp = await fetch(`${PERMAPEOPLE_URL}?page=${page}`, {
        headers: { "x-permapeople-key-id": keyId, "x-permapeople-key-secret": keySecret },
      });
      if (!resp.ok) {
        return new Response(`permapeople ${resp.status}`, { status: 502 });
      }
      const json = (await resp.json()) as { plants?: PermapeopleEntry[] };
      const entries = json.plants ?? [];
      if (entries.length === 0) break;

      const parsed = entries.map(toPlantRow);
      const rows = parsed.map((p) => p.row);
      // Collect companion names in memory for the second pass.
      for (const p of parsed) allCompanions.push(p.companions);

      const { error } = await ctx.supabaseAdmin
        .from("plants")
        .upsert(rows, { onConflict: "permapeople_id" });
      if (error) return new Response(error.message, { status: 500 });
      upserted += rows.length;
      page += 1;
    }

    // ── Second pass: resolve companion names → UUIDs ──────────────────────────
    const { companionsUpdated, errors } = await resolveCompanions(
      ctx.supabaseAdmin,
      allCompanions,
    );

    return Response.json({
      status: "ok",
      upserted,
      companionsUpdated,
      companionErrors: errors.length > 0 ? errors : undefined,
    });
  }),
};
