'use client';

import { create } from 'zustand';
import { plantFootprint, overlaps, fitsInBed } from '@garden/shared';
import { createClient } from '@/lib/supabase/client';

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
  gardenId: string | null;
  bedId: string | null;
  isDirty: boolean;
  saving: boolean;
  saveError: string | null;
  setBed(w: number, h: number): void;
  setScale(s: number): void;
  select(id: string | null): void;
  hasConflict(spacingInches: number, x: number, y: number, excludeId?: string): boolean;
  place(plant: CatalogPlant, x: number, y: number): void;
  move(instanceId: string, x: number, y: number): void;
  remove(instanceId: string): void;
  clear(): void;
  hydrate(
    gardenId: string,
    bedId: string | null,
    bed?: { widthInches: number; heightInches: number },
    placed?: PlacedPlant[],
  ): void;
  save(): Promise<void>;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useDesignerStore = create<DesignerState>()((set, get) => ({
  bed: { widthInches: 96, heightInches: 48 }, // 8 ft × 4 ft, landscape
  placed: [],
  selectedId: null,
  scale: 8,
  gardenId: null,
  bedId: null,
  isDirty: false,
  saving: false,
  saveError: null,

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
    set((s) => ({ placed: [...s.placed, instance], isDirty: true }));
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
      isDirty: true,
    }));
  },

  remove(instanceId) {
    set((s) => ({
      placed: s.placed.filter((p) => p.instanceId !== instanceId),
      selectedId: s.selectedId === instanceId ? null : s.selectedId,
      isDirty: true,
    }));
  },

  clear() {
    set({ placed: [], selectedId: null, isDirty: true });
  },

  hydrate(gardenId, bedId, bed, placed) {
    set({
      gardenId,
      bedId,
      bed: bed ?? { widthInches: 96, heightInches: 48 },
      placed: placed ?? [],
      isDirty: false,
      saving: false,
      saveError: null,
      selectedId: null,
    });
  },

  async save() {
    const { gardenId, bedId, bed, placed } = get();
    if (!gardenId) {
      set({ saveError: 'No garden selected.' });
      return;
    }
    set({ saving: true, saveError: null });
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);

      let currentBedId = bedId;

      if (!currentBedId) {
        // New bed: insert into beds
        const { data, error } = await supabase
          .from('beds')
          .insert({
            garden_id: gardenId,
            width_inches: bed.widthInches,
            height_inches: bed.heightInches,
          })
          .select('id')
          .single();
        if (error) throw error;
        currentBedId = data.id;
      } else {
        // Existing bed: update dimensions + delete old bed_plants
        const { error: updateError } = await supabase
          .from('beds')
          .update({
            width_inches: bed.widthInches,
            height_inches: bed.heightInches,
          })
          .eq('id', currentBedId);
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('bed_plants')
          .delete()
          .eq('bed_id', currentBedId);
        if (deleteError) throw deleteError;
      }

      // Bulk-insert fresh bed_plants
      if (placed.length > 0) {
        const { error: insertError } = await supabase.from('bed_plants').insert(
          placed.map((p) => ({
            bed_id: currentBedId!,
            plant_id: p.plantId,
            x_inches: p.xInches,
            y_inches: p.yInches,
            planted_date: today,
          })),
        );
        if (insertError) throw insertError;
      }

      set({ bedId: currentBedId, isDirty: false, saving: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ saveError: message, saving: false });
    }
  },
}));
