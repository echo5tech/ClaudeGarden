import { describe, expect, it } from "vitest";
import { PermapeopleEntrySchema, parseWeeks, toPlantUpsert } from "./index";

describe("parseWeeks", () => {
  it("extracts the first integer", () => {
    expect(parseWeeks("6-8 weeks before last frost")).toBe(6);
    expect(parseWeeks("2 weeks after last frost")).toBe(2);
  });

  it("returns null for missing or non-numeric values", () => {
    expect(parseWeeks(undefined)).toBeNull();
    expect(parseWeeks("")).toBeNull();
    expect(parseWeeks("after last frost")).toBeNull();
  });
});

describe("PermapeopleEntrySchema", () => {
  it("defaults data to an empty array", () => {
    const parsed = PermapeopleEntrySchema.parse({
      id: 1,
      name: "Tomato",
      scientific_name: "Solanum lycopersicum",
    });
    expect(parsed.data).toEqual([]);
  });
});

describe("toPlantUpsert", () => {
  const entry = PermapeopleEntrySchema.parse({
    id: 42,
    name: "Tomato",
    scientific_name: "Solanum lycopersicum",
    data: [
      { key: "Row spacing", value: "24" },
      { key: "Days to harvest", value: "75" },
      { key: "USDA Hardiness zone", value: "5, 6, 7" },
      { key: "Sunlight", value: "Full sun" },
      { key: "Watering", value: "Keep moist" },
      { key: "Sow Indoors", value: "6-8 weeks before last frost" },
      { key: "Good Neighbours", value: "Basil, Carrot" },
      { key: "Bad Neighbours", value: "Fennel" },
    ],
  });

  it("maps catalog fields", () => {
    const row = toPlantUpsert(entry);
    expect(row).toMatchObject({
      permapeople_id: 42,
      common_name: "Tomato",
      scientific_name: "Solanum lycopersicum",
      spacing_inches: 24,
      days_to_harvest: 75,
      zones: ["5", "6", "7"],
      sun_exposure: "Full sun",
      water_needs: "Keep moist",
      sow_weeks_before_frost: 6,
      good_neighbour_names: ["Basil", "Carrot"],
      bad_neighbour_names: ["Fennel"],
    });
  });

  it("falls back to Plant spacing and nulls absent fields", () => {
    const sparse = toPlantUpsert(
      PermapeopleEntrySchema.parse({
        id: 7,
        name: "Basil",
        scientific_name: "Ocimum basilicum",
        data: [{ key: "Plant spacing", value: "10" }],
      }),
    );
    expect(sparse.spacing_inches).toBe(10);
    expect(sparse.days_to_harvest).toBeNull();
    expect(sparse.zones).toEqual([]);
    expect(sparse.water_needs).toBeNull();
    expect(sparse.good_neighbour_names).toEqual([]);
  });
});
