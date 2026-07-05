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
import { Avatar } from "@/components/post-card";
import { followUser, unfollowUser } from "./actions";

export const metadata: Metadata = {
  title: "Explore — WeGarden",
  description: "Discover public gardens and gardeners from the community.",
};

const PAGE_SIZE = 20;

type GardenRow = {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string; username: string | null } | null;
  beds: { count: number }[];
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const search = q?.trim();
  const escaped = search?.replace(/[%_]/g, "\\$&");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirectTo=%2Fexplore");

  let gardenQuery = supabase
    .from("gardens")
    .select(
      "id, name, created_at, user_id, profiles(display_name, username), beds(count)",
      { count: "exact" },
    )
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (escaped) {
    gardenQuery = gardenQuery.ilike("name", `%${escaped}%`);
  }

  const [{ data: gardens, count }, { data: follows }, { data: people }] =
    await Promise.all([
      gardenQuery,
      supabase.from("follows").select("followee_id").eq("follower_id", user.id),
      // Gardener search only kicks in with a query.
      escaped
        ? supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url, bio")
            .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
            .neq("user_id", user.id)
            .limit(10)
        : Promise.resolve({ data: null }),
    ]);

  const followingSet = new Set((follows ?? []).map((f) => f.followee_id));
  const gardenList = (gardens as unknown as GardenRow[]) ?? [];
  const peopleList = (people as ProfileRow[] | null) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/explore?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(p) })}`;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Explore</h1>
      <p className="text-zinc-500 mb-6 text-sm">
        Discover public gardens and gardeners from the community.
      </p>

      <form action="/explore" method="get" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search gardens and gardeners…"
          aria-label="Search gardens and gardeners"
          className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {peopleList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Gardeners</h2>
          <ul className="space-y-2">
            {peopleList.map((person) => {
              const isFollowing = followingSet.has(person.user_id);
              return (
                <li
                  key={person.user_id}
                  className="flex items-center gap-3 border rounded-lg px-4 py-3"
                >
                  <Avatar url={person.avatar_url} name={person.display_name} size={36} />
                  <div className="flex-1 min-w-0 text-sm">
                    {person.username ? (
                      <Link
                        href={`/u/${person.username}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {person.display_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{person.display_name}</span>
                    )}
                    {person.username && (
                      <span className="text-zinc-400 ml-2">@{person.username}</span>
                    )}
                    {person.bio && (
                      <p className="text-xs text-zinc-500 truncate">{person.bio}</p>
                    )}
                  </div>
                  <form action={isFollowing ? unfollowUser : followUser}>
                    <input type="hidden" name="followeeId" value={person.user_id} />
                    <input type="hidden" name="path" value="/explore" />
                    <Button
                      type="submit"
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {gardenList.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-zinc-500">
          {search ? (
            <>No public gardens match &ldquo;{search}&rdquo;.</>
          ) : (
            <>
              No public gardens yet. Make yours public in{" "}
              <Link href="/gardens" className="underline">
                My Gardens
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <>
          {peopleList.length > 0 && (
            <h2 className="text-lg font-semibold mb-3">Gardens</h2>
          )}
          <ul className="space-y-4">
            {gardenList.map((garden) => {
              const bedCount = garden.beds?.[0]?.count ?? 0;
              const owner = garden.profiles;
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
                            )}{" "}
                            · {bedCount === 1 ? "1 bed" : `${bedCount} beds`}
                          </CardDescription>
                        </div>
                        {!isOwn && (
                          <form action={isFollowing ? unfollowUser : followUser}>
                            <input
                              type="hidden"
                              name="followeeId"
                              value={garden.user_id}
                            />
                            <input type="hidden" name="path" value="/explore" />
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
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between mt-8 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="underline underline-offset-4 hover:no-underline"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-zinc-400">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="underline underline-offset-4 hover:no-underline"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
