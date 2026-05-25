"use client";

import { useActionState } from "react";
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
import {
  updateDisplayName,
  updateZone,
  ZONE_FROST_MAP,
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

  const [zoneState, zoneAction, zonePending] = useActionState<
    ActionResult,
    FormData
  >(updateZone, {});

  return (
    <div className="flex flex-col gap-6">
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
                  const mmdd = ZONE_FROST_MAP[zone];
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
