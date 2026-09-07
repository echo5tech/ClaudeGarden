"use client";
import { useState } from "react";
import { Plus, Search, Sprout, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { addGarden, removeGarden } from "@/lib/workspace/actions";
import type { Garden, Workspace } from "@/lib/workspace/types";
import { EmptyState, GardenCard, PageHeading } from "./primitives";
export type CreateGarden = (
  name: string,
  visibility: string,
) => Promise<Garden | null>;
export function CreateGardenButton({
  onCreate,
  onCreated,
}: {
  onCreate?: CreateGarden;
  onCreated?: (garden: Garden) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError("Give your garden a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const visibility = String(form.get("visibility") ?? "private");
      let garden: Garden | null = null;
      if (onCreate) garden = await onCreate(name, visibility);
      else {
        const result = await addGarden(name, visibility);
        if (result.error) {
          setError(result.error);
          return;
        }
        garden = result.garden ?? null;
      }
      if (!garden) {
        setError("Your garden could not be saved. Please try again.");
        return;
      }
      onCreated?.(garden);
      setOpen(false);
      toast.success("A new place to grow. Your garden is ready.");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button-primary" onClick={() => setOpen(true)}>
        <Plus size={17} />
        New garden
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
            setError("");
          }
        }}
      >
        <DialogContent className="garden-dialog">
          <span className="dialog-symbol">
            <Sprout size={26} />
          </span>
          <DialogTitle className="dialog-title">
            Make a little room to grow.
          </DialogTitle>
          <DialogDescription>
            Every great garden starts somewhere. Give yours a name.
          </DialogDescription>
          <form onSubmit={submit} className="garden-form">
            <label>
              Garden name
              <input
                name="name"
                placeholder="e.g. My backyard oasis"
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <fieldset>
              <legend>Who can see this garden?</legend>
              <label className="radio-label">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  defaultChecked
                />
                <span>
                  <strong>Just me</strong>
                  <small>Your own quiet corner.</small>
                </span>
              </label>
              <label className="radio-label">
                <input type="radio" name="visibility" value="public" />
                <span>
                  <strong>The community</strong>
                  <small>Let other gardeners find inspiration.</small>
                </span>
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button-primary full-width" disabled={busy}>
              {busy ? "Creating…" : "Create my garden"}
              <ArrowRight size={16} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function GardensScreen({
  data,
  onCreate,
  onDelete,
}: {
  data: Workspace;
  onCreate?: CreateGarden;
  onDelete?: (id: string) => Promise<boolean>;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState<Garden | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [created, setCreated] = useState<Garden[]>([]);
  const [query, setQuery] = useState("");
  const gardens = [
    ...created.filter((item) => !data.gardens.some((g) => g.id === item.id)),
    ...data.gardens,
  ].filter((garden) => !removed.includes(garden.id));
  const filtered = gardens.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase()),
  );
  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      if (onDelete) {
        if (!(await onDelete(toDelete.id))) {
          setDeleteError("Could not delete this sample garden.");
          return;
        }
      } else {
        const result = await removeGarden(toDelete.id);
        if (result.error) {
          setDeleteError(result.error);
          return;
        }
      }
      setRemoved((old) => [...old, toDelete.id]);
      setToDelete(null);
      toast.success("Garden deleted.");
    } catch {
      setDeleteError("Could not connect. Please try again.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <main className="page-wrap">
      <PageHeading
        eyebrow="YOUR OWN PATCH OF POSSIBILITY"
        title="My gardens"
        description="From a sunny windowsill to a backyard full of life."
      >
        <CreateGardenButton
          onCreate={onCreate}
          onCreated={(garden) => setCreated((old) => [garden, ...old])}
        />
      </PageHeading>
      <div className="filter-row">
        <span className="muted">
          {gardens.length}{" "}
          {gardens.length === 1 ? "growing space" : "growing spaces"}
        </span>
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search gardens"
            placeholder="Find a garden…"
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="garden-grid">
          {filtered.map((garden) => (
            <GardenCard
              key={garden.id}
              garden={garden}
              mode={data.mode}
              onDelete={() => {
                setToDelete(garden);
                setDeleteError("");
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query
              ? "No gardens by that name."
              : "Your garden story starts here."
          }
          description={
            query
              ? "Try a different search."
              : "Create a garden, lay out your first bed, and choose what you’d love to grow."
          }
        />
      )}
      <div className="quiet-note">
        <Sprout size={18} />
        <p>Start small. A single bed is a beautiful beginning.</p>
      </div>
      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <DialogContent className="garden-dialog">
          <DialogTitle className="dialog-title">
            Delete {toDelete?.name}?
          </DialogTitle>
          <DialogDescription>
            This removes the garden, its beds, plantings, and linked care tasks.
            This action cannot be undone.
          </DialogDescription>
          {deleteError && (
            <p className="form-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              className="button-secondary"
              disabled={deleting}
              onClick={() => setToDelete(null)}
            >
              Keep garden
            </button>
            <button
              className="button-primary"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete garden"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
