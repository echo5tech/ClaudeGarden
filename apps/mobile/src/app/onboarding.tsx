import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ZONE_LAST_FROST_MMDD, nextLastFrostDate } from '@garden/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ZONES = [
  '1a', '1b',
  '2a', '2b',
  '3a', '3b',
  '4a', '4b',
  '5a', '5b',
  '6a', '6b',
  '7a', '7b',
  '8a', '8b',
  '9a', '9b',
  '10a', '10b',
  '11a',
  '12a',
] as const;

type Zone = (typeof ZONES)[number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMmdd(mmdd: string): string {
  const [mm, dd] = mmdd.split('-');
  return `${MONTHS[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [selected, setSelected] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError('Not signed in. Please go back and sign in.');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        hardiness_zone: selected,
        last_frost_date: nextLastFrostDate(selected, new Date()),
      })
      .eq('user_id', user.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/');
  }

  function handleSkip() {
    router.replace('/');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Where do you garden?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Select your USDA hardiness zone so we can tailor planting dates for you.
          </ThemedText>
        </View>

        {error && (
          <View style={styles.errorWrapper}>
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        )}

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {ZONES.map((zone) => {
            const isSelected = selected === zone;
            return (
              <Pressable
                key={zone}
                onPress={() => setSelected(zone)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <ThemedView
                  type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.zoneRow}>
                  <ThemedText type="smallBold">Zone {zone.toUpperCase()}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {ZONE_LAST_FROST_MMDD[zone]
                      ? `Last frost ~${formatMmdd(ZONE_LAST_FROST_MMDD[zone])}`
                      : 'Frost-free'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: BottomTabInset + Spacing.three }]}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={handleContinue}
            disabled={!selected || loading}>
            {loading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="smallBold">Continue</ThemedText>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            onPress={handleSkip}>
            <ThemedText type="linkPrimary" style={styles.skipText}>
              Skip for now
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  errorWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  errorText: { color: '#c00' },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  zoneRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { textAlign: 'center' },
});
