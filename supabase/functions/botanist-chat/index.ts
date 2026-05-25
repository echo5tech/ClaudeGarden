// botanist-chat: Claude-powered gardening assistant with streaming SSE responses.
//
// Request: POST { message: string, session_id?: string }
// Auth: Bearer JWT (verified manually — verify_jwt: false in config.json)
//
// Set env var: ANTHROPIC_API_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Parse body
  let body: { message?: string; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { message, session_id: incomingSessionId } = body;
  if (!message || typeof message !== "string" || message.trim() === "") {
    return new Response("message is required", { status: 400 });
  }

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get or create session
  let sessionId: string;
  if (incomingSessionId) {
    // Verify session belongs to this user
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", incomingSessionId)
      .eq("user_id", user.id)
      .single();
    if (sessionError || !session) {
      return new Response("Session not found", { status: 404 });
    }
    sessionId = session.id;
  } else {
    const { data: newSession, error: createError } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (createError || !newSession) {
      return new Response("Failed to create session", { status: 500 });
    }
    sessionId = newSession.id;
  }

  // Fetch context concurrently
  const [profileResult, plantsResult, historyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, hardiness_zone, last_frost_date")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("bed_plants")
      .select("plants!inner(common_name), beds!inner(gardens!inner(user_id))")
      .eq("beds.gardens.user_id", user.id)
      .limit(20),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  const profile = profileResult.data;
  const displayName = profile?.display_name ?? "Gardener";
  const hardinessZone = profile?.hardiness_zone ?? "unknown";
  const lastFrostDate = profile?.last_frost_date ?? "unknown";

  // Extract distinct common names from the joined result
  const plantNames: string[] = [];
  if (plantsResult.data) {
    const seen = new Set<string>();
    for (const row of plantsResult.data as Array<{ plants: { common_name: string } | null }>) {
      const name = row.plants?.common_name;
      if (name && !seen.has(name)) {
        seen.add(name);
        plantNames.push(name);
      }
    }
  }
  const growingList = plantNames.length > 0 ? plantNames.join(", ") : "nothing yet";

  const historyMessages: Array<{ role: "user" | "assistant"; content: string }> =
    (historyResult.data ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const systemPrompt = `You are WeGarden's AI botanist — a friendly, expert gardening assistant.

User context:
- Name: ${displayName}
- Hardiness zone: ${hardinessZone}
- Last frost date: ${lastFrostDate}
- Currently growing: ${growingList}

Answer gardening questions with actionable, specific advice. When giving planting timing advice, account for the user's zone and frost dates. Keep responses concise (2–4 paragraphs max). Use plain text, no markdown.`;

  // Save user message before streaming
  const { error: insertUserMsgError } = await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "user", content: message.trim() });
  if (insertUserMsgError) {
    return new Response("Failed to save message", { status: 500 });
  }

  // Stream response
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit the session_id first
        controller.enqueue(sseEvent({ type: "session_id", session_id: sessionId }));

        const anthropicStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...historyMessages,
            { role: "user", content: message.trim() },
          ],
        });

        let fullResponse = "";

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(sseEvent({ type: "delta", text }));
          }
        }

        // Save assistant message after streaming completes
        await supabase
          .from("chat_messages")
          .insert({ session_id: sessionId, role: "assistant", content: fullResponse });

        controller.enqueue(sseEvent({ type: "done" }));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Streaming error";
        controller.enqueue(sseEvent({ type: "error", message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
