import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { supabase } from '@/lib/supabase';

function AuthenticatedApp() {
  usePushRegistration();
  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [hasZone, setHasZone] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  async function checkZone(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('hardiness_zone')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.hardiness_zone != null;
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
