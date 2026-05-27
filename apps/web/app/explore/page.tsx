import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { followUser, unfollowUser } from "./actions";

export const metadata: Metadata = {
  title: "Explore — WeGarden",
  description: "Discover public gardens from the community.",
};

type GardenRow = {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
  beds: { count: number }[];
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: gardens } = await supabase
    .from("gardens")
    .select("id, name, created_at, user_id, profiles(display_name), beds(count)")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: follows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id);

  const followingSet = new Set((follows ?? []).map((f) => f.followee_id));
  const gardenList = (gardens as unknown as GardenRow[]) ?? [];

  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Explore</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Discover public gardens from the community.
      </p>

      {gardenList.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-zinc-500">
          No public gardens yet. Make yours public in{" "}
          <Link href="/gardens" className="underline">
            My Gardens
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-4">
          {gardenList.map((garden) => {
            const bedCount = garden.beds?.[0]?.count ?? 0;
            const ownerName = garden.profiles?.display_name ?? "Unknown";
            const isOwn = garden.user_id === user.id;
            const isFollowing = followingSet.has(garden.user_id);

            return (
              <li key={garden.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>
                          <Link
                            href={`/explore/${garden.id}`}
                            className="hover:underline"
                          >
                            {garden.name}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          by @{ownerName} ·{" "}
                          {bedCount === 1 ? "1 bed" : `${bedCount} beds`}
                        </CardDescription>
                      </div>
                      {!isOwn && (
                        <form
                          action={isFollowing ? unfollowUser : followUser}
                        >
                          <input
                            type="hidden"
                            name="followeeId"
                            value={garden.user_id}
                          />
                          <Button
                            type="submit"
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                          >
                            {isFollowing ? "Unfollow" : "Follow"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
