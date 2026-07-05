// send-push: fans out Expo push notifications.
//
// Invoked by:
//   • pg_cron + pg_net daily at 06:15 UTC with body {} — task summary fan-out
//     to ALL users with pending tasks (one notification per device)
//   • pg_cron every 10 minutes at ?mode=social — pushes unsent social
//     notifications (follows / likes / comments)
//   • Manually for testing via curl with { user_id } — per-task notifications
//     for a single user
//
// Expo push tickets are checked after every send: tokens Expo reports as
// DeviceNotRegistered are deleted from device_tokens so we stop pushing to
// uninstalled devices.
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

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

// Expo's push API rejects requests with more than 100 messages.
const EXPO_BATCH_SIZE = 100;

type SupabaseAdmin = Parameters<Parameters<typeof withSupabase>[1]>[1]["supabaseAdmin"];

async function sendToExpo(
  messages: ExpoMessage[],
): Promise<{ statuses: number[]; staleTokens: string[] }> {
  const statuses: number[] = [];
  const staleTokens: string[] = [];

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(batch),
    });
    statuses.push(resp.status);
    if (!resp.ok) continue;

    // Tickets come back in batch order; match them to tokens.
    const json = (await resp.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = json?.data ?? [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        staleTokens.push(batch[idx].to);
      }
    });
  }

  return { statuses, staleTokens };
}

async function pruneStaleTokens(admin: SupabaseAdmin, staleTokens: string[]) {
  if (staleTokens.length === 0) return;
  await admin.from("device_tokens").delete().in("token", staleTokens);
}

const SOCIAL_TITLE: Record<string, string> = {
  follow: "New follower",
  like: "Your post was liked",
  comment: "New comment",
};

const SOCIAL_VERB: Record<string, string> = {
  follow: "started following you",
  like: "liked your post",
  comment: "commented on your post",
};

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const mode = new URL(req.url).searchParams.get("mode");
    const { user_id } = (await req.json().catch(() => ({}))) as Payload;
    const today = new Date().toISOString().slice(0, 10);

    // ── Social mode: push unsent follow/like/comment notifications ──────────
    if (mode === "social") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pending, error } = await ctx.supabaseAdmin
        .from("notifications")
        .select("id, user_id, type, post_id, actor:profiles!notifications_actor_id_fkey(display_name)")
        .is("pushed_at", null)
        .gte("created_at", since)
        .limit(500);
      if (error) return new Response(error.message, { status: 500 });

      if ((pending?.length ?? 0) === 0) {
        return Response.json({ sent: 0, notifications: 0 });
      }

      const userIds = [...new Set((pending ?? []).map((n) => n.user_id))];
      const { data: tokenRows } = await ctx.supabaseAdmin
        .from("device_tokens")
        .select("user_id, token")
        .in("user_id", userIds);

      const tokensByUser = new Map<string, string[]>();
      for (const row of tokenRows ?? []) {
        const list = tokensByUser.get(row.user_id) ?? [];
        list.push(row.token);
        tokensByUser.set(row.user_id, list);
      }

      const messages: ExpoMessage[] = [];
      for (const n of pending ?? []) {
        const actorName =
          (n.actor as unknown as { display_name: string } | null)?.display_name ?? "Someone";
        for (const to of tokensByUser.get(n.user_id) ?? []) {
          messages.push({
            to,
            title: SOCIAL_TITLE[n.type] ?? "WeGarden",
            body: `${actorName} ${SOCIAL_VERB[n.type] ?? "did something"}`,
            data: n.post_id ? { post_id: n.post_id } : { notification: true },
          });
        }
      }

      let statuses: number[] = [];
      if (messages.length > 0) {
        const result = await sendToExpo(messages);
        statuses = result.statuses;
        await pruneStaleTokens(ctx.supabaseAdmin, result.staleTokens);
      }

      // Mark everything processed — including notifications for users with no
      // devices — so the next run doesn't re-scan them forever.
      await ctx.supabaseAdmin
        .from("notifications")
        .update({ pushed_at: new Date().toISOString() })
        .in("id", (pending ?? []).map((n) => n.id));

      return Response.json({
        notifications: pending?.length ?? 0,
        sent: messages.length,
        expoStatuses: statuses,
      });
    }

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

      const { statuses, staleTokens } = await sendToExpo(messages);
      await pruneStaleTokens(ctx.supabaseAdmin, staleTokens);
      return Response.json({ sent: messages.length, expoStatuses: statuses });
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

    const { statuses, staleTokens } = await sendToExpo(messages);
    await pruneStaleTokens(ctx.supabaseAdmin, staleTokens);
    return Response.json({
      users: notifiedUsers.size,
      sent: messages.length,
      expoStatuses: statuses,
    });
  }),
};
