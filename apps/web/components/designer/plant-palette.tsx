"use client";

import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useDesignerStore } from "./use-designer-store";
import { cn } from "@/lib/utils";
import type { CatalogPlant } from "./use-designer-store";

function PaletteTile({ plant }: { plant: CatalogPlant }) {
  const saving = useDesignerStore((state) => state.saving);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.id}`,
    data: { plant },
  });

  const spacingLabel =
    plant.spacingInches < 12
      ? `${plant.spacingInches}″`
      : `${plant.spacingInches / 12}ft`;

  return (
    <div className="palette-tile flex items-center gap-1">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={cn(
          "min-w-0 flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing",
          "select-none transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800",
          isDragging && "opacity-40",
        )}
        style={{ touchAction: "none" }}
      >
        <div
          className="plant-initial size-8 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
          style={{ backgroundColor: plant.color }}
        >
          {plant.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">
            {plant.name}
          </p>
          <p className="text-xs text-zinc-400 leading-tight">
            {spacingLabel} spacing
          </p>
        </div>
      </div>
      <button
        disabled={saving}
        className="palette-add icon-button"
        aria-label={`Add ${plant.name} to bed`}
        onClick={() => {
          const store = useDesignerStore.getState();
          const radius = plant.spacingInches / 2;
          for (let y = radius; y <= store.bed.heightInches - radius; y += 6) {
            for (let x = radius; x <= store.bed.widthInches - radius; x += 6) {
              if (!store.hasConflict(plant.spacingInches, x, y)) {
                store.place(plant, x, y);
                toast.success(`${plant.name} added to the bed.`);
                return;
              }
            }
          }
          toast.error(
            "This plant needs more space. Move a plant or enlarge the bed.",
          );
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function PlantPalette({ plants }: { plants: CatalogPlant[] }) {
  const [query, setQuery] = useState("");
  return (
    <aside className="designer-palette shrink-0 border-r bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Plants
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">Drag or use + to add</p>
        <label className="flex items-center gap-1 mt-3 border rounded px-2 py-1">
          <Search size={12} />
          <input
            className="w-full min-w-0 text-xs outline-none"
            aria-label="Search designer plants"
            placeholder="Find plants"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {plants
          .filter((plant) =>
            plant.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((plant) => (
            <PaletteTile key={plant.id} plant={plant} />
          ))}
      </div>
    </aside>
  );
}
