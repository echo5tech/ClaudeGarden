import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/social';
import { supabase } from '@/lib/supabase';

type Profile = {
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  hardiness_zone: string | null;
};

type Notification = {
  id: string;
  type: 'follow' | 'like' | 'comment';
  read_at: string | null;
  created_at: string;
  actor: { display_name: string; username: string | null } | null;
};

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://wegarden.app';

const VERB: Record<Notification['type'], string> = {
  follow: 'started following you',
  like: 'liked your post',
  comment: 'commented on your post',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, followersRes, followingRes, notificationsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, username, avatar_url, bio, hardiness_zone')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', user.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id),
      supabase
        .from('notifications')
        .select(
          'id, type, read_at, created_at, actor:profiles!notifications_actor_id_fkey(display_name, username)',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (profileRes.error) setError(profileRes.error.message);
    setProfile(profileRes.data as Profile | null);
    setFollowers(followersRes.count ?? 0);
    setFollowing(followingRes.count ?? 0);
    setNotifications((notificationsRes.data ?? []) as unknown as Notification[]);

    // Opening the screen counts as reading everything.
    void supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) void load();
    });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleSignOut() {
    setSigningOut(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Best-effort: stop push notifications to this signed-out device.
      await supabase
        .from('device_tokens')
        .delete()
        .match({ user_id: user.id, platform: Platform.OS });
    }
    await supabase.auth.signOut();
    // The SIGNED_OUT listener in _layout.tsx redirects to /auth.
    setSigningOut(false);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, gardens, posts, and photos. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase.rpc('delete_own_account');
            if (deleteError) {
              Alert.alert('Could not delete account', deleteError.message);
              return;
            }
            await supabase.auth.signOut();
          },
        },
      ],
    );
  }

  if (!profile && !error) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          style={styles.list}
          data={notifications ?? []}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.identityRow}>
                <View style={styles.avatarWrap}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <ThemedText style={styles.avatarFallback}>
                      {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.identityText}>
                  <ThemedText type="title">{profile?.display_name ?? 'You'}</ThemedText>
                  {profile?.username && (
                    <ThemedText type="small" themeColor="textSecondary">
                      @{profile.username}
                    </ThemedText>
                  )}
                </View>
              </View>

              {profile?.bio && <ThemedText type="small">{profile.bio}</ThemedText>}

              <ThemedText type="small" themeColor="textSecondary">
                {followers} followers · {following} following
                {profile?.hardiness_zone ? ` · zone ${profile.hardiness_zone}` : ''}
              </ThemedText>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => router.push('/onboarding')}
                  accessibilityRole="button"
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="linkPrimary">Change zone</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSignOut}
                  disabled={signingOut}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  style={({ pressed }) => (pressed || signingOut) && styles.pressed}>
                  <ThemedText type="linkPrimary">
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={confirmDeleteAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="small" style={styles.dangerText}>
                    Delete account
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
                  accessibilityRole="link"
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Terms
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
                  accessibilityRole="link"
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Privacy
                  </ThemedText>
                </Pressable>
              </View>

              {error && (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              )}

              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Notifications
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              Nothing yet. When gardeners follow you or react to your posts, it shows up here.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.notification}>
              <View style={styles.notificationBody}>
                <ThemedText type="small">
                  <ThemedText type="smallBold">
                    {item.actor?.display_name ?? 'Someone'}
                  </ThemedText>{' '}
                  {VERB[item.type]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {timeAgo(item.created_at)}
                </ThemedText>
              </View>
              {!item.read_at && <View style={styles.unreadDot} />}
            </ThemedView>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  list: { flex: 1 },
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 64, height: 64 },
  avatarFallback: { fontSize: 24, fontWeight: '700' },
  identityText: { flex: 1, minWidth: 0 },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  sectionTitle: { marginTop: Spacing.three },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  notificationBody: { flex: 1, gap: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.green,
  },
  error: { color: Palette.danger },
  dangerText: { color: Palette.danger },
  pressed: { opacity: 0.6 },
});
