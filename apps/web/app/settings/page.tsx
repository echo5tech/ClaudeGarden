import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Settings — WeGarden",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, hardiness_zone, last_frost_date")
    .eq("user_id", user.id)
    .single();

  // If somehow there's no profile (e.g. created before the migration),
  // send them through the callback flow isn't possible here — just use a fallback.
  const safeProfile = {
    display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "",
    hardiness_zone: profile?.hardiness_zone ?? null,
    last_frost_date: profile?.last_frost_date ?? null,
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>
      <SettingsForm profile={safeProfile} />
    </main>
  );
}
