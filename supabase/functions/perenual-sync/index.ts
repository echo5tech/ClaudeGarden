// perenual-sync: upserts edible/vegetable plant data from the Perenual API.
//
// Perenual complements Trefle and USDA data:
//   Perenual gives:  USDA hardiness zones (exact min/max), watering text,
//                    fertilizer notes (from care guides), soil types,
//                    sunlight descriptions, drought/invasive flags.
//   Trefle gives:    days_to_harvest, row spacing, temperature data.
//   USDA seed gives: sowing timing (weeks before/after frost).
//
// Strategy: page through /species-list?edible=1, fetch full species detail
// + care guide for each record, then upsert by perenual_id. Designed for
// incremental runs — one invocation processes one list page (30 plants) and
// returns { done, resumeWith } so pg_cron or a manual caller can chain pages
// without hitting the 150 s Edge Function timeout.
//
// Secrets: PERENUAL_KEY  (set in Supabase dashboard → Edge Functions → Secrets)
// Invoke:  POST /perenual-sync  with body { "page": 1 }  (default page 1)

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PERENUAL = "https://perenual.com/api";
const DETAIL_CONCURRENCY = 2;
const MAX_RUN_MS = 30_000;

// ── Perenual response types ───────────────────────────────────────────────────

interface PerenualImage {
  small_url: string | null;
  medium_url: string | null;
  regular_url: string | null;
  original_url: string | null;
}

interface PerenualListItem {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[] | null;
  cycle: string; // "Annual" | "Biennial" | "Perennial" | "Biannual"
  watering: string; // "Frequent" | "Average" | "Minimum" | "None"
  sunlight: string[];
  default_image: PerenualImage | null;
}

interface PerenualHardiness {
  min: string; // e.g. "3"
  max: string; // e.g. "9"
}

interface PerenualWateringBenchmark {
  value: string; // e.g. "7-10" or "14"
  unit: string;  // "days" | "weeks"
}

interface PerenualDetail extends PerenualListItem {
  family: string | null;
  type: string | null; // "tree" | "shrub" | "herb" | etc.
  hardiness: PerenualHardiness | null;
  watering_general_benchmark: PerenualWateringBenchmark | null;
  soil: string[];
  growth_rate: string | null; // "High" | "Medium" | "Low"
  maintenance: string | null; // "None" | "Low" | "Moderate" | "High"
  care_level: string | null;  // "Unknown" | "Easy" | "Medium" | "Hard"
  drought_tolerant: boolean;
  invasive: boolean | null;
  tropical: boolean;
  indoor: boolean;
  edible_leaf: boolean;
  edible_fruit: boolean;
  cuisine: boolean;
  medicinal: boolean;
  poisonous_to_humans: number; // 0 | 1 | 2
  poisonous_to_pets: number;
  harvest_season: string | null; // "Spring" | "Summer" | "Fall" | "Winter"
  description: string | null;
}

interface PerenualCareSection {
  type: string; // "watering" | "sunlight" | "fertilization" | "pruning"
  description: string;
}

interface PerenualCareGuide {
  id: number;
  species_id: number;
  section: PerenualCareSection[];
}

