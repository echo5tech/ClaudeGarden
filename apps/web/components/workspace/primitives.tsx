import Link from "next/link";
import {
  ArrowRight,
  Flower2,
  Leaf,
  LockKeyhole,
  Sprout,
  Sun,
} from "lucide-react";
import type { Garden, Plant, Workspace } from "@/lib/workspace/types";
import { workspacePath } from "@/lib/workspace/types";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionHeading({
  title,
  href,
  action = "View all",
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {href && (
        <Link href={href}>
          {action}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Sprout size={30} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Link className="button-primary" href={href}>
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function plantTone(name: string) {
  if (/tomato|radish/i.test(name)) return "clay";
  if (/carrot|marigold|sunflower/i.test(name)) return "gold";
  if (/kale|rosemary/i.test(name)) return "forest";
  return "sage";
}
export function PlantArtwork({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const Icon = /flower|marigold/i.test(name)
    ? Flower2
    : /basil|kale|lettuce|rosemary/i.test(name)
      ? Leaf
      : Sprout;
  return (
    <div
      aria-hidden="true"
      className={`plant-art tone-${plantTone(name)} ${small ? "is-small" : ""}`}
    >
      <span className="plant-art-orbit" />
      <Icon strokeWidth={1.1} />
      <span className="plant-art-speck one" />
      <span className="plant-art-speck two" />
    </div>
  );
}
export function PlantCard({
  plant,
  onSelect,
}: {
  plant: Plant;
  onSelect: () => void;
}) {
  return (
    <button className="plant-card" onClick={onSelect}>
      <PlantArtwork name={plant.common_name} />
      <div className="plant-card-body">
        <span className="plant-card-kicker">
          <Sun size={12} />
          {plant.sun_exposure ?? "Explore growing details"}
        </span>
        <h3>{plant.common_name}</h3>
        <p>{plant.scientific_name}</p>
        <div className="plant-card-footer">
          <span>
            {plant.days_to_harvest
              ? `About ${plant.days_to_harvest} days to harvest`
              : "Explore plant details"}
          </span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}
export function GardenCard({
  garden,
  mode,
  onDelete,
}: {
  garden: Garden;
  mode: Workspace["mode"];
  onDelete?: () => void;
}) {
  const plantCount = garden.beds.reduce(
    (n, bed) => n + bed.bed_plants.length,
    0,
  );
  const base = workspacePath(mode, "/designer");
  const query = new URLSearchParams({
    garden: garden.id,
    ...(garden.beds[0] ? { bed: garden.beds[0].id } : {}),
  });
  return (
    <article className="garden-card">
      <Link
        href={`${base}?${query}`}
        className="garden-card-link"
        aria-label={`Open ${garden.name}`}
      >
        <div className="garden-preview" aria-hidden="true">
          <span className="preview-label">
            {garden.beds.length ? "BED OVERVIEW" : "YOUR NEXT CHAPTER"}
          </span>
          <div className={`mini-bed ${plantCount ? "" : "is-empty"}`}>
            {Array.from(
              { length: Math.min(plantCount, 18) || 8 },
              (_, index) => (
                <span key={index} className={`mini-plant plant-${index % 4}`}>
                  {plantCount ? <Leaf size={23} strokeWidth={1.2} /> : <span />}
                </span>
              ),
            )}
          </div>
          <span className="preview-dimensions">
            {garden.beds[0]
              ? `${garden.beds[0].width_inches / 12} × ${garden.beds[0].height_inches / 12} ft · first bed`
              : "Ready for your first bed"}
          </span>
        </div>
        <div className="garden-card-body">
          <div className="garden-name-row">
            <h3>{garden.name}</h3>
            <ArrowRight size={17} />
          </div>
          <p>
            {garden.beds.length} {garden.beds.length === 1 ? "bed" : "beds"}
            <span>·</span>
            {plantCount} {plantCount === 1 ? "plant" : "plants"}
            <span className="garden-privacy">
              <LockKeyhole size={11} />
              {garden.visibility}
            </span>
          </p>
        </div>
      </Link>
      {onDelete && (
        <div className="garden-card-actions">
          <div>
            {garden.beds.map((bed, index) => (
              <Link
                key={bed.id}
                href={`${base}?${new URLSearchParams({ garden: garden.id, bed: bed.id })}`}
              >
                Bed {index + 1}
              </Link>
            ))}
            {(mode !== "demo" || !garden.beds.length) && (
              <Link href={`${base}?garden=${garden.id}`}>+ Add bed</Link>
            )}
          </div>
          <button onClick={onDelete} aria-label={`Delete ${garden.name}`}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
