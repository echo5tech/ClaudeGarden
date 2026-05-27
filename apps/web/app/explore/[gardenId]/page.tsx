import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { followUser, unfollowUser, createPost } from "../actions";

type BedPlantRow = {
  id: string;
  planted_date: string;
  plants: {
    id: string;
    common_name: string;
    scientific_name: string;
    days_to_harvest: number | null;
  } | null;
};

type BedRow = {
  id: string;
  width_inches: number;
  height_inches: number;
  bed_plants: BedPlantRow[];
};

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string } | null;
};

export default async function GardenDetailPage({
  params,
}: {
  params: Promise<{ gardenId: string }>;
}) {
  const { gardenId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name, user_id, visibility, profiles(display_name)")
    .eq("id", gardenId)
    .eq("visibility", "public")
    .single();

  if (!garden) notFound();

  const { data: beds } = await supabase
    .from("beds")
    .select(
      "id, width_inches, height_inches, bed_plants(id, planted_date, plants(id, common_name, scientific_name, days_to_harvest))",
    )
    .eq("garden_id", gardenId);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, body, created_at, profiles(display_name)")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: followRow } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followee_id", garden.user_id)
    .maybeSingle();

  const isOwn = garden.user_id === user.id;
  const isFollowing = !!followRow;
  const ownerName =
    (garden as unknown as { profiles: { display_name: string } | null })
      .profiles?.display_name ?? "Unknown";
  const bedList = (beds as unknown as BedRow[]) ?? [];
  const postList = (posts as unknown as PostRow[]) ?? [];

  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href="/explore"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Explore
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{garden.name}</h1>
          <p className="text-zinc-500 text-sm mt-1">by @{ownerName}</p>
        </div>
        {!isOwn && (
          <form action={isFollowing ? unfollowUser : followUser}>
            <input type="hidden" name="followeeId" value={garden.user_id} />
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

      {/* Beds */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">
          Beds{" "}
          <span className="text-zinc-400 font-normal text-base">
            ({bedList.length})
          </span>
        </h2>
        {bedList.length === 0 ? (
          <p className="text-zinc-500 text-sm">No beds in this garden.</p>
        ) : (
          <ul className="space-y-3">
            {bedList.map((bed) => (
              <li key={bed.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {Math.round(bed.width_inches / 12)} ×{" "}
                      {Math.round(bed.height_inches / 12)} ft bed
                    </CardTitle>
                    <CardDescription>
                      {bed.bed_plants.length}{" "}
                      {bed.bed_plants.length === 1 ? "plant" : "plants"}
                    </CardDescription>
                  </CardHeader>
                  {bed.bed_plants.length > 0 && (
                    <CardContent>
                      <ul className="flex flex-wrap gap-2">
                        {bed.bed_plants.map((bp) =>
                          bp.plants ? (
                            <li key={bp.id}>
                              <Link
                                href={`/plants/${bp.plants.id}`}
                                className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:opacity-80 transition-opacity"
                              >
                                {bp.plants.common_name}
                              </Link>
                            </li>
                          ) : null,
                        )}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Posts */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Community posts</h2>

        <form action={createPost} className="mb-6">
          <input type="hidden" name="gardenId" value={gardenId} />
          <textarea
            name="body"
            rows={3}
            maxLength={2000}
            placeholder="Share a tip, update, or question about this garden…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            required
          />
          <Button type="submit" size="sm" className="mt-2">
            Post
          </Button>
        </form>

        {postList.length === 0 ? (
          <p className="text-zinc-500 text-sm">No posts yet. Be the first!</p>
        ) : (
          <ul className="space-y-3">
            {postList.map((post) => (
              <li
                key={post.id}
                className="border rounded-lg px-4 py-3 text-sm"
              >
                <div className="font-medium text-xs text-zinc-400 mb-1">
                  @{post.profiles?.display_name ?? "Unknown"} ·{" "}
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {post.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
