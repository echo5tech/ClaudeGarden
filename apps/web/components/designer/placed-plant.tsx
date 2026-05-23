'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PlacedPlant } from './use-designer-store';

interface Props {
  plant: PlacedPlant;
  scale: number;
  isSelected: boolean;
  isConflict: boolean;
  isDragging: boolean;
  onSelect(): void;
  onRemove(): void;
}

export function PlacedPlantToken({
  plant,
  scale,
  isSelected,
  isConflict,
  isDragging,
  onSelect,
  onRemove,
}: Props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `placed-${plant.instanceId}`,
    data: { plant },
  });

  const diameter = plant.spacingInches * scale;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-0',
      )}
      style={{
        left: (plant.xInches - plant.spacingInches / 2) * scale,
        top: (plant.yInches - plant.spacingInches / 2) * scale,
        width: diameter,
        height: diameter,
        touchAction: 'none',
        zIndex: isSelected ? 10 : 1,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      {...listeners}
      {...attributes}
    >
      {/* Spacing ring — shows the required clearance radius */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-dashed transition-colors',
          isConflict
            ? 'border-red-500 bg-red-100/50'
            : 'bg-white/10',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
        )}
        style={{ borderColor: isConflict ? undefined : plant.color + '60' }}
      />
      {/* Plant dot */}
      <div
        className="absolute inset-[22%] rounded-full flex items-center justify-center select-none shadow-sm"
        style={{ backgroundColor: plant.color }}
      >
        <span
          className="text-white font-bold leading-none"
          style={{ fontSize: Math.max(9, diameter * 0.13) }}
        >
          {plant.name[0]}
        </span>
      </div>
      {/* Delete button — appears on selection */}
      {isSelected && (
        <button
          className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center shadow hover:bg-red-600 transition-colors"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${plant.name}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
