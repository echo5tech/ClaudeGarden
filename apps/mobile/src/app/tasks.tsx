import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  task_type: "sow" | "water" | "harvest";
  due_date: string;
  status: "pending" | "done" | "skipped";
  bed_plant_id: string;
  bed_plants: {
    plants: { common_name: string } | null;
    beds: { gardens: { name: string } | null } | null;
  } | null;
};

type Section = {
  title: string;
  data: Task[];
};

const TASK_ICONS: Record<Task["task_type"], string> = {
  sow: "🌱",
  water: "💧",
  harvest: "✂️",
};

function formatDateHeader(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Parse date string as local date (YYYY-MM-DD) without timezone shifting
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(tasks: Task[]): Section[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const bucket = map.get(task.due_date) ?? [];
    bucket.push(task);
    map.set(task.due_date, bucket);
  }
  return Array.from(map.entries()).map(([dateStr, data]) => ({
    title: formatDateHeader(dateStr),
    data,
  }));
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTasks = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select(
        "id, task_type, due_date, status, bed_plant_id, bed_plants(plants(common_name), beds(gardens(name)))"
      )
      .eq("status", "pending")
      .gte("due_date", today)
      .lte("due_date", twoWeeks)
      .order("due_date", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(data as Task[]);
      setError(null);
    }
  }, []);

  useEffect(() => {
    fetchTasks().finally(() => setLoading(false));

    // Realtime subscription for new tasks being inserted
    const channel = supabase
      .channel("tasks-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        () => {
          // Refetch to pick up new tasks in range
          fetchTasks();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchTasks]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  const handleMarkDone = useCallback(
    async (taskId: string) => {
      // Optimistically remove from list
      setTasks((prev) => prev?.filter((t) => t.id !== taskId) ?? null);

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", taskId);

      if (updateError) {
        // Revert on error
        setError(updateError.message);
        await fetchTasks();
      }
    },
    [fetchTasks]
  );

  const sections = tasks ? groupByDate(tasks) : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Tasks</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {loading && !tasks && <ActivityIndicator style={styles.spinner} />}

        {!loading && tasks !== null && (
          <SectionList
            style={styles.list}
            sections={sections}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <ThemedText type="small" style={styles.emptyText}>
                No upcoming tasks — add plants to a garden bed to start tracking.
              </ThemedText>
            }
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" style={styles.sectionHeader}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item: task }) => {
              const plantName =
                task.bed_plants?.plants?.common_name ?? "Unknown plant";
              const gardenName =
                task.bed_plants?.beds?.gardens?.name ?? "Unknown garden";

              return (
                <ThemedView type="backgroundElement" style={styles.taskRow}>
                  <View style={styles.taskInfo}>
                    <ThemedText style={styles.taskIcon}>
                      {TASK_ICONS[task.task_type]}
                    </ThemedText>
                    <View style={styles.taskText}>
                      <ThemedText>{plantName}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {gardenName}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.checkbox,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleMarkDone(task.id)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Mark ${plantName} ${task.task_type} as done`}>
                    <ThemedText style={styles.checkboxIcon}>☐</ThemedText>
                  </Pressable>
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
  spinner: { marginTop: Spacing.three },
  list: { flex: 1 },
  error: { color: "#c00" },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.four,
    lineHeight: 22,
  },

  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    opacity: 0.6,
  },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flex: 1,
  },
  taskIcon: {
    fontSize: 20,
  },
  taskText: {
    flex: 1,
    gap: Spacing.half,
  },
  checkbox: {
    padding: Spacing.two,
  },
  checkboxIcon: {
    fontSize: 22,
  },
  pressed: { opacity: 0.7 },
});
