"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ZONE_LAST_FROST_MMDD } from "@garden/shared";
import {
  updateDisplayName,
  updateProfileIdentity,
  updateZone,
  type ActionResult,
} from "./actions";

const USDA_ZONES = [
  "1a", "1b", "2a", "2b", "3a", "3b",
  "4a", "4b", "5a", "5b", "6a", "6b",
  "7a", "7b", "8a", "8b", "9a", "9b",
  "10a", "10b", "11a", "11b", "12a", "12b",
  "13a", "13b",
];

interface Profile {
  display_name: string;
  hardiness_zone: string | null;
  last_frost_date: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

function formatFrostDate(mmdd: string): string {
  const [mm, dd] = mmdd.split("-");
  const date = new Date(2000, parseInt(mm, 10) - 1, parseInt(dd, 10));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const [nameState, nameAction, namePending] = useActionState<
    ActionResult,
    FormData
  >(updateDisplayName, {});

  const [identityState, identityAction, identityPending] = useActionState<
    ActionResult,
    FormData
  >(updateProfileIdentity, {});

  const [zoneState, zoneAction, zonePending] = useActionState<
    ActionResult,
    FormData
  >(updateZone, {});

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Avatar must be under 2 MB.");
      return;
    }
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const ext =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Public profile section */}
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            Your handle, photo, and bio shown on your profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={identityAction} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar url={avatarUrl} name={profile.display_name} size={56} />
              <label className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors">
                {avatarUploading ? "Uploading…" : "Change photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            {avatarUrl && <input type="hidden" name="avatarUrl" value={avatarUrl} />}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                defaultValue={profile.username ?? ""}
                required
                pattern="[a-z0-9_]{3,30}"
                placeholder="your_handle"
                aria-describedby="username-hint"
              />
              <p id="username-hint" className="text-xs text-zinc-400">
                3–30 characters: lowercase letters, numbers, underscores.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={500}
                defaultValue={profile.bio ?? ""}
                placeholder="Tell other gardeners what you grow…"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none dark:bg-input/30"
              />
            </div>

            {(identityState?.error || avatarError) && (
              <p className="text-sm text-destructive" role="alert">
                {identityState?.error ?? avatarError}
              </p>
            )}
            {identityState?.success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Profile updated.
              </p>
            )}

            <div>
              <Button type="submit" disabled={identityPending || avatarUploading}>
                {identityPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your display name shown to other gardeners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={nameAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                name="display_name"
                type="text"
                defaultValue={profile.display_name}
                required
                placeholder="Your name"
              />
            </div>

            {nameState?.error && (
              <p className="text-sm text-destructive" role="alert">
                {nameState.error}
              </p>
            )}
            {nameState?.success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Display name updated.
              </p>
            )}

            <div>
              <Button type="submit" disabled={namePending}>
                {namePending ? "Saving…" : "Save name"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Zone section */}
      <Card>
        <CardHeader>
          <CardTitle>Hardiness zone</CardTitle>
          <CardDescription>
            Set your USDA hardiness zone to get accurate planting recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={zoneAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hardiness_zone">Zone</Label>
              <select
                id="hardiness_zone"
                name="hardiness_zone"
                defaultValue={profile.hardiness_zone ?? ""}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              >
                <option value="" disabled>
                  Select a zone…
                </option>
                {USDA_ZONES.map((zone) => {
                  const mmdd = ZONE_LAST_FROST_MMDD[zone];
                  const label = mmdd
                    ? `Zone ${zone} — last frost ~${formatFrostDate(mmdd)}`
                    : `Zone ${zone} — frost-free`;
                  return (
                    <option key={zone} value={zone}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {zoneState?.error && (
              <p className="text-sm text-destructive" role="alert">
                {zoneState.error}
              </p>
            )}
            {zoneState?.success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Zone saved.
              </p>
            )}

            <div>
              <Button type="submit" disabled={zonePending}>
                {zonePending ? "Saving…" : "Save zone"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
