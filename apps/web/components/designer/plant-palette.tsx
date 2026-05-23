'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { CatalogPlant } from './use-designer-store';

function PaletteTile({ plant }: { plant: CatalogPlant }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.id}`,
    data: { plant },
  });

  const spacingLabel =
    plant.spacingInches < 12
      ? `${plant.spacingInches}″`
      : `${plant.spacingInches / 12}ft`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing',
        'select-none transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800',
        isDragging && 'opacity-40',
      )}
      style={{ touchAction: 'none' }}
    >
      <div
        className="size-8 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
        style={{ backgroundColor: plant.color }}
      >
        {plant.name[0]}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{plant.name}</p>
        <p className="text-xs text-zinc-400 leading-tight">{spacingLabel} spacing</p>
      </div>
    </div>
  );
}

export function PlantPalette({ plants }: { plants: CatalogPlant[] }) {
  return (
    <aside className="w-52 shrink-0 border-r bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Plants
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">Drag onto the bed</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {plants.map((plant) => (
          <PaletteTile key={plant.id} plant={plant} />
        ))}
      </div>
    </aside>
  );
}
