import { z } from "zod";

export const HardinessZoneSchema = z
  .string()
  .regex(/^(1[0-3]|[1-9])[ab]$/, "expected USDA hardiness zone like 7a, 10b");

export const ZipSchema = z.string().regex(/^\d{5}(-\d{4})?$/, "expected US zip");

export const ProfileSchema = z.object({
  display_name: z.string().min(1).max(60),
  zip: ZipSchema,
  hardiness_zone: HardinessZoneSchema,
  last_frost_date: z.iso.date(),
});
export type ProfileInput = z.infer<typeof ProfileSchema>;

export const BedSchema = z.object({
  garden_id: z.uuid(),
  width_inches: z.number().int().positive().max(600),
  height_inches: z.number().int().positive().max(600),
});
export type BedInput = z.infer<typeof BedSchema>;

export const BedPlantSchema = z.object({
  bed_id: z.uuid(),
  plant_id: z.uuid(),
  x_inches: z.number().nonnegative(),
  y_inches: z.number().nonnegative(),
  planted_date: z.iso.date(),
});
export type BedPlantInput = z.infer<typeof BedPlantSchema>;

export const PostSchema = z.object({
  garden_id: z.uuid(),
  image_url: z.url().nullable(),
  body: z.string().max(2000),
});
export type PostInput = z.infer<typeof PostSchema>;
