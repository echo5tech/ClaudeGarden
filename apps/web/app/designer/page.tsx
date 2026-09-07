import Link from "next/link";
import { PageHeading, EmptyState } from "@/components/workspace/primitives";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BedDesigner } from "@/components/designer/bed-designer";
import type {
  CatalogPlant,
  PlacedPlant,
} from "@/components/designer/use-designer-store";

export const metadata: Metadata = {
  title: "Bed Designer — WeGarden",
  description: "Drag-and-drop garden bed planner with spacing validation.",
};

const COLOR_PALETTE = [
  "#ef4444",
  "#22c55e",
  "#84cc16",
  "#16a34a",
  "#f97316",
  "#eab308",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#92400e",
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
    redirect("/auth");
  }

  if (!gardenId) redirect("/gardens");
  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name")
    .eq("id", gardenId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!garden)
    return (
      <main className="page-wrap">
        <EmptyState
          title="That garden isn’t available."
          description="Choose one of your gardens to start planning."
          href="/gardens"
          action="My gardens"
        />
      </main>
    );

  // Fetch the public plant catalog
  const { data: plantsData } = await supabase
    .from("plants")
    .select("id, common_name, spacing_inches")
    .order("common_name");

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
      .from("beds")
      .select("id, width_inches, height_inches")
      .eq("id", bedId)
      .eq("garden_id", gardenId)
      .single();

    if (!bedData)
      return (
        <main className="page-wrap">
          <EmptyState
            title="That bed isn’t in this garden."
            description="Choose a garden bed to continue."
            href="/gardens"
            action="My gardens"
          />
        </main>
      );
    if (bedData) {
      initialBed = {
        widthInches: bedData.width_inches,
        heightInches: bedData.height_inches,
      };

      const { data: bedPlantsData } = await supabase
        .from("bed_plants")
        .select(
          "id, x_inches, y_inches, planted_date, plants(id, common_name, spacing_inches)",
        )
        .eq("bed_id", bedId);

      initialPlaced = (bedPlantsData ?? []).map((bp) => {
        // plants is a single object (FK join), not an array
        const plant = Array.isArray(bp.plants) ? bp.plants[0] : bp.plants;
        // Find the catalog color for this plant
        const catalogIdx = (plantsData ?? []).findIndex(
          (p) => p.id === plant?.id,
        );
        const color =
          catalogIdx >= 0
            ? COLOR_PALETTE[catalogIdx % COLOR_PALETTE.length]
            : COLOR_PALETTE[0];
        return {
          instanceId: bp.id,
          plantId: plant?.id ?? "",
          name: plant?.common_name ?? "",
          spacingInches: plant?.spacing_inches ?? 12,
          xInches: Number(bp.x_inches),
          yInches: Number(bp.y_inches),
          color,
          plantedDate: bp.planted_date,
        } satisfies PlacedPlant;
      });
    }
  }

  return (
    <main className="page-wrap designer-page">
      <Link className="text-link mb-4" href="/gardens">
        ← My gardens
      </Link>
      <PageHeading
        eyebrow="LET YOUR IDEAS TAKE ROOT"
        title={garden.name}
        description="Drag a plant onto the bed, or use its + button. Give everything a little room to grow."
      />
      <div className="designer-frame">
        <BedDesigner
          catalog={catalog}
          gardenId={gardenId!}
          bedId={bedId}
          initialBed={initialBed}
          initialPlaced={initialPlaced}
        />
      </div>
    </main>
  );
}
