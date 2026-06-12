// Frost-date and hardiness-zone helpers. Real implementations will pull from a
// per-zone lookup table seeded into Supabase (zones reference data) — these
// signatures are what consumers will import.

export interface FrostWindow {
  lastFrost: Date;
  firstFrost: Date;
}

export function isSafeToTransplant(today: Date, window: FrostWindow): boolean {
  return today >= window.lastFrost && today < window.firstFrost;
}

export function daysUntilLastFrost(today: Date, window: FrostWindow): number {
  const msPerDay = 86_400_000;
  return Math.ceil((window.lastFrost.getTime() - today.getTime()) / msPerDay);
}

/** USDA hardiness zone → typical last-frost date as MM-DD. null = frost-free. */
export const ZONE_LAST_FROST_MMDD: Record<string, string | null> = {
  "1a": "06-15",
  "1b": "06-01",
  "2a": "05-15",
  "2b": "05-01",
  "3a": "05-01",
  "3b": "04-15",
  "4a": "04-15",
  "4b": "04-01",
  "5a": "04-01",
  "5b": "03-30",
  "6a": "03-15",
  "6b": "03-15",
  "7a": "03-01",
  "7b": "03-01",
  "8a": "02-15",
  "8b": "02-01",
  "9a": "02-01",
  "9b": "01-15",
  "10a": null,
  "10b": null,
  "11a": null,
  "11b": null,
  "12a": null,
  "12b": null,
  "13a": null,
  "13b": null,
};

/**
 * Next occurrence of the zone's last-frost date on or after `today`, as a
 * YYYY-MM-DD string (matches the Postgres `date` convention). Returns null
 * for frost-free or unknown zones. ISO-string comparison avoids TZ math.
 */
export function nextLastFrostDate(zone: string, today: Date): string | null {
  const mmdd = ZONE_LAST_FROST_MMDD[zone];
  if (mmdd == null) return null;
  const year = today.getUTCFullYear();
  const candidate = `${year}-${mmdd}`;
  const todayStr = today.toISOString().slice(0, 10);
  return candidate >= todayStr ? candidate : `${year + 1}-${mmdd}`;
}
