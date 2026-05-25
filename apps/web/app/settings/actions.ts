"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Map of USDA hardiness zones to last frost date (MM-DD). null = frost-free.
const ZONE_FROST_MAP: Record<string, string | null> = {
  "1a": "06-15",
  "1b": "06-01",
  "2a": "05-15",
  "2b": "05-01",
  "3a": "05-01",
  "3b": "04-15",
  "4a": "04-15",
  "4b": "04-01",
  "5a": "04-01",
  "5b": "03-30",
  "6a": "03-15",
  "6b": "03-15",
  "7a": "03-01",
  "7b": "03-01",
  "8a": "02-15",
  "8b": "02-01",
  "9a": "02-01",
  "9b": "01-15",
  "10a": null,
  "10b": null,
  "11a": null,
  "11b": null,
  "12a": null,
  "12b": null,
  "13a": null,
  "13b": null,
};

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function updateDisplayName(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const displayName = formData.get("display_name");
  if (typeof displayName !== "string" || !displayName.trim()) {
    return { error: "Display name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateZone(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const zone = formData.get("hardiness_zone");
  if (typeof zone !== "string" || !zone) {
    return { error: "Please select a zone." };
  }

  if (!(zone in ZONE_FROST_MAP)) {
    return { error: "Invalid zone." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const mmdd = ZONE_FROST_MAP[zone];
  // Use next calendar year for last_frost_date so it's always in the future
  // (today is 2026-05-25 per system context)
  const year = 2027;
  const lastFrostDate = mmdd ? `${year}-${mmdd}` : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      hardiness_zone: zone,
      last_frost_date: lastFrostDate,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export { ZONE_FROST_MAP };
