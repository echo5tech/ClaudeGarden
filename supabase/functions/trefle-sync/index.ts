// trefle-sync: upserts vegetable/edible plant data from the Trefle botanical API.
//
// Strategy: page through /api/v1/species?filter[vegetable]=true, then fetch
// the full species detail for each record (for the growth/specifications
// sub-objects). Designed to be invoked incrementally — one call processes one
// page of 20 species and returns { done, resumeWith } so pg_cron or a manual
// caller can chain invocations without hitting the 150 s Edge Function timeout.
//
// Secrets: TREFLE_TOKEN  (set in Supabase dashboard → Edge Functions → Secrets)
// Invoke:  POST /trefle-sync  with body { "page": 1 }  (default page 1)
//
// To run a full sync, keep calling with the returned resumeWith.page until
// done === true. A pg_cron job running every 10 minutes with page stored in
// a config table is the typical production pattern.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const TREFLE = "https://trefle.io/api/v1";
const PAGE_SIZE = 20; // Trefle default
const DETAIL_CONCURRENCY = 5; // parallel species-detail fetches per page
const MAX_RUN_MS = 100_000; // stop before the 150 s function timeout

// ── Trefle response types ─────────────────────────────────────────────────────

interface TrefleListItem {
  id: number;
  slug: string;
  common_name: string | null;
  scientific_name: string;
  vegetable: boolean;
  edible: boolean | null;
  image_url: string | null;
}

interface TrefleGrowth {
  days_to_harvest: number | null;
  row_spacing: { cm: number } | null;
  spread: { cm: number } | null;
  light: number | null; // 0 (deep shade) – 10 (full sun)
  atmospheric_humidity: number | null; // 0 (very dry) – 10 (saturated)
  soil_humidity: number | null;
  soil_texture: number | null; // 0 (clay) – 10 (sandy)
  ph_minimum: number | null;
  ph_maximum: number | null;
  minimum_temperature: { deg_c: number; deg_f: number } | null;
  maximum_temperature: { deg_c: number; deg_f: number } | null;
  minimum_precipitation: { mm: number } | null;
  maximum_precipitation: { mm: number } | null;
  sowing: string | null; // free text, not reliably parseable
}

interface TrefleSpecification {
  ligneous_type: string | null; // "herb" | "shrub" | "tree" | ...
  growth_form: string | null;
  growth_habit: string | null;
  average_height: { cm: number } | null;
}

interface TrefleSpeciesDetail extends TrefleListItem {
  genus: string;
  family: string;
  growth: TrefleGrowth | null;
  specifications: TrefleSpecification | null;
  common_names: Record<string, string[]> | null;
}

interface TrefleListResponse {
  data: TrefleListItem[];
  links: { next: string | null; last: string };
  meta: { total: number };
}

// ── Conversion helpers ────────────────────────────────────────────────────────

function cmToInches(cm: number | null | undefined): number | null {
  if (cm == null) return null;
  return Math.round(cm / 2.54);
}

// 0–10 Trefle light scale → human-readable sun exposure
function lightToSunExposure(v: number | null): string | null {
  if (v == null) return null;
  if (v >= 7) return "Full sun (6+ hours direct light)";
  if (v >= 4) return "Partial sun / partial shade (3–6 hours)";
  return "Full shade (less than 3 hours)";
}

// 0–10 Trefle humidity scale → human-readable watering frequency
function humidityToWaterNeeds(v: number | null): string | null {
  if (v == null) return null;
  if (v >= 7) return "High – keep consistently moist";
  if (v >= 4) return "Medium – water regularly, allow slight drying between waterings";
  return "Low – drought tolerant, water sparingly";
}

// 0–10 Trefle soil_texture scale (0 = clay, 10 = sandy) → human-readable
function soilTextureToType(v: number | null): string | null {
  if (v == null) return null;
  if (v <= 3) return "Heavy clay – rich, moisture-retentive";
  if (v <= 6) return "Loamy – well-draining, fertile";
  return "Sandy / light – fast-draining, low fertility";
}

// USDA zone thresholds: each zone half-step is 5 °F, starting at < −60 °F for 1a
const ZONE_BANDS: Array<{ zone: string; minF: number }> = [
  { zone: "1a", minF: -60 }, { zone: "1b", minF: -55 },
  { zone: "2a", minF: -50 }, { zone: "2b", minF: -45 },
  { zone: "3a", minF: -40 }, { zone: "3b", minF: -35 },
  { zone: "4a", minF: -30 }, { zone: "4b", minF: -25 },
  { zone: "5a", minF: -20 }, { zone: "5b", minF: -15 },
  { zone: "6a", minF: -10 }, { zone: "6b", minF: -5 },
  { zone: "7a", minF: 0 },   { zone: "7b", minF: 5 },
  { zone: "8a", minF: 10 },  { zone: "8b", minF: 15 },
  { zone: "9a", minF: 20 },  { zone: "9b", minF: 25 },
  { zone: "10a", minF: 30 }, { zone: "10b", minF: 35 },
  { zone: "11a", minF: 40 }, { zone: "11b", minF: 45 },
  { zone: "12a", minF: 50 }, { zone: "12b", minF: 55 },
  { zone: "13a", minF: 60 }, { zone: "13b", minF: 65 },
];

