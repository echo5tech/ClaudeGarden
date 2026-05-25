import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BedDesigner } from '@/components/designer/bed-designer';
import type { CatalogPlant, PlacedPlant } from '@/components/designer/use-designer-store';

export const metadata: Metadata = {
  title: 'Bed Designer — WeGarden',
  description: 'Drag-and-drop garden bed planner with spacing validation.',
};

const COLOR_PALETTE = [
  '#ef4444',
  '#22c55e',
  '#84cc16',
  '#16a34a',
  '#f97316',
  '#eab308',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#92400e',
];

interface DesignerPageProps {
  searchParams: Promise<{ garden?: string; bed?: string }>;
}

export default async function DesignerPage(props: DesignerPageProps) {
  const sp = await props.searchParams;
  const gardenId = sp.garden ?? null;
  const bedId = sp.bed ?? null;

  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  if (!gardenId) {
    // If no garden is specified we can't save anything — redirect to home
    // so the user can pick or create a garden first.
    redirect('/');
  }

  // Fetch the public plant catalog
  const { data: plantsData } = await supabase
    .from('plants')
    .select('id, common_name, spacing_inches')
    .order('common_name');

  const catalog: CatalogPlant[] = (plantsData ?? []).map((p, i) => ({
    id: p.id,
    name: p.common_name,
    spacingInches: p.spacing_inches ?? 12,
    color: COLOR_PALETTE[i % COLOR_PALETTE.length],
  }));

  // If a bedId was supplied, load the existing bed and its plants
  let initialBed: { widthInches: number; heightInches: number } | undefined;
  let initialPlaced: PlacedPlant[] | undefined;

  if (bedId) {
    const { data: bedData } = await supabase
      .from('beds')
      .select('id, width_inches, height_inches')
      .eq('id', bedId)
      .single();

    if (bedData) {
      initialBed = {
        widthInches: bedData.width_inches,
        heightInches: bedData.height_inches,
      };

      const { data: bedPlantsData } = await supabase
        .from('bed_plants')
        .select('id, x_inches, y_inches, planted_date, plants(id, common_name, spacing_inches)')
        .eq('bed_id', bedId);

      initialPlaced = (bedPlantsData ?? []).map((bp) => {
        // plants is a single object (FK join), not an array
        const plant = Array.isArray(bp.plants) ? bp.plants[0] : bp.plants;
        // Find the catalog color for this plant
        const catalogIdx = (plantsData ?? []).findIndex((p) => p.id === plant?.id);
        const color =
          catalogIdx >= 0
            ? COLOR_PALETTE[catalogIdx % COLOR_PALETTE.length]
            : COLOR_PALETTE[0];
        return {
          instanceId: bp.id,
          plantId: plant?.id ?? '',
          name: plant?.common_name ?? '',
          spacingInches: plant?.spacing_inches ?? 12,
          xInches: Number(bp.x_inches),
          yInches: Number(bp.y_inches),
          color,
        } satisfies PlacedPlant;
      });
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <BedDesigner
        catalog={catalog}
        gardenId={gardenId!}
        bedId={bedId}
        initialBed={initialBed}
        initialPlaced={initialPlaced}
      />
    </div>
  );
}
