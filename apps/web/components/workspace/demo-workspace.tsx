"use client";
import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import type { Workspace, Garden } from "@/lib/workspace/types";
import { Dashboard } from "./dashboard";
import { GardensScreen } from "./gardens";
import { LibraryScreen } from "./library";
import { TasksScreen } from "./tasks";
import { CalendarScreen } from "./calendar";
import { EmptyState, GardenCard, PageHeading } from "./primitives";
import dynamic from "next/dynamic";
import { readDemoBed, DEMO_BED_REVISION } from "@/lib/workspace/demo-bed";
const BedDesigner = dynamic(
  () =>
    import("@/components/designer/bed-designer").then(
      (module) => module.BedDesigner,
    ),
  {
    loading: () => <p className="p-6 muted">Getting your garden bed ready…</p>,
  },
);

const STORAGE_KEY = "wegarden-demo-v1";
const CHANGE_EVENT = "wegarden-demo-change";
const editSchema = z.object({
  version: z.literal(1),
  removed: z.array(z.string().startsWith("demo-")).default([]),
  done: z.record(z.string(), z.boolean()),
  gardens: z.array(
    z.object({
      id: z.string().startsWith("demo-"),
      name: z.string().min(1).max(80),
      visibility: z.enum(["private", "public"]),
      beds: z.array(z.never()),
    }),
  ),
  name: z.string().max(80).optional(),
  zone: z.string().max(3).optional(),
});
type Edits = z.infer<typeof editSchema>;
const emptyEdits: Edits = { version: 1, removed: [], done: {}, gardens: [] };
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
function snapshot() {
  try {
    return JSON.stringify([
      localStorage.getItem(STORAGE_KEY),
      localStorage.getItem(DEMO_BED_REVISION),
    ]);
  } catch {
    return null;
  }
}
function writeEdits(edits: Edits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    toast.error(
      "Browser storage is unavailable. Your change has not been saved.",
    );
    return false;
  }
}
export function DemoWorkspace({
  initial,
  view,
  query,
  gardenId,
  bedId,
}: {
  initial: Workspace;
  view: string;
  query: string;
  gardenId?: string;
  bedId?: string;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const edits = useMemo(() => {
    try {
      return editSchema.parse(
        JSON.parse((JSON.parse(raw ?? "[null]") as [string | null])[0] ?? "{}"),
      );
    } catch {
      return emptyEdits;
    }
  }, [raw]);
  const data: Workspace = {
    ...initial,
    name: edits.name ?? initial.name,
    zone: edits.zone ?? initial.zone,
    gardens: [...edits.gardens, ...initial.gardens]
      .filter((g) => !edits.removed.includes(g.id))
      .map((garden) => {
        if (!raw) return garden;
        try {
          const keys = garden.beds.length
            ? garden.beds.map((b) => b.id)
            : [null];
          return {
            ...garden,
            beds: keys.flatMap((id) => {
              const saved = readDemoBed(garden.id, id);
              if (saved)
                return [
                  {
                    id: id ?? "new",
                    width_inches: saved.bed.widthInches,
                    height_inches: saved.bed.heightInches,
                    bed_plants: saved.placed.map((p) => ({
                      id: p.instanceId,
                      plant_id: p.plantId,
                    })),
                  },
                ];
              return garden.beds.filter((b) => b.id === id);
            }),
          };
        } catch {
          return garden;
        }
      }),
    tasks: initial.tasks
      .filter(
        (task) =>
          !initial.gardens.some(
            (g) => edits.removed.includes(g.id) && g.name === task.gardenName,
          ),
      )
      .map((t) => ({
        ...t,
        status:
          t.id in edits.done
            ? edits.done[t.id]
              ? "done"
              : "pending"
            : t.status,
      })),
  };
  const toggle = async (id: string, done: boolean) =>
    writeEdits({ ...edits, done: { ...edits.done, [id]: done } });
  const create = async (
    name: string,
    visibility: string,
  ): Promise<Garden | null> => {
    const garden = {
      id: `demo-${crypto.randomUUID()}`,
      name,
      visibility:
        visibility === "public" ? ("public" as const) : ("private" as const),
      beds: [] as never[],
    };
    return writeEdits({ ...edits, gardens: [garden, ...edits.gardens] })
      ? garden
      : null;
  };
  if (view === "gardens")
    return (
      <GardensScreen
        data={data}
        onCreate={create}
        onDelete={async (id) =>
          writeEdits({ ...edits, removed: [...edits.removed, id] })
        }
      />
    );
  if (view === "plants")
    return <LibraryScreen key={query} data={data} initialQuery={query} />;
  if (view === "tasks") return <TasksScreen data={data} onToggle={toggle} />;
  if (view === "calendar")
    return <CalendarScreen data={data} onToggle={toggle} />;
  if (view === "designer") {
    const garden =
      data.gardens.find((g) => g.id === gardenId) ?? data.gardens[0];
    if (!garden)
      return (
        <main className="page-wrap">
          <EmptyState
            title="First, a space to grow."
            description="Create a garden before designing its first bed."
            href="/demo/gardens"
            action="My gardens"
          />
        </main>
      );
    const bed = garden.beds.find((b) => b.id === bedId) ?? garden.beds[0];
    return (
      <main className="page-wrap designer-page">
        <PageHeading
          eyebrow="LET YOUR IDEAS TAKE ROOT"
          title={garden.name}
          description="Drag a plant onto the bed, or use its + button. Dimensions and spacing are in inches."
        />
        <div className="designer-frame">
          <BedDesigner
            key={`${garden.id}:${bed?.id ?? "new"}`}
            catalog={data.plants.map((p, i) => ({
              id: p.id,
              name: p.common_name,
              spacingInches: p.spacing_inches ?? 12,
              color: ["#97694e", "#708a57", "#35594c", "#c6a153"][i % 4],
            }))}
            gardenId={garden.id}
            bedId={bed?.id ?? null}
            initialBed={
              bed
                ? {
                    widthInches: bed.width_inches,
                    heightInches: bed.height_inches,
                  }
                : undefined
            }
            initialPlaced={bed?.bed_plants.map((bp, i) => {
              const plant =
                data.plants.find((p) => p.id === bp.plant_id) ?? data.plants[1];
              const columns = garden.id === "demo-herbs" ? 3 : 6;
              return {
                instanceId: bp.id,
                plantId: plant.id,
                name: plant.common_name,
                spacingInches: plant.spacing_inches ?? 12,
                xInches: 9 + (i % columns) * 15,
                yInches: 9 + Math.floor(i / columns) * 18,
                color: ["#97694e", "#708a57", "#35594c", "#c6a153"][i % 4],
              };
            })}
          />
        </div>
      </main>
    );
  }
  if (view === "explore")
    return (
      <main className="page-wrap">
        <PageHeading
          eyebrow="INSPIRATION GROWS HERE"
          title="Good things grow together."
          description="A look at two sample spaces. Real community gardens appear when you sign in."
        />
        <div className="garden-grid">
          {initial.gardens.map((g) => (
            <GardenCard
              key={g.id}
              garden={{ ...g, visibility: "sample" }}
              mode="demo"
            />
          ))}
        </div>
        <div className="quiet-note">
          These are example layouts, not posts from real gardeners.
        </div>
        <Link className="button-primary" href="/auth">
          Join the growing community
          <ArrowRight size={16} />
        </Link>
      </main>
    );
  if (view === "botanist")
    return (
      <main className="page-wrap">
        <PageHeading
          eyebrow="A HELPING HAND"
          title="A question taking root?"
          description="Bring your garden questions to your personal botanist."
        />
        <div className="botanist-welcome paper-card">
          <Sparkles size={40} strokeWidth={1.2} />
          <h2>Let’s talk plants.</h2>
          <p>
            The live botanist connects to your account and garden context. Sign
            in to ask a question, or explore growing details in the sample plant
            library.
          </p>
          <Link href="/auth" className="button-primary">
            Sign in to ask the botanist
            <ArrowRight size={16} />
          </Link>
          <Link href="/demo/plants" className="text-link">
            Explore the plant library
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  if (view === "settings")
    return (
      <main className="page-wrap narrow-page">
        <PageHeading
          eyebrow="MAKE YOURSELF AT HOME"
          title="Your growing space"
          description="These settings only change this sample garden in your browser."
        />
        <form
          className="paper-card settings-demo garden-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (
              writeEdits({
                ...edits,
                name: String(form.get("name")).trim() || "Alex",
                zone: String(form.get("zone")),
              })
            )
              toast.success("Sample profile updated.");
          }}
        >
          <label>
            Display name
            <input
              name="name"
              maxLength={80}
              defaultValue={data.name}
              required
            />
          </label>
          <label>
            Growing zone
            <select name="zone" defaultValue={data.zone ?? "7b"}>
              {Array.from({ length: 13 }, (_, i) => i + 1).flatMap((n) =>
                ["a", "b"].map((letter) => (
                  <option key={`${n}${letter}`}>
                    {n}
                    {letter}
                  </option>
                )),
              )}
            </select>
          </label>
          <button className="button-primary">Save sample profile</button>
        </form>
        <button
          className="button-secondary reset-demo"
          onClick={() => {
            if (writeEdits(emptyEdits))
              toast.success(
                "Sample profile, gardens, and tasks reset. Saved bed drafts are kept.",
              );
          }}
        >
          <RotateCcw size={16} />
          Reset sample profile and tasks
        </button>
      </main>
    );
  return <Dashboard data={data} onToggle={toggle} />;
}
