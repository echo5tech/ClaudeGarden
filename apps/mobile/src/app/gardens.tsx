import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";

type Garden = {
  id: string;
  name: string;
  visibility: "public" | "private";
  created_at: string;
  beds: { count: number }[];
};

type AddBedState = {
  gardenId: string;
  name: string;
} | null;

export default function GardensScreen() {
  const theme = useTheme();
  const [gardens, setGardens] = useState<Garden[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // New garden inline form state
  const [showNewGarden, setShowNewGarden] = useState(false);
  const [newGardenName, setNewGardenName] = useState("");
  const [savingGarden, setSavingGarden] = useState(false);

  // Add bed inline form state (one at a time, per garden)
  const [addBedState, setAddBedState] = useState<AddBedState>(null);
  const [savingBed, setSavingBed] = useState(false);

  const fetchGardens = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("gardens")
      .select("id, name, visibility, created_at, beds(count)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGardens(data as Garden[]);
      setError(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGardens().finally(() => setLoading(false));
  }, [fetchGardens]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGardens();
    setRefreshing(false);
  }, [fetchGardens]);

  const handleCreateGarden = useCallback(async () => {
    const name = newGardenName.trim();
    if (!name) return;

    setSavingGarden(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not signed in");
      setSavingGarden(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("gardens")
      .insert({ user_id: user.id, name, visibility: "private" });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewGardenName("");
      setShowNewGarden(false);
      await fetchGardens();
    }
    setSavingGarden(false);
  }, [newGardenName, fetchGardens]);

  const handleAddBed = useCallback(async () => {
    if (!addBedState) return;
    const { gardenId } = addBedState;

    setSavingBed(true);
    const { error: insertError } = await supabase
      .from("beds")
      .insert({ garden_id: gardenId, width_inches: 96, height_inches: 48 });

    if (insertError) {
      setError(insertError.message);
    } else {
      setAddBedState(null);
      await fetchGardens();
    }
    setSavingBed(false);
  }, [addBedState, fetchGardens]);

  const bedCount = (garden: Garden) => {
    const arr = garden.beds;
    if (!arr || arr.length === 0) return 0;
    return arr[0].count ?? 0;
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">My Gardens</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {/* New garden inline form */}
        {showNewGarden ? (
          <ThemedView type="backgroundElement" style={styles.inlineForm}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Garden name"
              placeholderTextColor={theme.textSecondary}
              value={newGardenName}
              onChangeText={setNewGardenName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateGarden}
            />
            <View style={styles.inlineFormActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setShowNewGarden(false);
                  setNewGardenName("");
                }}>
                <ThemedText type="small">Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.confirmButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleCreateGarden}
                disabled={savingGarden}>
                {savingGarden ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <ThemedText type="smallBold">Create</ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.newGardenButton, pressed && styles.pressed]}
            onPress={() => setShowNewGarden(true)}>
            <ThemedView type="backgroundElement" style={styles.newGardenButtonInner}>
              <ThemedText type="smallBold">+ New Garden</ThemedText>
            </ThemedView>
          </Pressable>
        )}

        {loading && !gardens && <ActivityIndicator style={styles.spinner} />}

        <FlatList
          style={styles.list}
          data={gardens ?? []}
          keyExtractor={(g) => g.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" style={styles.emptyText}>
                No gardens yet — create one above to get started.
              </ThemedText>
            ) : null
          }
          renderItem={({ item: garden }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="subtitle" style={styles.gardenName}>
                  {garden.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {garden.visibility === "private" ? "🔒 Private" : "🌍 Public"}
                </ThemedText>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {bedCount(garden)} {bedCount(garden) === 1 ? "bed" : "beds"}
              </ThemedText>

              {/* Add bed inline form for this garden */}
              {addBedState?.gardenId === garden.id ? (
                <View style={styles.addBedForm}>
                  <ThemedText type="small">Add a new 8×4 ft bed?</ThemedText>
                  <View style={styles.inlineFormActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.cancelButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setAddBedState(null)}>
                      <ThemedText type="small">Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.confirmButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleAddBed}
                      disabled={savingBed}>
                      {savingBed ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <ThemedText type="smallBold">Add Bed</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.addBedButton, pressed && styles.pressed]}
                  onPress={() =>
                    setAddBedState({ gardenId: garden.id, name: "" })
                  }>
                  <ThemedText type="small" themeColor="textSecondary">
                    ➕ Add Bed
                  </ThemedText>
                </Pressable>
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
  spinner: { marginTop: Spacing.three },
  list: { flex: 1 },
  error: { color: "#c00" },
  emptyText: { textAlign: "center", marginTop: Spacing.four },

  newGardenButton: { alignSelf: "flex-start" },
  newGardenButtonInner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },

  inlineForm: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  textInput: {
    fontSize: 15,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  inlineFormActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  confirmButton: {
    backgroundColor: "#2a7d4f",
  },
  pressed: { opacity: 0.7 },

  card: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gardenName: { flexShrink: 1 },

  addBedForm: { gap: Spacing.two },
  addBedButton: { alignSelf: "flex-start" },
});
