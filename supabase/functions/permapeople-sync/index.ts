// permapeople-sync: nightly upsert of the Permapeople plant catalog.
//
// Schedule: Supabase dashboard → Edge Functions → Cron (or pg_cron + http extension).
// Suggested cadence: 03:00 UTC daily.
//
// Set env vars: PERMAPEOPLE_KEY_ID, PERMAPEOPLE_KEY_SECRET
// Reference: https://permapeople.org/knowledgebase/api-docs.html

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PERMAPEOPLE_URL = "https://permapeople.org/api/plants";

interface PermapeopleEntry {
  id: number;
  name: string;
  scientific_name: string;
  data?: Array<{ key: string; value: string }>;
}

function toPlantUpsert(entry: PermapeopleEntry) {
  // Inline duplicate of @garden/shared/permapeople.toPlantUpsert — Deno can't
  // resolve workspace packages directly. If this drifts often, publish
  // @garden/shared to a Deno-friendly target (e.g., JSR) and import here.
  const lookup = new Map((entry.data ?? []).map((d) => [d.key, d.value]));
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

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const keyId = Deno.env.get("PERMAPEOPLE_KEY_ID");
    const keySecret = Deno.env.get("PERMAPEOPLE_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response("permapeople credentials missing", { status: 500 });
    }

    let upserted = 0;
    let page = 1;
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

      const rows = entries.map(toPlantUpsert);
      const { error } = await ctx.supabaseAdmin
        .from("plants")
        .upsert(rows, { onConflict: "permapeople_id" });
      if (error) return new Response(error.message, { status: 500 });
      upserted += rows.length;
      page += 1;
    }

    return Response.json({ status: "ok", upserted });
  }),
};
