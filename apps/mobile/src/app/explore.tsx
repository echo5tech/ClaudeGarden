import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type Garden = {
  id: string;
  name: string;
  created_at: string;
  profiles: { display_name: string } | null;
  beds: { count: number }[];
};

export default function ExploreScreen() {
  const [gardens, setGardens] = useState<Garden[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("gardens")
      .select("id, name, created_at, profiles(display_name), beds(count)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setGardens((data as unknown as Garden[]) ?? []);
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Explore</ThemedText>
        <ThemedText type="small">Discover public gardens</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {!gardens && !error && <ActivityIndicator style={styles.loader} />}

        {gardens && gardens.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyIcon}>
              🌱
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              No public gardens yet. Start your own!
            </ThemedText>
          </ThemedView>
        )}

        {gardens && gardens.length > 0 && (
          <FlatList
            style={styles.list}
            data={gardens}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => {
              const bedCount =
                item.beds.length > 0 ? item.beds[0]?.count ?? 0 : 0;
              const ownerName = item.profiles?.display_name ?? "Unknown";

              return (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <View style={styles.cardIcon}>
                    <ThemedText style={styles.cardIconText}>🪴</ThemedText>
                  </View>
                  <View style={styles.cardBody}>
                    <ThemedText style={[styles.cardName, styles.cardNameBold]}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      by @{ownerName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {bedCount} {bedCount === 1 ? "bed" : "beds"}
                    </ThemedText>
                  </View>
                </ThemedView>
              );
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", justifyContent: "center" },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  loader: {
    marginTop: Spacing.four,
  },
  list: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
    backgroundColor: "rgba(34, 139, 34, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 24,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  cardName: {
    flexShrink: 1,
  },
  cardNameBold: {
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    textAlign: "center",
  },
  error: { color: "#c00" },
});
