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
