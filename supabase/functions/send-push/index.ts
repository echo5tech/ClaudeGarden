// send-push: fans out Expo push notifications for due tasks.
//
// Invoked by:
//   • pg_cron + pg_net daily at 06:15 UTC with body {} — fan-out to ALL users
//     with pending tasks (one summary notification per device)
//   • Manually for testing via curl with { user_id } — per-task notifications
//     for a single user
//
// Secret-key auth only — never call this from client code.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface Payload {
  user_id?: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Expo's push API rejects requests with more than 100 messages.
const EXPO_BATCH_SIZE = 100;

async function sendToExpo(messages: ExpoMessage[]): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(batch),
    });
    statuses.push(resp.status);
  }
  return statuses;
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const { user_id } = (await req.json().catch(() => ({}))) as Payload;
    const today = new Date().toISOString().slice(0, 10);

    // ── Single-user mode: one notification per task per device ──────────────
    if (user_id) {
      const { data: tokenRows } = await ctx.supabaseAdmin
        .from("device_tokens")
        .select("token")
        .eq("user_id", user_id);
      const tokens = (tokenRows ?? []).map((r) => r.token);

      const { data: tasks, error } = await ctx.supabaseAdmin
        .from("tasks")
        .select("id, task_type, due_date, bed_plant_id")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .lte("due_date", today);
      if (error) return new Response(error.message, { status: 500 });

      if (tokens.length === 0 || (tasks?.length ?? 0) === 0) {
        return Response.json({ sent: 0, tasks: tasks?.length ?? 0 });
      }

      const messages: ExpoMessage[] = tokens.flatMap((to) =>
        (tasks ?? []).map((t) => ({
          to,
          title: `Time to ${t.task_type}`,
          body: `Garden task due ${t.due_date}`,
          data: { task_id: t.id },
        })),
      );

      const expoStatuses = await sendToExpo(messages);
      return Response.json({ sent: messages.length, expoStatuses });
    }

    // ── Fan-out mode: one summary notification per device ───────────────────
    const { data: tasks, error: tasksError } = await ctx.supabaseAdmin
      .from("tasks")
      .select("user_id, task_type")
      .eq("status", "pending")
      .lte("due_date", today);
    if (tasksError) return new Response(tasksError.message, { status: 500 });

    const taskCountByUser = new Map<string, number>();
    for (const t of tasks ?? []) {
      taskCountByUser.set(t.user_id, (taskCountByUser.get(t.user_id) ?? 0) + 1);
    }

    if (taskCountByUser.size === 0) {
      return Response.json({ users: 0, sent: 0 });
    }

    const { data: tokenRows, error: tokensError } = await ctx.supabaseAdmin
      .from("device_tokens")
      .select("user_id, token");
    if (tokensError) return new Response(tokensError.message, { status: 500 });

    const messages: ExpoMessage[] = [];
    const notifiedUsers = new Set<string>();
    for (const row of tokenRows ?? []) {
      const count = taskCountByUser.get(row.user_id);
      if (!count) continue;
      notifiedUsers.add(row.user_id);
      messages.push({
        to: row.token,
        title: "Garden tasks due",
        body:
          count === 1
            ? "You have 1 garden task due today."
            : `You have ${count} garden tasks due today.`,
        data: { due_date: today },
      });
    }

    if (messages.length === 0) {
      return Response.json({ users: 0, sent: 0 });
    }

    const expoStatuses = await sendToExpo(messages);
    return Response.json({
      users: notifiedUsers.size,
      sent: messages.length,
      expoStatuses,
    });
  }),
};