interface PerenualListResponse {
  data: PerenualListItem[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

interface PerenualDetailResponse {
  id: number;
  // The detail endpoint returns the full PerenualDetail shape
  [key: string]: unknown;
}

interface PerenualCareResponse {
  data: PerenualCareGuide[];
}

// ── Conversion helpers ────────────────────────────────────────────────────────

// Expand "3" → "9" into full zone strings ["3a","3b","4a",..."9a","9b"]
function expandZoneRange(min: string, max: string): string[] {
  const HALF_STEPS = ["a", "b"] as const;
  const minNum = parseInt(min, 10);
  const maxNum = parseInt(max, 10);
  if (isNaN(minNum) || isNaN(maxNum)) return [];

  const zones: string[] = [];
  for (let n = minNum; n <= maxNum; n++) {
    for (const half of HALF_STEPS) {
      zones.push(`${n}${half}`);
    }
  }
  return zones;
}

// Perenual "watering" field + optional benchmark → human-readable water_needs
// The text is written so our waterIntervalDays() in @garden/shared picks it up:
//   "frequent" → 1 day   "average" → 2 days   "minimum"/"low" → 3 days
function buildWaterNeeds(
  watering: string,
  benchmark: PerenualWateringBenchmark | null,
): string {
  const base =
    watering === "Frequent" ? "Frequent – keep consistently moist" :
    watering === "Average"  ? "Average – water regularly, allow slight drying between waterings" :
    watering === "Minimum"  ? "Minimum – low water needs, drought tolerant" :
    watering === "None"     ? "Low – very drought tolerant, minimal watering" :
    watering;

  if (!benchmark) return base;

  // Parse benchmark value "7-10" or "14" into a readable note
  const { value, unit } = benchmark;
  const unitLabel = unit === "days" ? "day" : unit.replace(/s$/, "");
  return `${base} (every ${value} ${unitLabel}s)`;
}

// Array of Perenual sunlight strings → single human-readable string
function buildSunExposure(sunlight: string[]): string | null {
  if (!sunlight || sunlight.length === 0) return null;
  // Normalise casing and join unique values
  const normalised = [...new Set(sunlight.map((s) => {
    const l = s.toLowerCase();
    if (l.includes("full sun")) return "Full sun (6+ hours)";
    if (l.includes("part sun") || l.includes("part shade") || l.includes("partial"))
      return "Partial sun / partial shade (3–6 hours)";
    if (l.includes("full shade") || l.includes("deep shade"))
      return "Full shade (less than 3 hours)";
    return s; // passthrough for unrecognised values
  }))];
  return normalised.join(", ");
}

// Array of soil type strings → single string
function buildSoilType(soil: string[]): string | null {
  if (!soil || soil.length === 0) return null;
  return soil.join(", ");
}

// Extract the fertilization section description from care guide data
function extractFertilizerNotes(guide: PerenualCareGuide | null): string | null {
  if (!guide) return null;
  const section = guide.section.find(
    (s) => s.type === "fertilization" || s.type === "fertilizer",
  );
  return section?.description?.trim() || null;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, retries = 3): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (!res) {
      await sleep(1_000 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ── Per-plant enrichment ──────────────────────────────────────────────────────

type SupabaseAdmin = Parameters<Parameters<typeof withSupabase>[1]>[1]["supabaseAdmin"];

interface EnrichedPlant {
  item: PerenualListItem;
  detail: PerenualDetail | null;
  guide: PerenualCareGuide | null;
}

async function enrichOne(key: string, item: PerenualListItem): Promise<EnrichedPlant> {
  const [detailRes, guideRes] = await Promise.all([
    fetchJson<PerenualDetail>(`${PERENUAL}/species/details/${item.id}?key=${key}`),
    fetchJson<PerenualCareResponse>(
      `${PERENUAL}/species-care-guide-list?key=${key}&species_id=${item.id}`,
    ),
  ]);
  return {
    item,
    detail: detailRes ?? null,
    guide: guideRes?.data?.[0] ?? null,
  };
}

interface PlantRow {
  perenual_id: number;
  common_name: string;
  scientific_name: string;
  zones: string[];
  sun_exposure: string | null;
  water_needs: string | null;
  soil_type: string | null;
  fertilizer_notes: string | null;
}

function toPlantRow({ item, detail, guide }: EnrichedPlant): PlantRow {
  const scientificName =
    (Array.isArray(item.scientific_name) ? item.scientific_name[0] : item.scientific_name) ??
    item.common_name;

  const zones =
    detail?.hardiness?.min && detail?.hardiness?.max
      ? expandZoneRange(detail.hardiness.min, detail.hardiness.max)
      : [];

  return {
    perenual_id: item.id,
    common_name: item.common_name,
    scientific_name: scientificName,
    zones,
    sun_exposure: buildSunExposure(item.sunlight),
    water_needs: buildWaterNeeds(
      item.watering,
      detail?.watering_general_benchmark ?? null,
    ),
    soil_type: buildSoilType(detail?.soil ?? []),
    fertilizer_notes: extractFertilizerNotes(guide),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const key = Deno.env.get("PERENUAL_KEY");
    if (!key) {
      return new Response("PERENUAL_KEY secret is not set", { status: 500 });
    }

    const body = await req.json().catch(() => ({})) as { page?: number };
    const startPage = Math.max(1, body.page ?? 1);

    const startedAt = Date.now();
    let currentPage = startPage;
    let totalUpserted = 0;
    let lastPage = 0;
    let totalPlants = 0;
    let hasMore = true;

    while (hasMore && Date.now() - startedAt < MAX_RUN_MS) {
      const list = await fetchJson<PerenualListResponse>(
        `${PERENUAL}/species-list?key=${key}&edible=1&page=${currentPage}`,
      );

      if (!list || !list.data || list.data.length === 0) {
        hasMore = false;
        break;
      }

      totalPlants = list.total;
      lastPage = list.last_page;

      // Fetch detail + care guide for each species in parallel
      const enriched = await mapConcurrent(
        list.data,
        (item) => enrichOne(key, item),
        DETAIL_CONCURRENCY,
      );

      const rows = enriched.map(toPlantRow);

      const { error } = await ctx.supabaseAdmin
        .from("plants")
        .upsert(rows, { onConflict: "perenual_id" });

      if (error) {
        return Response.json(
          { status: "error", message: error.message, page: currentPage },
          { status: 500 },
        );
      }

      totalUpserted += rows.length;
      hasMore = currentPage < list.last_page;
      currentPage++;
    }

    const done = !hasMore;
    return Response.json({
      status: done ? "ok" : "partial",
      upserted: totalUpserted,
      totalPlants,
      lastPage,
      pagesProcessed: `${startPage}–${currentPage - 1}`,
      done,
      ...(done ? {} : { resumeWith: { page: currentPage } }),
    });
  }),
};
