"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function followUser(formData: FormData) {
  const followeeId = formData.get("followeeId") as string;
  const path = (formData.get("path") as string | null) ?? "/explore";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  revalidatePath(path);
  revalidatePath("/"); // the home feed changes with the follow graph
}

export async function unfollowUser(formData: FormData) {
  const followeeId = formData.get("followeeId") as string;
  const path = (formData.get("path") as string | null) ?? "/explore";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId);
  revalidatePath(path);
  revalidatePath("/");
}

// Post creation moved to app/social/actions.ts#createFeedPost (supports
// images and gardenless feed posts).
