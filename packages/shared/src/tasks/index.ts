// Task-generation rules. Called by the pg_cron Edge Function (or pg_cron-driven
// SQL function) to enqueue daily water/sow/harvest reminders.

import type { FrostWindow } from "../zone";

export type TaskType = "sow" | "water" | "harvest";

export interface BedPlantContext {
  plantedDate: Date;
  daysToHarvest: number;
  frostWindow: FrostWindow;
}

export interface PlannedTask {
  taskType: TaskType;
  dueDate: Date;
}

export function planTasksForBedPlant(ctx: BedPlantContext): PlannedTask[] {
  // TODO: implement. Sketch:
  //   - water: every N days from plantedDate (per species)
  //   - harvest: plantedDate + daysToHarvest
  //   - sow: only for indoor-start plants, before lastFrost
  return [];
}
