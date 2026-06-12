import { describe, expect, it } from "vitest";
import { fitsInBed, overlaps, plantFootprint } from "./index";

// All measurements in inches, matching the bed designer.

describe("plantFootprint", () => {
  it("uses half the spacing as the radius", () => {
    const fp = plantFootprint(12, 10, 20);
    expect(fp).toEqual({ cx: 10, cy: 20, radiusInches: 6 });
  });
});

describe("overlaps", () => {
  it("does not overlap when circles exactly touch (strict inequality)", () => {
    const a = plantFootprint(12, 0, 0); // r = 6
    const b = plantFootprint(12, 12, 0); // r = 6, centers 12" apart
    expect(overlaps(a, b)).toBe(false);
  });

  it("overlaps when centers are closer than combined radii", () => {
    const a = plantFootprint(12, 0, 0);
    const b = plantFootprint(12, 11, 0);
    expect(overlaps(a, b)).toBe(true);
  });

  it("handles asymmetric radii", () => {
    const big = plantFootprint(24, 0, 0); // r = 12
    const small = plantFootprint(6, 14, 0); // r = 3, min dist 15
    expect(overlaps(big, small)).toBe(true);
    const farSmall = plantFootprint(6, 15, 0);
    expect(overlaps(big, farSmall)).toBe(false);
  });

  it("works on diagonals, not just axes", () => {
    const a = plantFootprint(12, 0, 0);
    const b = plantFootprint(12, 9, 9); // distance ≈ 12.73 > 12
    expect(overlaps(a, b)).toBe(false);
    const c = plantFootprint(12, 8, 8); // distance ≈ 11.31 < 12
    expect(overlaps(a, c)).toBe(true);
  });
});

describe("fitsInBed", () => {
  const bed = { width_inches: 48, height_inches: 24 };

  it("fits when touching the bed edges exactly", () => {
    expect(fitsInBed(plantFootprint(12, 6, 6), bed)).toBe(true); // left/top edge
    expect(fitsInBed(plantFootprint(12, 42, 18), bed)).toBe(true); // right/bottom edge
  });

  it("does not fit when the footprint crosses an edge", () => {
    expect(fitsInBed(plantFootprint(12, 5, 6), bed)).toBe(false); // past left
    expect(fitsInBed(plantFootprint(12, 6, 5), bed)).toBe(false); // past top
    expect(fitsInBed(plantFootprint(12, 43, 18), bed)).toBe(false); // past right
    expect(fitsInBed(plantFootprint(12, 42, 19), bed)).toBe(false); // past bottom
  });

  it("does not fit when the plant is larger than the bed", () => {
    expect(fitsInBed(plantFootprint(60, 24, 12), bed)).toBe(false);
  });
});
