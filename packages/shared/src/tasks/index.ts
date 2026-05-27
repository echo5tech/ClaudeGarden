// Task-generation rules shared between the TypeScript clients and the Edge
// Function pipeline. The pg_cron SQL function handles bulk DB inserts; this
// module is used for client-side planning previews and upcoming-task queries.

import type { FrostWindow } from "../zone";

export type TaskType = "sow" | "water" | "harvest";

export interface BedPlantContext {
  plantedDate: Date;
  daysToHarvest: number | null;
  waterNeeds: string | null;
  sowWeeksBeforeFrost: number | null;
  directSowWeeksAfterFrost: number | null;
  frostWindow: FrostWindow | null;
}

export interface TaskWindow {
  from: Date;
  to: Date;
}

export interface PlannedTask {
  taskType: TaskType;
  dueDate: Date;
}

const MS_PER_DAY = 86_400_000;

/**
 * Derive a watering interval in days from the Permapeople "Watering" free-text
 * field. Falls back to every 2 days when the value is absent or unrecognised.
 */
function waterIntervalDays(waterNeeds: string | null): number {
  if (!waterNeeds) return 2;
  const lower = waterNeeds.toLowerCase();
  if (
    lower.includes("high") ||
    lower.includes("frequent") ||
    lower.includes("daily") ||
    lower.includes("moist") ||
    lower.includes("wet")
  )
    return 1;
  if (
    lower.includes("low") ||
    lower.includes("drought") ||
    lower.includes("tolerant") ||
    lower.includes("occasional") ||
    lower.includes("infrequent") ||
    lower.includes("dry") ||
    lower.includes("xeric")
  )
    return 3;
  return 2;
}

/**
 * Generate planned tasks for a single bed-plant within a date window.
 *
 * - Water: every N days from plantedDate, constrained to [window.from, window.to]
 * - Harvest: once at plantedDate + daysToHarvest (if within the window)
 * - Sow: once at lastFrost − sowWeeksBeforeFrost × 7 (if within the window)
 */
export function planTasksForBedPlant(
  ctx: BedPlantContext,
  window: TaskWindow,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];

  // ── Water ──────────────────────────────────────────────────────────────────
  const intervalDays = waterIntervalDays(ctx.waterNeeds);
  // Start watering from whichever is later: the planted date or the window start
  const effectiveStart =
    ctx.plantedDate > window.from ? ctx.plantedDate : window.from;
  const daysSincePlanted = Math.ceil(
    (effectiveStart.getTime() - ctx.plantedDate.getTime()) / MS_PER_DAY,
  );
  // Snap forward to the next interval boundary from plantedDate
  const offsetToFirst =
    (intervalDays - (daysSincePlanted % intervalDays)) % intervalDays;
  let waterDate = new Date(
    effectiveStart.getTime() + offsetToFirst * MS_PER_DAY,
  );
  while (waterDate <= window.to) {
    tasks.push({ taskType: "water", dueDate: new Date(waterDate) });
    waterDate = new Date(waterDate.getTime() + intervalDays * MS_PER_DAY);
  }

  // ── Harvest ────────────────────────────────────────────────────────────────
  if (ctx.daysToHarvest != null) {
    const harvestDate = new Date(
      ctx.plantedDate.getTime() + ctx.daysToHarvest * MS_PER_DAY,
    );
    if (harvestDate >= window.from && harvestDate <= window.to) {
      tasks.push({ taskType: "harvest", dueDate: harvestDate });
    }
  }

  // ── Sow (indoor start) ─────────────────────────────────────────────────────
  if (ctx.sowWeeksBeforeFrost != null && ctx.frostWindow) {
    const sowDate = new Date(
      ctx.frostWindow.lastFrost.getTime() -
        ctx.sowWeeksBeforeFrost * 7 * MS_PER_DAY,
    );
    if (sowDate >= window.from && sowDate <= window.to) {
      tasks.push({ taskType: "sow", dueDate: sowDate });
    }
  }

  return tasks;
}
