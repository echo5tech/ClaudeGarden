import { describe, expect, it } from "vitest";
import {
  BedPlantSchema,
  BedSchema,
  HardinessZoneSchema,
  PostSchema,
  ZipSchema,
} from "./index";

describe("HardinessZoneSchema", () => {
  it.each(["1a", "7b", "10a", "13b"])("accepts %s", (zone) => {
    expect(HardinessZoneSchema.safeParse(zone).success).toBe(true);
  });

  it.each(["0a", "14a", "7c", "7", "a7", "7A "])("rejects %s", (zone) => {
    expect(HardinessZoneSchema.safeParse(zone).success).toBe(false);
  });
});

describe("ZipSchema", () => {
  it("accepts 5-digit and zip+4", () => {
    expect(ZipSchema.safeParse("94103").success).toBe(true);
    expect(ZipSchema.safeParse("94103-1234").success).toBe(true);
  });

  it("rejects malformed zips", () => {
    expect(ZipSchema.safeParse("9410").success).toBe(false);
    expect(ZipSchema.safeParse("94103-12").success).toBe(false);
    expect(ZipSchema.safeParse("ABCDE").success).toBe(false);
  });
});

describe("BedSchema", () => {
  const base = {
    garden_id: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    width_inches: 96,
    height_inches: 48,
  };

  it("accepts a typical bed", () => {
    expect(BedSchema.safeParse(base).success).toBe(true);
  });

  it("rejects dimensions over 600 inches or non-positive", () => {
    expect(BedSchema.safeParse({ ...base, width_inches: 601 }).success).toBe(false);
    expect(BedSchema.safeParse({ ...base, height_inches: 0 }).success).toBe(false);
  });

  it("rejects a non-uuid garden id", () => {
    expect(BedSchema.safeParse({ ...base, garden_id: "not-a-uuid" }).success).toBe(false);
  });
});

describe("BedPlantSchema", () => {
  const base = {
    bed_id: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    plant_id: "6f9619ff-8b86-4d01-b42d-00cf4fc964fe",
    x_inches: 12.5,
    y_inches: 0,
    planted_date: "2026-07-05",
  };

  it("accepts a valid placement", () => {
    expect(BedPlantSchema.safeParse(base).success).toBe(true);
  });

  it("rejects negative coordinates and malformed dates", () => {
    expect(BedPlantSchema.safeParse({ ...base, x_inches: -1 }).success).toBe(false);
    expect(BedPlantSchema.safeParse({ ...base, planted_date: "07/05/2026" }).success).toBe(false);
  });
});

describe("PostSchema", () => {
  const base = {
    garden_id: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    image_url: null,
    body: "First tomatoes of the season!",
  };

  it("accepts a text post and an image post", () => {
    expect(PostSchema.safeParse(base).success).toBe(true);
    expect(
      PostSchema.safeParse({ ...base, image_url: "https://example.com/p.jpg" }).success,
    ).toBe(true);
  });

  it("rejects bodies over 2000 chars and non-url images", () => {
    expect(PostSchema.safeParse({ ...base, body: "x".repeat(2001) }).success).toBe(false);
    expect(PostSchema.safeParse({ ...base, image_url: "not-a-url" }).success).toBe(false);
  });
});
