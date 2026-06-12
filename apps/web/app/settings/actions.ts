"use server";

import { revalidatePath } from "next/cache";
import { ZONE_LAST_FROST_MMDD, nextLastFrostDate } from "@garden/shared";
import { createClient } from "@/lib/supabase/server";

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

  if (!(zone in ZONE_LAST_FROST_MMDD)) {
    return { error: "Invalid zone." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Next future occurrence of the zone's last-frost date (null = frost-free).
  const lastFrostDate = nextLastFrostDate(zone, new Date());

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
