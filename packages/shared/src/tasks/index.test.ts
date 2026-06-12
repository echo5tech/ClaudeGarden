import { describe, expect, it } from "vitest";
import { planTasksForBedPlant, type BedPlantContext } from "./index";

const baseCtx: BedPlantContext = {
  plantedDate: new Date("2026-06-01"),
  daysToHarvest: null,
  waterNeeds: null,
  sowWeeksBeforeFrost: null,
  directSowWeeksAfterFrost: null,
  frostWindow: null,
};

function dates(tasks: ReturnType<typeof planTasksForBedPlant>, type: string) {
  return tasks
    .filter((t) => t.taskType === type)
    .map((t) => t.dueDate.toISOString().slice(0, 10));
}

describe("water cadence", () => {
  it("defaults to every 2 days starting on the planted date", () => {
    const tasks = planTasksForBedPlant(baseCtx, {
      from: new Date("2026-06-01"),
      to: new Date("2026-06-07"),
    });
    expect(dates(tasks, "water")).toEqual([
      "2026-06-01",
      "2026-06-03",
      "2026-06-05",
      "2026-06-07",
    ]);
  });

  it("waters daily for high/moist water needs", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, waterNeeds: "High – keep consistently moist" },
      { from: new Date("2026-06-01"), to: new Date("2026-06-03") },
    );
    expect(dates(tasks, "water")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("waters every 3 days for drought-tolerant plants", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, waterNeeds: "Drought tolerant" },
      { from: new Date("2026-06-01"), to: new Date("2026-06-07") },
    );
    expect(dates(tasks, "water")).toEqual(["2026-06-01", "2026-06-04", "2026-06-07"]);
  });

  it("snaps to the interval grid when the window starts after planting", () => {
    // Planted 06-01, 2-day grid → waterings fall on odd days of June.
    const tasks = planTasksForBedPlant(baseCtx, {
      from: new Date("2026-06-02"),
      to: new Date("2026-06-06"),
    });
    expect(dates(tasks, "water")).toEqual(["2026-06-03", "2026-06-05"]);
  });

  it("returns no waterings when the window ends before planting", () => {
    const tasks = planTasksForBedPlant(baseCtx, {
      from: new Date("2026-05-01"),
      to: new Date("2026-05-15"),
    });
    expect(dates(tasks, "water")).toEqual([]);
  });
});

describe("harvest", () => {
  it("plans a single harvest at plantedDate + daysToHarvest", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, daysToHarvest: 60 },
      { from: new Date("2026-07-01"), to: new Date("2026-08-31") },
    );
    expect(dates(tasks, "harvest")).toEqual(["2026-07-31"]);
  });

  it("omits the harvest when it falls outside the window", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, daysToHarvest: 60 },
      { from: new Date("2026-06-01"), to: new Date("2026-06-30") },
    );
    expect(dates(tasks, "harvest")).toEqual([]);
  });

  it("plans no harvest when daysToHarvest is unknown", () => {
    const tasks = planTasksForBedPlant(baseCtx, {
      from: new Date("2026-06-01"),
      to: new Date("2026-12-31"),
    });
    expect(dates(tasks, "harvest")).toEqual([]);
  });
});

describe("sow", () => {
  const frostWindow = {
    lastFrost: new Date("2026-04-15"),
    firstFrost: new Date("2026-10-15"),
  };

  it("plans an indoor sow N weeks before the last frost", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, sowWeeksBeforeFrost: 6, frostWindow },
      { from: new Date("2026-03-01"), to: new Date("2026-03-31") },
    );
    // 2026-04-15 − 42 days = 2026-03-04
    expect(dates(tasks, "sow")).toEqual(["2026-03-04"]);
  });

  it("omits the sow task without a frost window", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, sowWeeksBeforeFrost: 6, frostWindow: null },
      { from: new Date("2026-01-01"), to: new Date("2026-12-31") },
    );
    expect(dates(tasks, "sow")).toEqual([]);
  });

  it("omits the sow task when it falls outside the window", () => {
    const tasks = planTasksForBedPlant(
      { ...baseCtx, sowWeeksBeforeFrost: 6, frostWindow },
      { from: new Date("2026-04-01"), to: new Date("2026-04-30") },
    );
    expect(dates(tasks, "sow")).toEqual([]);
  });
});
