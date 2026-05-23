'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useDesignerStore } from './use-designer-store';
import { PlacedPlantToken } from './placed-plant';

interface BedCanvasProps {
  draggingId: string | null;
}

export function BedCanvas({ draggingId }: BedCanvasProps) {
  const { bed, placed, selectedId, scale, select, remove, hasConflict } =
    useDesignerStore();

  const { setNodeRef, isOver } = useDroppable({ id: 'bed-canvas' });

  const canvasW = bed.widthInches * scale;
  const canvasH = bed.heightInches * scale;

  // CSS grid pattern: minor lines every 6″, major lines every 12″ (1 ft)
  const minor = 6 * scale;
  const major = 12 * scale;
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right,  rgba(0,0,0,0.06) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px),
      linear-gradient(to right,  rgba(0,0,0,0.14) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.14) 1px, transparent 1px)
    `,
    backgroundSize: `${minor}px ${minor}px, ${minor}px ${minor}px, ${major}px ${major}px, ${major}px ${major}px`,
  };

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 bg-zinc-100 dark:bg-zinc-900">
      {/* The droppable canvas */}
      <div
        ref={setNodeRef}
        className={cn(
          'relative rounded-sm border-4 border-amber-800 dark:border-amber-700',
          'bg-green-50 dark:bg-green-950 shadow-inner transition-colors',
          isOver && 'border-blue-500 dark:border-blue-400',
        )}
        style={{ width: canvasW, height: canvasH, ...gridStyle }}
        onClick={() => select(null)}
      >
        {placed.map((p) => (
          <PlacedPlantToken
            key={p.instanceId}
            plant={p}
            scale={scale}
            isSelected={selectedId === p.instanceId}
            isDragging={draggingId === `placed-${p.instanceId}`}
            isConflict={hasConflict(p.spacingInches, p.xInches, p.yInches, p.instanceId)}
            onSelect={() => select(p.instanceId)}
            onRemove={() => remove(p.instanceId)}
          />
        ))}
      </div>

      <p className="text-xs text-zinc-400 mt-3 select-none text-center">
        {bed.widthInches / 12}&thinsp;ft&thinsp;×&thinsp;{bed.heightInches / 12}&thinsp;ft
        &ensp;·&ensp;
        {placed.length} plant{placed.length !== 1 ? 's' : ''}
        {placed.length > 0 && ' · tap a plant to select, then × to remove'}
      </p>
    </div>
  );
}
