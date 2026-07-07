// "What should I plant now?" — the app's headline question. Given a user's
// zone + last frost date and the plant catalog's sow offsets, surface plants
// whose sowing window overlaps today.

export interface RecommendablePlant {
  id: string;
  common_name: string;
  zones: string[] | null;
  sow_weeks_before_frost: number | null;
  direct_sow_weeks_after_frost: number | null;
  days_to_harvest: number | null;
}

export interface PlantingRecommendation {
  plant: RecommendablePlant;
  action: "sow-indoors" | "direct-sow";
  /** Ideal date for the action (start of the window). */
  idealDate: Date;
  /** Days from today until the ideal date; negative = window already open. */
  daysUntil: number;
}

const MS_PER_DAY = 86_400_000;

/** "7a" → 7; "7" → 7; anything unparseable → null. */
export function zoneNumber(zone: string): number | null {
  const match = zone.trim().match(/^(\d{1,2})/);
  const digits = match?.[1];
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return n >= 1 && n <= 13 ? n : null;
}

/**
 * A plant suits a zone when any of its listed zones shares the numeric part
 * ("5b" matches "5", "5a"). Plants with no zone data are assumed adaptable —
 * the catalog's sparse rows shouldn't vanish from recommendations.
 */
export function plantSuitsZone(plant: RecommendablePlant, userZone: string): boolean {
  const zones = plant.zones ?? [];
  if (zones.length === 0) return true;
  const user = zoneNumber(userZone);
  if (user == null) return true;
  return zones.some((z) => zoneNumber(z) === user);
}

/**
 * Recommend plantings whose window overlaps today.
 *
 * - Sow indoors: lastFrost − sow_weeks_before_frost × 7
 * - Direct sow:  lastFrost + direct_sow_weeks_after_frost × 7
 *
 * A window opens `leadDays` before the ideal date and stays open `graceDays`
 * after it (you can still sow a bit late).
 */
export function recommendPlantings(
  plants: RecommendablePlant[],
  userZone: string,
  lastFrost: Date,
  today: Date,
  { leadDays = 7, graceDays = 21 }: { leadDays?: number; graceDays?: number } = {},
): PlantingRecommendation[] {
  const recommendations: PlantingRecommendation[] = [];

  for (const plant of plants) {
    if (!plantSuitsZone(plant, userZone)) continue;

    const candidates: Array<{ action: PlantingRecommendation["action"]; idealDate: Date }> = [];
    if (plant.sow_weeks_before_frost != null) {
      candidates.push({
        action: "sow-indoors",
        idealDate: new Date(lastFrost.getTime() - plant.sow_weeks_before_frost * 7 * MS_PER_DAY),
      });
    }
    if (plant.direct_sow_weeks_after_frost != null) {
      candidates.push({
        action: "direct-sow",
        idealDate: new Date(
          lastFrost.getTime() + plant.direct_sow_weeks_after_frost * 7 * MS_PER_DAY,
        ),
      });
    }

    for (const { action, idealDate } of candidates) {
      const daysUntil = Math.round((idealDate.getTime() - today.getTime()) / MS_PER_DAY);
      if (daysUntil <= leadDays && daysUntil >= -graceDays) {
        recommendations.push({ plant, action, idealDate, daysUntil });
      }
    }
  }

  // Most urgent first: windows about to close, then ones just opening.
  return recommendations.sort((a, b) => a.daysUntil - b.daysUntil);
}
