import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Workspace, Garden } from "./types";
import { dayKey } from "./types";

export const loadWorkspace = cache(async (): Promise<Workspace> => {
  const result: Workspace = {
    mode: "guest",
    today: dayKey(new Date()),
    name: "",
    zone: null,
    plants: [],
    gardens: [],
    tasks: [],
  };
  if (!isSupabaseConfigured()) return result;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const plants = await db
    .from("plants")
    .select(
      "id, common_name, scientific_name, days_to_harvest, spacing_inches, sun_exposure, water_needs, zones",
    )
    .order("common_name")
    .limit(500);
  if (plants.error)
    throw new Error("The plant library could not be loaded. Please try again.");
  result.plants = plants.data ?? [];
  if (!user) return result;
  const [profile, gardens, tasks] = await Promise.all([
    db
      .from("profiles")
      .select("display_name, hardiness_zone")
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("gardens")
      .select(
        "id, name, visibility, beds(id, width_inches, height_inches, bed_plants(id, plant_id))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    db
      .from("tasks")
      .select(
        "id, task_type, due_date, status, bed_plants(plants(common_name), beds(gardens(name)))",
      )
      .eq("user_id", user.id)
      .order("due_date")
      .limit(500),
  ]);
  if (profile.error || gardens.error || tasks.error)
    throw new Error(
      "Your garden workspace could not be loaded. Please try again.",
    );
  return {
    ...result,
    mode: "live",
    name: profile.data?.display_name ?? "gardener",
    zone: profile.data?.hardiness_zone ?? null,
    gardens: (gardens.data ?? []) as Garden[],
    tasks: (tasks.data ?? []).map((task) => ({
      id: task.id,
      task_type: task.task_type,
      due_date: task.due_date,
      status: task.status,
      plantName: task.bed_plants?.plants?.common_name ?? "Plant",
      gardenName: task.bed_plants?.beds?.gardens?.name ?? "Garden",
    })),
  };
});
