import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedPostCard } from '@/components/feed-post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchFeed, type FeedPost } from '@/lib/social';
import { supabase } from '@/lib/supabase';

function Composer({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setImageUri(result.assets[0].uri);
    setImageWidth(result.assets[0].width ?? null);
  }

  async function submit() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (imageUri) {
        const MAX_WIDTH = 1600;
        const context = ImageManipulator.manipulate(imageUri);
        if (imageWidth && imageWidth > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
        const rendered = await context.renderAsync();
        const compressed = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
        const arrayBuffer = await new File(compressed.uri).arrayBuffer();
        const path = `${userId}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
        if (uploadError) throw new Error(uploadError.message);
        imageUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
      }

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: userId,
        body,
        image_url: imageUrl,
      });
      if (insertError) throw new Error(insertError.message);

      setDraft('');
      setImageUri(null);
      setImageWidth(null);
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.composer}>
      <TextInput
        style={[styles.composerInput, { color: theme.text }]}
        placeholder="What's growing in your garden?"
        placeholderTextColor={theme.textSecondary}
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={2000}
        editable={!posting}
      />
      <View style={styles.composerRow}>
        <Pressable
          onPress={pickImage}
          accessibilityRole="button"
          accessibilityLabel="Attach photo"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary">
            📷 {imageUri ? 'Photo attached' : 'Add photo'}
          </ThemedText>
        </Pressable>
        {error && (
          <ThemedText type="small" style={styles.error} numberOfLines={1}>
            {error}
          </ThemedText>
        )}
        <Pressable
          onPress={submit}
          disabled={posting || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Post"
          style={({ pressed }) => [
            styles.postButton,
            { backgroundColor: theme.backgroundSelected },
            (pressed || posting || !draft.trim()) && styles.pressed,
          ]}>
          <ThemedText type="smallBold">{posting ? 'Posting…' : 'Post'}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (uid: string) => {
    const { posts: feed, error: feedError } = await fetchFeed(uid);
    setError(feedError);
    setPosts(feed);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        void load(user.id);
      }
    });
  }, [load]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await load(userId);
    setRefreshing(false);
  }, [userId, load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Home</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {(!posts || !userId) && !error && <ActivityIndicator style={styles.loader} />}

        {posts && userId && (
          <FlatList
            style={styles.list}
            data={posts}
            keyExtractor={(p) => p.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <Composer userId={userId} onPosted={() => void load(userId)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyIcon}>🌻</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Your feed is empty. Follow gardeners in Explore, or write your first post above.
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/explore')}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="linkPrimary">Explore public gardens →</ThemedText>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => <FeedPostCard post={item} currentUserId={userId} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  loader: { marginTop: Spacing.four },
  list: { flex: 1 },
  composer: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  composerInput: {
    minHeight: 56,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  postButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { textAlign: 'center' },
  error: { color: Palette.danger, flexShrink: 1 },
  pressed: { opacity: 0.6 },
});
