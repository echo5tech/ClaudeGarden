"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Droplets, Ruler, Search, Sun } from "lucide-react";
import type { Plant, Workspace } from "@/lib/workspace/types";
import { workspacePath } from "@/lib/workspace/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, PageHeading, PlantArtwork, PlantCard } from "./primitives";
export function PlantDetailDialog({
  plant,
  onClose,
  mode,
}: {
  plant: Plant | null;
  onClose: () => void;
  mode: Workspace["mode"];
}) {
  return (
    <Dialog
      open={!!plant}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="plant-dialog">
        {plant && (
          <>
            <PlantArtwork name={plant.common_name} />
            <DialogTitle className="dialog-title">
              {plant.common_name}
            </DialogTitle>
            <DialogDescription className="italic">
              {plant.scientific_name}
            </DialogDescription>
            <div className="plant-care-facts">
              <div>
                <Sun size={19} />
                <span>Sunlight</span>
                <strong>{plant.sun_exposure ?? "Not recorded"}</strong>
              </div>
              <div>
                <Droplets size={19} />
                <span>Water needs</span>
                <strong>{plant.water_needs ?? "Not recorded"}</strong>
              </div>
              <div>
                <Ruler size={19} />
                <span>Spacing</span>
                <strong>
                  {plant.spacing_inches
                    ? `${plant.spacing_inches} inches`
                    : "Not recorded"}
                </strong>
              </div>
            </div>
            <p className="muted">
              {plant.days_to_harvest
                ? `About ${plant.days_to_harvest} days to harvest. Timing varies with your variety and growing conditions.`
                : "Explore this plant as part of your garden plan."}
            </p>
            <p className="muted">
              Growing zones: {plant.zones.join(", ") || "Not recorded"}
            </p>
            <Link
              className="button-primary full-width"
              href={workspacePath(mode, "/gardens")}
              onClick={onClose}
            >
              Choose a garden to plant in
              <ArrowRight size={16} />
            </Link>
            {mode !== "demo" && (
              <Link
                className="text-link"
                href={`/plants/${plant.id}`}
                onClick={onClose}
              >
                View the full plant profile
                <ArrowRight size={14} />
              </Link>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function LibraryScreen({
  data,
  initialQuery = "",
}: {
  data: Workspace;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("All plants");
  const [selected, setSelected] = useState<Plant | null>(null);
  const filtered = data.plants.filter(
    (p) =>
      `${p.common_name} ${p.scientific_name}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All plants" ||
        (filter === "Quick harvests"
          ? p.days_to_harvest !== null && p.days_to_harvest <= 45
          : filter === "Full sun"
            ? /full sun/i.test(p.sun_exposure ?? "")
            : /shade/i.test(p.sun_exposure ?? ""))),
  );
  return (
    <main className="page-wrap">
      <PageHeading
        eyebrow="GET TO KNOW YOUR NEXT FAVORITE"
        title="Good things are growing."
        description="Find a plant you love. Learn what it needs. Make a little space."
      />
      <div className="library-toolbar">
        <label className="search-field library-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search plants"
            placeholder="Search plants by name…"
          />
        </label>
        <span className="muted">{filtered.length} plants to explore</span>
      </div>
      <div className="filter-chips">
        {["All plants", "Quick harvests", "Full sun", "Part shade"].map(
          (label) => (
            <button
              aria-pressed={label === filter}
              className={label === filter ? "selected" : ""}
              onClick={() => setFilter(label)}
              key={label}
            >
              {label}
            </button>
          ),
        )}
      </div>
      {filtered.length ? (
        <div className="plant-grid">
          {filtered.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onSelect={() => setSelected(plant)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing growing here just yet."
          description={
            data.plants.length
              ? "Try another plant name or filter."
              : "The plant library will appear once your catalog is connected. Explore the sample garden to try it out."
          }
          href={!data.plants.length ? "/demo/plants" : undefined}
          action="Explore the sample library"
        />
      )}
      <PlantDetailDialog
        plant={selected}
        onClose={() => setSelected(null)}
        mode={data.mode}
      />
    </main>
  );
}
