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
import { followUser, unfollowUser } from "../actions";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { POST_SELECT, decoratePosts } from "@/lib/posts";

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
  if (!user) redirect(`/auth?redirectTo=${encodeURIComponent(`/explore/${gardenId}`)}`);

  const { data: garden } = await supabase
    .from("gardens")
    .select("id, name, user_id, visibility, profiles(display_name, username)")
    .eq("id", gardenId)
    .eq("visibility", "public")
    .single();

  if (!garden) notFound();

  const [{ data: beds }, { data: postRows }, { data: followRow }] =
    await Promise.all([
      supabase
        .from("beds")
        .select(
          "id, width_inches, height_inches, bed_plants(id, planted_date, plants(id, common_name, scientific_name, days_to_harvest))",
        )
        .eq("garden_id", gardenId),
      supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("garden_id", gardenId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followee_id", garden.user_id)
        .maybeSingle(),
    ]);

  const isOwn = garden.user_id === user.id;
  const isFollowing = !!followRow;
  const owner = (
    garden as unknown as {
      profiles: { display_name: string; username: string | null } | null;
    }
  ).profiles;
  const bedList = (beds as unknown as BedRow[]) ?? [];
  const posts = await decoratePosts(supabase, postRows ?? [], user.id);
  const path = `/explore/${gardenId}`;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-3xl mx-auto">
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
          <p className="text-zinc-500 text-sm mt-1">
            by{" "}
            {owner?.username ? (
              <Link
                href={`/u/${owner.username}`}
                className="hover:underline underline-offset-4"
              >
                @{owner.username}
              </Link>
            ) : (
              <>@{owner?.display_name ?? "Unknown"}</>
            )}
          </p>
        </div>
        {!isOwn && (
          <form action={isFollowing ? unfollowUser : followUser}>
            <input type="hidden" name="followeeId" value={garden.user_id} />
            <input type="hidden" name="path" value={path} />
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

        <PostComposer
          gardenId={gardenId}
          placeholder="Share a tip, update, or question about this garden…"
        />

        {posts.length === 0 ? (
          <p className="text-zinc-500 text-sm">No posts yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} path={path} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
