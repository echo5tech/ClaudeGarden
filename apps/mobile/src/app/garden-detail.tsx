import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type BedPlant = {
  id: string;
  plants: { common_name: string } | null;
};

type Bed = {
  id: string;
  width_inches: number;
  height_inches: number;
  bed_plants: BedPlant[];
};

type Post = {
  id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string } | null;
};

type GardenDetail = {
  id: string;
  name: string;
  user_id: string;
  profiles: { display_name: string } | null;
  beds: Bed[];
  posts: Post[];
};

export default function GardenDetailScreen() {
  const { gardenId } = useLocalSearchParams<{ gardenId: string }>();
  const router = useRouter();

  const [garden, setGarden] = useState<GardenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!gardenId) return;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: gardenData, error: gardenError } = await supabase
        .from("gardens")
        .select(
          `id, name, user_id,
           profiles(display_name),
           beds(id, width_inches, height_inches, bed_plants(id, plants(common_name)))`,
        )
        .eq("id", gardenId!)
        .eq("visibility", "public")
        .single();

      if (gardenError || !gardenData) {
        setError("Garden not found");
        setLoading(false);
        return;
      }

      const { data: postsData } = await supabase
        .from("posts")
        .select("id, body, created_at, profiles(display_name)")
        .eq("garden_id", gardenId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (user && gardenData.user_id !== user.id) {
        const { data: followRow } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("followee_id", gardenData.user_id)
          .maybeSingle();
        setIsFollowing(!!followRow);
      }

      setGarden({
        ...(gardenData as unknown as GardenDetail),
        posts: (postsData as unknown as Post[]) ?? [],
      });
      setLoading(false);
    }

    load();
  }, [gardenId]);

  async function handleFollowToggle() {
    if (!garden || !currentUserId || garden.user_id === currentUserId) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("followee_id", garden.user_id);
      setIsFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, followee_id: garden.user_id });
      setIsFollowing(true);
    }
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !garden) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? "Garden not found"}</ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="small" style={styles.backLink}>
            Go back
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const isOwn = garden.user_id === currentUserId;
  const ownerName = garden.profiles?.display_name ?? "Unknown";

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="small" style={styles.backLink}>
            ← Back
          </ThemedText>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{garden.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                by @{ownerName}
              </ThemedText>
            </View>
            {!isOwn && (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={handleFollowToggle}
                disabled={followLoading}
              >
                <ThemedText
                  type="smallBold"
                  style={isFollowing ? styles.followingText : styles.followText}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Beds ({garden.beds.length})
          </ThemedText>

          {garden.beds.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No beds.
            </ThemedText>
          ) : (
            garden.beds.map((bed) => (
              <ThemedView
                key={bed.id}
                type="backgroundElement"
                style={styles.bedCard}
              >
                <ThemedText type="smallBold">
                  {Math.round(bed.width_inches / 12)} ×{" "}
                  {Math.round(bed.height_inches / 12)} ft
                </ThemedText>
                {bed.bed_plants.length > 0 && (
                  <View style={styles.plantTags}>
                    {bed.bed_plants.map((bp) =>
                      bp.plants ? (
                        <View key={bp.id} style={styles.plantTag}>
                          <ThemedText type="small">
                            {bp.plants.common_name}
                          </ThemedText>
                        </View>
                      ) : null,
                    )}
                  </View>
                )}
              </ThemedView>
            ))
          )}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Posts
          </ThemedText>

          {garden.posts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No posts yet.
            </ThemedText>
          ) : (
            garden.posts.map((post) => (
              <ThemedView
                key={post.id}
                type="backgroundElement"
                style={styles.postCard}
              >
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={{ marginBottom: 4 }}
                >
                  @{post.profiles?.display_name ?? "Unknown"} ·{" "}
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </ThemedText>
                <ThemedText>{post.body}</ThemedText>
              </ThemedView>
            ))
          )}

          <View style={{ height: Spacing.six }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  backRow: { paddingVertical: Spacing.two },
  backLink: { color: "#2a7d4f" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  followButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    backgroundColor: "#2a7d4f",
    marginTop: Spacing.one,
  },
  followingButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2a7d4f",
  },
  followText: { color: "#fff" },
  followingText: { color: "#2a7d4f" },
  sectionTitle: { marginTop: Spacing.four, marginBottom: Spacing.two },
  bedCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  plantTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  plantTag: {
    backgroundColor: "rgba(34,139,34,0.12)",
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  postCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
});
