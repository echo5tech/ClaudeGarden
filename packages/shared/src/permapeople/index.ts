// Permapeople adapter. Consumed by the `permapeople-sync` Edge Function on a
// nightly schedule — fetches the upstream catalog and upserts into our plants table.
// Reference: https://permapeople.org/api
// Companion/care fields added — keep in sync with packages/shared/src/permapeople/index.ts

import { z } from "zod";

export const PermapeopleEntrySchema = z.object({
  id: z.number(),
  scientific_name: z.string(),
  name: z.string(),
  data: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
});
export type PermapeopleEntry = z.infer<typeof PermapeopleEntrySchema>;

export interface PlantUpsert {
  permapeople_id: number;
  common_name: string;
  scientific_name: string;
  spacing_inches: number | null;
  days_to_harvest: number | null;
  zones: string[];
  // Care fields:
  sun_exposure: string | null;
  water_needs: string | null;
  soil_type: string | null;
  fertilizer_notes: string | null;
  sow_weeks_before_frost: number | null;
  direct_sow_weeks_after_frost: number | null;
  // Companion names (raw strings from API — resolved to UUIDs in second pass):
  good_neighbour_names: string[];
  bad_neighbour_names: string[];
}

/**
 * Parse the first integer from strings like "6-8 weeks before last frost" or
 * "2 weeks after last frost". Returns null when the value is absent or
 * contains no parseable integer.
 */
export function parseWeeks(val: string | undefined): number | null {
  if (!val) return null;
  const match = val.match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

export function toPlantUpsert(entry: PermapeopleEntry): PlantUpsert {
  const lookup = new Map(entry.data.map((d) => [d.key, d.value]));
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
    permapeople_id: entry.id,
    common_name: entry.name,
    scientific_name: entry.scientific_name,
    spacing_inches: toInt("Row spacing") ?? toInt("Plant spacing"),
    days_to_harvest: toInt("Days to harvest"),
    zones: (lookup.get("USDA Hardiness zone")?.split(",") ?? []).map((z) => z.trim()),
    // Care fields:
    sun_exposure: lookup.get("Sunlight") ?? null,
    water_needs: lookup.get("Watering") ?? null,
    soil_type: lookup.get("Soil") ?? null,
    fertilizer_notes: lookup.get("Fertiliser") ?? null,
    sow_weeks_before_frost: parseWeeks(lookup.get("Sow Indoors")),
    direct_sow_weeks_after_frost: parseWeeks(lookup.get("Direct Sow")),
    // Companion names resolved to UUIDs in the second pass of permapeople-sync:
    good_neighbour_names: splitNames("Good Neighbours"),
    bad_neighbour_names: splitNames("Bad Neighbours"),
  };
}
