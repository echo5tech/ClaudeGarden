'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Loader2, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CatalogPlant,
  PlacedPlant,
  useDesignerStore,
} from './use-designer-store';
import { BedCanvas } from './bed-canvas';
import { PlantPalette } from './plant-palette';

// Shared plant-circle shape used by DragOverlay and palette tiles
function PlantCircle({
  name,
  color,
  spacingInches,
  scale,
}: {
  name: string;
  color: string;
  spacingInches: number;
  scale: number;
}) {
  const d = spacingInches * scale;
  return (
    <div
      className="rounded-full border-2 border-dashed relative pointer-events-none"
      style={{ width: d, height: d, borderColor: color + '80', backgroundColor: color + '15' }}
    >
      <div
        className="absolute inset-[22%] rounded-full flex items-center justify-center text-white font-bold shadow-sm"
        style={{ backgroundColor: color, fontSize: Math.max(9, d * 0.13) }}
      >
        {name[0]}
      </div>
    </div>
  );
}

// Safely extract clientX/Y from pointer or touch events
function getClientXY(event: Event): [number, number] {
  if (event instanceof MouseEvent) return [event.clientX, event.clientY];
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    const t = event.changedTouches[0];
    return t ? [t.clientX, t.clientY] : [0, 0];
  }
  return [0, 0];
}

export interface BedDesignerProps {
  catalog: CatalogPlant[];
  gardenId: string;
  bedId: string | null;
  initialBed?: { widthInches: number; heightInches: number };
  initialPlaced?: PlacedPlant[];
}

export function BedDesigner({
  catalog,
  gardenId,
  bedId: initialBedId,
  initialBed,
  initialPlaced,
}: BedDesignerProps) {
  const store = useDesignerStore();
  const { bed, placed, scale, setBed, setScale, place, move, clear } = store;
  const { isDirty, saving, saveError, bedId } = store;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlant, setActivePlant] = useState<CatalogPlant | PlacedPlant | null>(null);

  // Hydrate store from server-loaded data on mount
  useEffect(() => {
    store.hydrate(gardenId, initialBedId, initialBed, initialPlaced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // 250 ms hold before drag activates on touch — lets normal scroll work
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString();
    setActiveId(id);
    setActivePlant(event.active.data.current?.plant ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    const id = active.id.toString();
    setActiveId(null);
    setActivePlant(null);

    if (id.startsWith('palette-')) {
      // Drop from palette → canvas only counts if it lands on the bed
      if (over?.id !== 'bed-canvas') return;
      const plant: CatalogPlant | undefined = active.data.current?.plant;
      if (!plant) return;

      // over.rect is the bounding rect of the droppable canvas element
      const [px, py] = getClientXY(event.activatorEvent);
      place(plant, (px + delta.x - over.rect.left) / scale, (py + delta.y - over.rect.top) / scale);
    } else if (id.startsWith('placed-')) {
      const instanceId = id.replace('placed-', '');
      const p = placed.find((pl) => pl.instanceId === instanceId);
      if (!p) return;
      // Always apply delta and clamp to bed — plant can't be dropped "off" the bed
      move(instanceId, p.xInches + delta.x / scale, p.yInches + delta.y / scale);
    }
  }

  async function handleSave() {
    await store.save();
    // Re-read store state after save to check for errors
    const { saveError: err } = useDesignerStore.getState();
    if (err) {
      toast.error(`Save failed: ${err}`);
    } else {
      toast.success('Bed saved!');
    }
  }

  const widthFt = bed.widthInches / 12;
  const heightFt = bed.heightInches / 12;
  const zoomPct = Math.round((scale / 8) * 100);
  const saveDisabled = saving || (!isDirty && bedId !== null);

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white dark:bg-zinc-950 shrink-0 flex-wrap gap-y-2">
        {/* Bed dimensions */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500 shrink-0">Bed</span>
          <input
            type="number"
            min={2} max={20}
            value={widthFt}
            onChange={(e) => setBed(Math.max(2, +e.target.value) * 12, bed.heightInches)}
            className="w-12 rounded border px-1.5 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Bed width in feet"
          />
          <span className="text-zinc-400">ft ×</span>
          <input
            type="number"
            min={2} max={20}
            value={heightFt}
            onChange={(e) => setBed(bed.widthInches, Math.max(2, +e.target.value) * 12)}
            className="w-12 rounded border px-1.5 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Bed height in feet"
          />
          <span className="text-zinc-400">ft</span>
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => setScale(scale / 1.25)} aria-label="Zoom out">
            <Minus />
          </Button>
          <span className="w-11 text-center text-xs text-zinc-500 tabular-nums">{zoomPct}%</span>
          <Button variant="outline" size="icon-sm" onClick={() => setScale(scale * 1.25)} aria-label="Zoom in">
            <Plus />
          </Button>
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        <Button variant="outline" size="sm" onClick={clear} className="gap-1.5 text-zinc-500">
          <Trash2 className="size-3.5" />
          Clear
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={saveDisabled}
          className="gap-1.5"
          aria-label="Save bed"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {saving ? 'Saving…' : 'Save'}
        </Button>

        {saveError && (
          <span className="text-xs text-red-500 max-w-xs truncate" title={saveError}>
            {saveError}
          </span>
        )}

        <div className="ml-auto text-xs text-zinc-400 hidden sm:block">
          {placed.length} plant{placed.length !== 1 ? 's' : ''} placed
        </div>
      </div>

      {/* ── Main area ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <PlantPalette plants={catalog} />
          <BedCanvas draggingId={activeId} />
        </div>

        {/* Floating drag preview — centered on cursor/finger via modifier */}
        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {activePlant && (
            <PlantCircle
              name={activePlant.name}
              color={activePlant.color}
              spacingInches={activePlant.spacingInches}
              scale={scale}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
