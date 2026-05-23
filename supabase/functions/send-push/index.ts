// send-push: fans out Expo push notifications for a user's due tasks.
//
// Invoked by:
//   • pg_cron (HTTP extension) after generate_daily_tasks() inserts new tasks
//   • Manually for testing via curl
//
// Payload: { user_id: string }
// Secret-key auth only — never call this from client code.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface Payload {
  user_id: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const { user_id } = (await req.json()) as Payload;
    if (!user_id) {
      return new Response("user_id required", { status: 400 });
    }

    // TODO: add a `device_tokens(user_id, expo_push_token, platform, updated_at)`
    // table in a later migration. Mobile registers its token on app launch.
    // For now, this stub returns 0 — wire up below once that table exists.
    const tokens: string[] = [];
    // const { data: tokens } = await ctx.supabaseAdmin
    //   .from("device_tokens")
    //   .select("expo_push_token")
    //   .eq("user_id", user_id);

    const { data: tasks, error } = await ctx.supabaseAdmin
      .from("tasks")
      .select("id, task_type, due_date, bed_plant_id")
      .eq("user_id", user_id)
      .eq("status", "pending")
      .lte("due_date", new Date().toISOString().slice(0, 10));
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

    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    });

    return Response.json({ sent: messages.length, expoStatus: resp.status });
  }),
};
