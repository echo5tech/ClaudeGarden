"use client";

import {
  readDemoBed,
  DEMO_BED_REVISION,
  DEMO_CHANGE_EVENT,
} from "@/lib/workspace/demo-bed";
import { create } from "zustand";
import { plantFootprint, overlaps, fitsInBed } from "@garden/shared";
import { createClient } from "@/lib/supabase/client";

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
  plantedDate?: string;
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
  persistedPlantIds: string[];
  setBed(w: number, h: number): void;
  setScale(s: number): void;
  select(id: string | null): void;
  hasConflict(
    spacingInches: number,
    x: number,
    y: number,
    excludeId?: string,
  ): boolean;
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

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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
  persistedPlantIds: [],

  setBed(w, h) {
    if (get().saving || !Number.isFinite(w) || !Number.isFinite(h)) return;
    const width = clamp(w, 24, 240),
      height = clamp(h, 24, 240);
    if (
      get().placed.some(
        (p) =>
          !fitsInBed(plantFootprint(p.spacingInches, p.xInches, p.yInches), {
            width_inches: width,
            height_inches: height,
          }),
      )
    ) {
      set({ saveError: "Move plants inside the smaller bed before resizing." });
      return;
    }
    set({
      bed: { widthInches: width, heightInches: height },
      isDirty: true,
      saveError: null,
    });
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
    if (
      !fitsInBed(fp, {
        width_inches: bed.widthInches,
        height_inches: bed.heightInches,
      })
    )
      return true;
    return placed.some((p) => {
      if (p.instanceId === excludeId) return false;
      return overlaps(
        fp,
        plantFootprint(p.spacingInches, p.xInches, p.yInches),
      );
    });
  },

  place(plant, x, y) {
    if (get().saving) return;
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
    if (get().saving) return;
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
    if (get().saving) return;
    set((s) => ({
      placed: s.placed.filter((p) => p.instanceId !== instanceId),
      selectedId: s.selectedId === instanceId ? null : s.selectedId,
      isDirty: true,
    }));
  },

  clear() {
    if (get().saving) return;
    set({ placed: [], selectedId: null, isDirty: true });
  },

  hydrate(gardenId, bedId, bed, placed) {
    let saveError: string | null = null;
    if (gardenId.startsWith("demo-")) {
      try {
        const saved = readDemoBed(gardenId, bedId);
        if (saved) {
          bed = saved.bed;
          placed = saved.placed;
        }
      } catch {
        saveError =
          "The saved sample draft could not be loaded. Showing the starting layout.";
      }
    }
    set({
      gardenId,
      bedId,
      bed: bed ?? { widthInches: 96, heightInches: 48 },
      placed: placed ?? [],
      isDirty: false,
      saving: false,
      saveError,
      persistedPlantIds: (placed ?? []).map((p) => p.instanceId),
      selectedId: null,
    });
  },

  async save() {
    const { gardenId, bedId, bed, placed, persistedPlantIds, saving } = get();
    if (saving) return;
    if (!gardenId) {
      set({ saveError: "No garden selected." });
      return;
    }
    if (
      placed.some((p) =>
        get().hasConflict(p.spacingInches, p.xInches, p.yInches, p.instanceId),
      )
    ) {
      set({
        saveError: "Give the highlighted plants more room before saving.",
      });
      return;
    }
    set({ saving: true, saveError: null });
    try {
      if (gardenId.startsWith("demo-")) {
        localStorage.setItem(
          `wegarden-demo-bed:${gardenId}:${bedId ?? "new"}`,
          JSON.stringify({ version: 1, bed, placed }),
        );
        localStorage.setItem(DEMO_BED_REVISION, String(Date.now()));
        window.dispatchEvent(new Event(DEMO_CHANGE_EVENT));
        set({ isDirty: false, saving: false });
        return;
      }
      const supabase = createClient();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      let currentBedId = bedId;
      if (!currentBedId) {
        const { data, error } = await supabase
          .from("beds")
          .insert({
            garden_id: gardenId,
            width_inches: bed.widthInches,
            height_inches: bed.heightInches,
          })
          .select("id")
          .single();
        if (error) throw error;
        currentBedId = data.id;
        // Retain the new ID immediately so a retry cannot create a duplicate bed.
        set({ bedId: currentBedId });
      } else {
        const { error } = await supabase
          .from("beds")
          .update({
            width_inches: bed.widthInches,
            height_inches: bed.heightInches,
          })
          .eq("id", currentBedId)
          .eq("garden_id", gardenId);
        if (error) throw error;
      }
      // Preserve plant IDs and planting dates, and thus existing care tasks.
      if (placed.length) {
        const { error } = await supabase.from("bed_plants").upsert(
          placed.map((p) => ({
            id: p.instanceId,
            bed_id: currentBedId!,
            plant_id: p.plantId,
            x_inches: p.xInches,
            y_inches: p.yInches,
            planted_date: p.plantedDate === undefined ? today : p.plantedDate,
          })),
        );
        if (error) throw error;
      }
      const removed = persistedPlantIds.filter(
        (id) => !placed.some((p) => p.instanceId === id),
      );
      if (removed.length) {
        const { error } = await supabase
          .from("bed_plants")
          .delete()
          .eq("bed_id", currentBedId)
          .in("id", removed);
        if (error) throw error;
      }
      set({
        persistedPlantIds: placed.map((p) => p.instanceId),
        placed: placed.map((p) => ({
          ...p,
          plantedDate: p.plantedDate === undefined ? today : p.plantedDate,
        })),
        isDirty: false,
        saving: false,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Could not save. Please try again.";
      set({ saveError: message, saving: false });
    }
  },
}));
