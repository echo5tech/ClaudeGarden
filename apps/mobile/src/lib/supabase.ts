import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGardenClient } from "@garden/database";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/mobile/.env",
  );
}

// AsyncStorage's web fallback touches `window.localStorage` during session
// recovery. On the Expo Router pre-render pass there's no `window`, so omit
// the storage adapter then and let auth bootstrap fresh on the client.
const isServer = typeof window === "undefined";

export const supabase = createGardenClient(url, key, {
  auth: {
    ...(isServer ? {} : { storage: AsyncStorage }),
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
