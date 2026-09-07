import { z } from "zod";
export const demoBedSchema = z.object({
  version: z.literal(1),
  bed: z.object({
    widthInches: z.number().min(24).max(240),
    heightInches: z.number().min(24).max(240),
  }),
  placed: z.array(
    z.object({
      instanceId: z.string(),
      plantId: z.string().startsWith("demo-"),
      name: z.string(),
      spacingInches: z.number().positive().max(240),
      xInches: z.number().nonnegative(),
      yInches: z.number().nonnegative(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      plantedDate: z.string().optional(),
    }),
  ),
});
export const DEMO_BED_REVISION = "wegarden-demo-bed-revision";
export const DEMO_CHANGE_EVENT = "wegarden-demo-change";
export function readDemoBed(gardenId: string, bedId: string | null) {
  const raw = localStorage.getItem(
    `wegarden-demo-bed:${gardenId}:${bedId ?? "new"}`,
  );
  return raw ? demoBedSchema.parse(JSON.parse(raw)) : null;
}
