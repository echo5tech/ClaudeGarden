"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function setCareTaskStatus(id: string, done: boolean) {
  if (!z.uuid().safeParse(id).success || typeof done !== "boolean")
    return { error: "Invalid task." };
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: "Sign in to update your tasks." };
    const { data, error } = await db
      .from("tasks")
      .update({ status: done ? "done" : "pending" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return { error: "That task could not be updated. Please try again." };
    for (const path of ["/", "/tasks", "/calendar"]) revalidatePath(path);
    return { success: true };
  } catch {
    return { error: "Could not connect. Your task has not changed." };
  }
}
export async function addGarden(name: string, visibility: string) {
  const input = z
    .object({
      name: z.string().trim().min(1).max(80),
      visibility: z.enum(["private", "public"]),
    })
    .safeParse({ name, visibility });
  if (!input.success)
    return { error: "Enter a garden name between 1 and 80 characters." };
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: "Sign in to create a garden." };
    const { data, error } = await db
      .from("gardens")
      .insert({ ...input.data, user_id: user.id })
      .select("id, name, visibility")
      .single();
    if (error || !data)
      return { error: "Your garden could not be saved. Please try again." };
    revalidatePath("/");
    revalidatePath("/gardens");
    return { garden: { ...data, beds: [] } };
  } catch {
    return { error: "Could not connect. Your garden has not been saved." };
  }
}

export async function removeGarden(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "Invalid garden." };
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: "Sign in to delete your garden." };
    const { error, data } = await db
      .from("gardens")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return { error: "That garden could not be deleted. Please try again." };
    for (const path of ["/", "/gardens", "/tasks", "/calendar"])
      revalidatePath(path);
    return { success: true };
  } catch {
    return { error: "Could not connect. Please try again." };
  }
}
