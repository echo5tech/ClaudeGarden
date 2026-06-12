import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type Plant = {
  id: string;
  common_name: string;
  scientific_name: string;
  days_to_harvest: number | null;
};

export default function HomeScreen() {
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Best-effort: stop push notifications to this signed-out device.
      await supabase
        .from("device_tokens")
        .delete()
        .match({ user_id: user.id, platform: Platform.OS });
    }
    await supabase.auth.signOut();
    // The SIGNED_OUT listener in _layout.tsx redirects to /auth.
    setSigningOut(false);
  }

  useEffect(() => {
    supabase
      .from("plants")
      .select("id, common_name, scientific_name, days_to_harvest")
      .order("common_name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPlants(data);
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <ThemedText type="title">WeGarden</ThemedText>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => ({ opacity: pressed || signingOut ? 0.6 : 1 })}>
            <ThemedText type="linkPrimary">
              {signingOut ? "Signing out…" : "Sign out"}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="small">Plant catalog · Supabase smoke test</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        {!plants && !error && <ActivityIndicator />}

        <FlatList
          style={styles.list}
          data={plants ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText>{item.common_name}</ThemedText>
              <ThemedText type="small">{item.scientific_name}</ThemedText>
              {item.days_to_harvest != null && (
                <ThemedText type="small">
                  {item.days_to_harvest} days to harvest
                </ThemedText>
              )}
            </ThemedView>
          )}
        />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  list: { flex: 1 },
  row: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  error: { color: "#c00" },
});
