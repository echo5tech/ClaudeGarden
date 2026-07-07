import { describe, expect, it } from "vitest";
import {
  plantSuitsZone,
  recommendPlantings,
  zoneNumber,
  type RecommendablePlant,
} from "./index";

const plant = (overrides: Partial<RecommendablePlant>): RecommendablePlant => ({
  id: "p1",
  common_name: "Tomato",
  zones: ["5", "6", "7"],
  sow_weeks_before_frost: null,
  direct_sow_weeks_after_frost: null,
  days_to_harvest: null,
  ...overrides,
});

describe("zoneNumber", () => {
  it("parses letter-suffixed and bare zones", () => {
    expect(zoneNumber("7a")).toBe(7);
    expect(zoneNumber("10b")).toBe(10);
    expect(zoneNumber("5")).toBe(5);
  });

  it("returns null for junk and out-of-range values", () => {
    expect(zoneNumber("zone")).toBeNull();
    expect(zoneNumber("14")).toBeNull();
    expect(zoneNumber("0")).toBeNull();
  });
});

describe("plantSuitsZone", () => {
  it("matches on the numeric part regardless of letter", () => {
    expect(plantSuitsZone(plant({ zones: ["5", "6"] }), "6b")).toBe(true);
    expect(plantSuitsZone(plant({ zones: ["5a"] }), "5b")).toBe(true);
    expect(plantSuitsZone(plant({ zones: ["8", "9"] }), "5a")).toBe(false);
  });

  it("assumes adaptable when the plant has no zone data", () => {
    expect(plantSuitsZone(plant({ zones: [] }), "7a")).toBe(true);
    expect(plantSuitsZone(plant({ zones: null }), "7a")).toBe(true);
  });
});

describe("recommendPlantings", () => {
  const lastFrost = new Date("2026-04-15");

  it("recommends indoor sowing inside the window", () => {
    // 6 weeks before Apr 15 = Mar 4. Today Mar 1 → daysUntil 3, inside lead.
    const recs = recommendPlantings(
      [plant({ sow_weeks_before_frost: 6 })],
      "7a",
      lastFrost,
      new Date("2026-03-01"),
    );
    expect(recs).toHaveLength(1);
    expect(recs[0]!.action).toBe("sow-indoors");
    expect(recs[0]!.daysUntil).toBe(3);
  });

  it("recommends direct sowing within the grace period after the ideal date", () => {
    // 2 weeks after Apr 15 = Apr 29. Today May 10 → 11 days late, within grace.
    const recs = recommendPlantings(
      [plant({ direct_sow_weeks_after_frost: 2 })],
      "7a",
      lastFrost,
      new Date("2026-05-10"),
    );
    expect(recs).toHaveLength(1);
    expect(recs[0]!.action).toBe("direct-sow");
    expect(recs[0]!.daysUntil).toBe(-11);
  });

  it("excludes plants outside the window or the zone", () => {
    const tooEarly = recommendPlantings(
      [plant({ sow_weeks_before_frost: 6 })],
      "7a",
      lastFrost,
      new Date("2026-01-01"),
    );
    expect(tooEarly).toHaveLength(0);

    const wrongZone = recommendPlantings(
      [plant({ sow_weeks_before_frost: 6, zones: ["9", "10"] })],
      "5a",
      lastFrost,
      new Date("2026-03-01"),
    );
    expect(wrongZone).toHaveLength(0);
  });

  it("sorts most-urgent (already open) windows first", () => {
    const recs = recommendPlantings(
      [
        plant({ id: "later", sow_weeks_before_frost: 6 }),
        plant({ id: "urgent", sow_weeks_before_frost: 7 }),
      ],
      "7a",
      lastFrost,
      new Date("2026-03-01"),
    );
    expect(recs.map((r) => r.plant.id)).toEqual(["urgent", "later"]);
  });
});
