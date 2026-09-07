import { beforeEach, describe, expect, it, vi } from "vitest";
const mockDb = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mockDb }));
import { useDesignerStore, type PlacedPlant } from "./use-designer-store";
const plant: PlacedPlant = {
  instanceId: "existing-plant",
  plantId: "catalog-basil",
  name: "Basil",
  spacingInches: 12,
  xInches: 12,
  yInches: 12,
  color: "#708a57",
  plantedDate: "2026-04-01",
};
function bedQuery() {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue({ data: { id: "new-bed" }, error: null });
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  useDesignerStore
    .getState()
    .hydrate("garden-id", "bed-id", undefined, [plant]);
});
describe("bed persistence", () => {
  it("preserves existing plant identity and planting date when moving a plant", async () => {
    const bed = bedQuery();
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn();
    mockDb.from.mockImplementation((table) =>
      table === "beds" ? bed : { upsert, delete: remove },
    );
    useDesignerStore.getState().move(plant.instanceId, 30, 12);
    await useDesignerStore.getState().save();
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "existing-plant",
        planted_date: "2026-04-01",
        x_inches: 30,
      }),
    ]);
    expect(remove).not.toHaveBeenCalled();
    expect(useDesignerStore.getState().isDirty).toBe(false);
  });
  it("keeps existing rows when upsert fails and retains the new bed id for retries", async () => {
    const bed = bedQuery();
    const remove = vi.fn();
    mockDb.from.mockImplementation((table) =>
      table === "beds"
        ? bed
        : {
            upsert: vi
              .fn()
              .mockResolvedValue({ error: { message: "Network interrupted" } }),
            delete: remove,
          },
    );
    useDesignerStore.getState().hydrate("garden-id", null, undefined, [plant]);
    useDesignerStore.getState().move(plant.instanceId, 30, 12);
    await useDesignerStore.getState().save();
    expect(remove).not.toHaveBeenCalled();
    expect(useDesignerStore.getState().bedId).toBe("new-bed");
    expect(useDesignerStore.getState().isDirty).toBe(true);
    expect(useDesignerStore.getState().saveError).toBe("Network interrupted");
  });
  it("deletes only explicitly removed plants after surviving rows are saved", async () => {
    const bed = bedQuery();
    const filter = {
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({ error: null }),
    };
    filter.eq.mockReturnValue(filter);
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockReturnValue(filter);
    mockDb.from.mockImplementation((table) =>
      table === "beds" ? bed : { upsert, delete: remove },
    );
    useDesignerStore
      .getState()
      .hydrate("garden-id", "bed-id", undefined, [
        plant,
        { ...plant, instanceId: "removed-plant", xInches: 42 },
      ]);
    useDesignerStore.getState().remove("removed-plant");
    await useDesignerStore.getState().save();
    expect(filter.in).toHaveBeenCalledWith("id", ["removed-plant"]);
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    );
  });
  it("blocks overlapping plants before sending any writes", async () => {
    useDesignerStore
      .getState()
      .hydrate("garden-id", "bed-id", undefined, [
        plant,
        { ...plant, instanceId: "overlap" },
      ]);
    await useDesignerStore.getState().save();
    expect(mockDb.from).not.toHaveBeenCalled();
    expect(useDesignerStore.getState().saveError).toContain("more room");
  });
  it("marks dimension-only edits dirty and blocks resizing over plant footprints", () => {
    useDesignerStore.getState().setBed(120, 60);
    expect(useDesignerStore.getState().isDirty).toBe(true);
    useDesignerStore.getState().move(plant.instanceId, 100, 12);
    useDesignerStore.getState().setBed(48, 48);
    expect(useDesignerStore.getState().bed.widthInches).toBe(120);
    expect(useDesignerStore.getState().saveError).toContain("smaller bed");
  });
});
