import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./types";

export type GardenClientOptions = SupabaseClientOptions<"public">;

// Web (Next.js) and Mobile (Expo) each wire their own auth storage adapter:
//   web    → @supabase/ssr (cookie-based, see apps/web/lib/supabase/*)
//   mobile → AsyncStorage   (see apps/mobile/src/lib/supabase.ts)
// This factory only types the client; callers pass their platform-specific options.
export function createGardenClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: GardenClientOptions,
) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}

export type GardenClient = ReturnType<typeof createGardenClient>;
