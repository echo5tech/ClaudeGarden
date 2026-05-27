"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function followUser(formData: FormData) {
  const followeeId = formData.get("followeeId") as string;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  revalidatePath("/explore");
}

export async function unfollowUser(formData: FormData) {
  const followeeId = formData.get("followeeId") as string;
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
  revalidatePath("/explore");
}

export async function createPost(formData: FormData) {
  const gardenId = formData.get("gardenId") as string;
  const body = ((formData.get("body") as string | null) ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  await supabase.from("posts").insert({
    user_id: user.id,
    garden_id: gardenId,
    body,
    image_url: null,
  });
  revalidatePath(`/explore/${gardenId}`);
}
