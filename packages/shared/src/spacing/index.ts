// Plant footprint and collision logic for the bed designer (web).
// Used in the drag-and-drop layer to enforce spacing rules at drop time.

export interface Footprint {
  cx: number;
  cy: number;
  radiusInches: number;
}

export function plantFootprint(
  spacingInches: number,
  x: number,
  y: number,
): Footprint {
  return { cx: x, cy: y, radiusInches: spacingInches / 2 };
}

export function overlaps(a: Footprint, b: Footprint): boolean {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  const minDist = a.radiusInches + b.radiusInches;
  return dx * dx + dy * dy < minDist * minDist;
}

export function fitsInBed(
  fp: Footprint,
  bed: { width_inches: number; height_inches: number },
): boolean {
  return (
    fp.cx - fp.radiusInches >= 0 &&
    fp.cy - fp.radiusInches >= 0 &&
    fp.cx + fp.radiusInches <= bed.width_inches &&
    fp.cy + fp.radiusInches <= bed.height_inches
  );
}
