import { describe, expect, it } from "vitest";
import {
  daysUntilLastFrost,
  isSafeToTransplant,
  nextLastFrostDate,
  ZONE_LAST_FROST_MMDD,
  type FrostWindow,
} from "./index";

const window: FrostWindow = {
  lastFrost: new Date("2026-04-15"),
  firstFrost: new Date("2026-10-15"),
};

describe("isSafeToTransplant", () => {
  it("is safe on the last-frost date itself (inclusive)", () => {
    expect(isSafeToTransplant(new Date("2026-04-15"), window)).toBe(true);
  });

  it("is unsafe the day before last frost", () => {
    expect(isSafeToTransplant(new Date("2026-04-14"), window)).toBe(false);
  });

  it("is unsafe on the first-frost date (exclusive)", () => {
    expect(isSafeToTransplant(new Date("2026-10-15"), window)).toBe(false);
  });

  it("is safe mid-season", () => {
    expect(isSafeToTransplant(new Date("2026-07-01"), window)).toBe(true);
  });
});

describe("daysUntilLastFrost", () => {
  it("counts whole days remaining", () => {
    expect(daysUntilLastFrost(new Date("2026-04-10"), window)).toBe(5);
  });

  it("returns 0 on the last-frost date", () => {
    expect(daysUntilLastFrost(new Date("2026-04-15"), window)).toBe(0);
  });

  it("goes negative after the last frost has passed", () => {
    expect(daysUntilLastFrost(new Date("2026-04-20"), window)).toBe(-5);
  });

  it("rounds partial days up", () => {
    const halfDayBefore = new Date(window.lastFrost.getTime() - 43_200_000);
    expect(daysUntilLastFrost(halfDayBefore, window)).toBe(1);
  });
});

describe("nextLastFrostDate", () => {
  it("returns this year's date when it is still ahead", () => {
    expect(nextLastFrostDate("6a", new Date("2026-01-01"))).toBe("2026-03-15");
  });

  it("rolls over to next year when this year's date has passed", () => {
    expect(nextLastFrostDate("6a", new Date("2026-06-12"))).toBe("2027-03-15");
  });

  it("returns today when today is exactly the frost date", () => {
    expect(nextLastFrostDate("6a", new Date("2026-03-15"))).toBe("2026-03-15");
  });

  it("returns null for frost-free zones", () => {
    expect(nextLastFrostDate("10a", new Date("2026-06-12"))).toBeNull();
  });

  it("returns null for unknown zones", () => {
    expect(nextLastFrostDate("99z", new Date("2026-06-12"))).toBeNull();
  });

  it("produces a valid YYYY-MM-DD for every frosty zone", () => {
    const today = new Date("2026-06-12");
    for (const [zone, mmdd] of Object.entries(ZONE_LAST_FROST_MMDD)) {
      const result = nextLastFrostDate(zone, today);
      if (mmdd == null) {
        expect(result).toBeNull();
      } else {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result! >= "2026-06-12").toBe(true);
      }
    }
  });
});
