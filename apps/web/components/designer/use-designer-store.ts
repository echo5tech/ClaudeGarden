'use client';

import { create } from 'zustand';
import { plantFootprint, overlaps, fitsInBed } from '@garden/shared';

export interface CatalogPlant {
  id: string;
  name: string;
  spacingInches: number;
  color: string;
}

export interface PlacedPlant {
  instanceId: string;
  plantId: string;
  name: string;
  spacingInches: number;
  xInches: number; // center x
  yInches: number; // center y
  color: string;
}

interface DesignerState {
  bed: { widthInches: number; heightInches: number };
  placed: PlacedPlant[];
  selectedId: string | null;
  scale: number; // px per inch
  setBed(w: number, h: number): void;
  setScale(s: number): void;
  select(id: string | null): void;
  hasConflict(spacingInches: number, x: number, y: number, excludeId?: string): boolean;
  place(plant: CatalogPlant, x: number, y: number): void;
  move(instanceId: string, x: number, y: number): void;
  remove(instanceId: string): void;
  clear(): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useDesignerStore = create<DesignerState>()((set, get) => ({
  bed: { widthInches: 96, heightInches: 48 }, // 8 ft × 4 ft, landscape
  placed: [],
  selectedId: null,
  scale: 8,

  setBed(w, h) {
    set({ bed: { widthInches: w, heightInches: h } });
  },

  setScale(s) {
    set({ scale: clamp(s, 4, 24) });
  },

  select(id) {
    set({ selectedId: id });
  },

  hasConflict(spacingInches, x, y, excludeId) {
    const { bed, placed } = get();
    const fp = plantFootprint(spacingInches, x, y);
    if (!fitsInBed(fp, { width_inches: bed.widthInches, height_inches: bed.heightInches })) return true;
    return placed.some((p) => {
      if (p.instanceId === excludeId) return false;
      return overlaps(fp, plantFootprint(p.spacingInches, p.xInches, p.yInches));
    });
  },

  place(plant, x, y) {
    const { bed } = get();
    const r = plant.spacingInches / 2;
    const instance: PlacedPlant = {
      instanceId: crypto.randomUUID(),
      plantId: plant.id,
      name: plant.name,
      spacingInches: plant.spacingInches,
      xInches: clamp(x, r, bed.widthInches - r),
      yInches: clamp(y, r, bed.heightInches - r),
      color: plant.color,
    };
    set((s) => ({ placed: [...s.placed, instance] }));
  },

  move(instanceId, x, y) {
    set((s) => ({
      placed: s.placed.map((p) => {
        if (p.instanceId !== instanceId) return p;
        const r = p.spacingInches / 2;
        return {
          ...p,
          xInches: clamp(x, r, s.bed.widthInches - r),
          yInches: clamp(y, r, s.bed.heightInches - r),
        };
      }),
    }));
  },

  remove(instanceId) {
    set((s) => ({
      placed: s.placed.filter((p) => p.instanceId !== instanceId),
      selectedId: s.selectedId === instanceId ? null : s.selectedId,
    }));
  },

  clear() {
    set({ placed: [], selectedId: null });
  },
}));

export const DEMO_CATALOG: CatalogPlant[] = [
  { id: 'tomato',    name: 'Tomato',      spacingInches: 24, color: '#ef4444' },
  { id: 'basil',     name: 'Basil',       spacingInches: 12, color: '#22c55e' },
  { id: 'zucchini',  name: 'Zucchini',    spacingInches: 36, color: '#84cc16' },
  { id: 'kale',      name: 'Kale',        spacingInches: 18, color: '#16a34a' },
  { id: 'carrot',    name: 'Carrot',      spacingInches: 3,  color: '#f97316' },
  { id: 'sunflower', name: 'Sunflower',   spacingInches: 18, color: '#eab308' },
  { id: 'pepper',    name: 'Bell Pepper', spacingInches: 18, color: '#dc2626' },
  { id: 'lettuce',   name: 'Lettuce',     spacingInches: 12, color: '#4ade80' },
  { id: 'cucumber',  name: 'Cucumber',    spacingInches: 12, color: '#6ee7b7' },
  { id: 'beans',     name: 'Bush Beans',  spacingInches: 6,  color: '#92400e' },
];
