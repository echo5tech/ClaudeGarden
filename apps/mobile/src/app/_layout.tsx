import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';

import AppTabs from '@/components/app-tabs';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { useNotificationObserver } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { onboardingDismissedKey } from '@/app/onboarding';

function AuthenticatedApp() {
  usePushRegistration();
  useNotificationObserver();
  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [hasZone, setHasZone] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // "Needs onboarding" = no zone AND the user has never completed or skipped
  // the onboarding screen on this device.
  async function checkZone(userId: string): Promise<boolean> {
    const [{ data }, dismissed] = await Promise.all([
      supabase
        .from('profiles')
        .select('hardiness_zone')
        .eq('user_id', userId)
        .maybeSingle(),
      AsyncStorage.getItem(onboardingDismissedKey(userId)),
    ]);
    return data?.hardiness_zone != null || dismissed != null;
  }

  useEffect(() => {
    // Bootstrap: resolve session on mount.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const zone = await checkZone(s.user.id);
        setHasZone(zone);
      }
      setLoading(false);
    });

    // React to sign-in / sign-out events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (event === 'SIGNED_OUT') {
          setHasZone(false);
          router.replace('/auth');
          return;
        }
        if (event === 'SIGNED_IN' && s?.user) {
          const zone = await checkZone(s.user.id);
          setHasZone(zone);
          router.replace(zone ? '/' : '/onboarding');
        }
      },
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect unauthenticated / missing-zone users once loading is done.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth');
    } else if (!hasZone) {
      router.replace('/onboarding');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, hasZone]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {session ? <AuthenticatedApp /> : null}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
