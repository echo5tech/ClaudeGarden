import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

/**
 * Registers the device for Expo push notifications and upserts the token into
 * the `device_tokens` table for the currently authenticated user.
 *
 * Requirements:
 *   - expo-notifications  (already in package.json)
 *   - expo-device         (already in package.json)
 *   - expo-constants      (already in package.json)
 *
 * Skips silently when:
 *   - Running on web (Platform.OS === 'web')
 *   - Not a physical device AND not the iOS simulator
 *   - Notification permission is denied
 *   - No authenticated user session exists
 */
export function usePushRegistration() {
  useEffect(() => {
    async function register() {
      // Push tokens are not available on web.
      if (Platform.OS === "web") return;

      // Physical device check. expo-notifications also works on the iOS
      // simulator for development purposes, so we allow it there too.
      const isPhysicalDevice = Device.isDevice;
      const isIOSSimulator = Platform.OS === "ios" && !isPhysicalDevice;
      if (!isPhysicalDevice && !isIOSSimulator) return;

      // Only run when there is a signed-in user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Request permission.
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;

      // Retrieve the Expo push token.
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Map Platform.OS to the CHECK constraint in device_tokens.
      const platform = Platform.OS as "ios" | "android" | "web";

      // Upsert into device_tokens. The unique constraint is (user_id, platform).
      const { error: upsertError } = await supabase
        .from("device_tokens")
        .upsert(
          {
            user_id: user.id,
            platform,
            token: pushToken.data,
          },
          { onConflict: "user_id,platform" },
        );

      if (upsertError) {
        console.warn("[usePushRegistration] upsert failed:", upsertError);
      }
    }

    register();
  }, []);
}
