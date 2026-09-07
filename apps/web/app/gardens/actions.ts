"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGarden(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const name = (formData.get("name") as string | null)?.trim();
  const visibility =
    formData.get("visibility") === "public" ? "public" : "private";

  if (!name) {
    throw new Error("Garden name is required");
  }

  const { error } = await supabase.from("gardens").insert({
    user_id: user.id,
    name,
    visibility,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/gardens");
}

export async function deleteGarden(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("gardens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Garden could not be deleted.");
  redirect("/gardens");
}
