import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
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
        <ThemedText type="title">Claude Garden</ThemedText>
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
  list: { flex: 1 },
  row: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  error: { color: "#c00" },
});
