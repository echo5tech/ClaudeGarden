// Permapeople adapter. Consumed by the `permapeople-sync` Edge Function on a
// nightly schedule — fetches the upstream catalog and upserts into our plants table.
// Reference: https://permapeople.org/api

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
}

export function toPlantUpsert(entry: PermapeopleEntry): PlantUpsert {
  const lookup = new Map(entry.data.map((d) => [d.key, d.value]));
  const toInt = (k: string) => {
    const v = lookup.get(k);
    const n = v == null ? NaN : Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    permapeople_id: entry.id,
    common_name: entry.name,
    scientific_name: entry.scientific_name,
    spacing_inches: toInt("Row spacing") ?? toInt("Plant spacing"),
    days_to_harvest: toInt("Days to harvest"),
    zones: (lookup.get("USDA Hardiness zone")?.split(",") ?? []).map((z) => z.trim()),
  };
}