// Return the hardiness zone range a plant can survive in, based on its
// cold-hardiness minimum temperature (deg F). Caps the upper end at +10 zones
// to avoid listing every tropical zone for a plant with minTempF = 0 °F.
function minTempFToZones(minTempF: number | null): string[] {
  if (minTempF == null) return [];
  const startIdx = ZONE_BANDS.findIndex((z) => z.minF >= minTempF);
  if (startIdx === -1) return [ZONE_BANDS[ZONE_BANDS.length - 1].zone];
  return ZONE_BANDS.slice(startIdx, startIdx + 12).map((z) => z.zone);
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
      // Rate limited — back off and retry
      await sleep(5_000 * (attempt + 1));
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

// Run fn on each item with at most `limit` in-flight at a time
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

// ── Main handler ──────────────────────────────────────────────────────────────

type SupabaseAdmin = Parameters<Parameters<typeof withSupabase>[1]>[1]["supabaseAdmin"];

interface PlantRow {
  trefle_id: number;
  common_name: string;
  scientific_name: string;
  spacing_inches: number | null;
  days_to_harvest: number | null;
  zones: string[];
  sun_exposure: string | null;
  water_needs: string | null;
  soil_type: string | null;
}

async function fetchPage(
  token: string,
  page: number,
): Promise<TrefleListResponse | null> {
  return fetchJson<TrefleListResponse>(
    `${TREFLE}/species?token=${token}&filter[vegetable]=true&page=${page}`,
  );
}

async function fetchDetail(
  token: string,
  slug: string,
): Promise<TrefleSpeciesDetail | null> {
  const res = await fetchJson<{ data: TrefleSpeciesDetail }>(
    `${TREFLE}/species/${slug}?token=${token}`,
  );
  return res?.data ?? null;
}

function toPlantRow(
  item: TrefleListItem,
  detail: TrefleSpeciesDetail | null,
): PlantRow {
  const g = detail?.growth ?? null;

  // Prefer English common name from detail; fall back to list field or slug
  const enNames = detail?.common_names?.["en"] ?? [];
  const commonName =
    item.common_name ||
    enNames[0] ||
    item.slug.replace(/-/g, " ");

  // Prefer row_spacing; fall back to spread (plant width as proxy for spacing)
  const spacingCm = g?.row_spacing?.cm ?? g?.spread?.cm ?? null;

  return {
    trefle_id: item.id,
    common_name: commonName,
    scientific_name: item.scientific_name,
    spacing_inches: cmToInches(spacingCm),
    days_to_harvest: g?.days_to_harvest ?? null,
    zones: minTempFToZones(g?.minimum_temperature?.deg_f ?? null),
    sun_exposure: lightToSunExposure(g?.light ?? null),
    water_needs: humidityToWaterNeeds(
      g?.atmospheric_humidity ?? g?.soil_humidity ?? null,
    ),
    soil_type: soilTextureToType(g?.soil_texture ?? null),
  };
}

async function upsertRows(
  admin: SupabaseAdmin,
  rows: PlantRow[],
): Promise<{ error: string | null }> {
  const { error } = await admin
    .from("plants")
    .upsert(rows, { onConflict: "trefle_id" });
  return { error: error?.message ?? null };
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const token = Deno.env.get("TREFLE_TOKEN");
    if (!token) {
      return new Response("TREFLE_TOKEN secret is not set", { status: 500 });
    }

    const body = await req.json().catch(() => ({})) as { page?: number };
    const startPage = Math.max(1, body.page ?? 1);

    const startedAt = Date.now();
    let currentPage = startPage;
    let totalUpserted = 0;
    let totalPlants = 0;
    let hasMore = true;

    while (hasMore && Date.now() - startedAt < MAX_RUN_MS) {
      const list = await fetchPage(token, currentPage);
      if (!list || list.data.length === 0) {
        hasMore = false;
        break;
      }

      totalPlants = list.meta.total;

      // Fetch full species detail for each item in this page (rate-limited)
      const details = await mapConcurrent(
        list.data,
        (item) => fetchDetail(token, item.slug),
        DETAIL_CONCURRENCY,
      );

      const rows = list.data.map((item, i) => toPlantRow(item, details[i]));

      const { error } = await upsertRows(ctx.supabaseAdmin, rows);
      if (error) {
        return Response.json(
          { status: "error", message: error, page: currentPage },
          { status: 500 },
        );
      }

      totalUpserted += rows.length;
      hasMore = list.links.next != null;
      currentPage++;
    }

    const done = !hasMore;
    return Response.json({
      status: done ? "ok" : "partial",
      upserted: totalUpserted,
      totalPlants,
      pagesProcessed: `${startPage}–${currentPage - 1}`,
      done,
      ...(done ? {} : { resumeWith: { page: currentPage } }),
    });
  }),
};
