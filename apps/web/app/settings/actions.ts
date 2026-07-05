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

export async function updateProfileIdentity(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const username = formData.get("username");
  const bio = ((formData.get("bio") as string | null) ?? "").trim();
  const avatarUrl = (formData.get("avatarUrl") as string | null) || null;

  if (typeof username !== "string" || !/^[a-z0-9_]{3,30}$/.test(username)) {
    return {
      error: "Username must be 3–30 characters: lowercase letters, numbers, underscores.",
    };
  }
  if (bio.length > 500) {
    return { error: "Bio must be 500 characters or fewer." };
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
    .update({
      username,
      bio: bio || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is taken." };
    }
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
