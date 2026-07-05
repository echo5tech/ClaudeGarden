import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchComments,
  setLiked,
  timeAgo,
  type FeedPost,
  type PostComment,
} from '@/lib/social';
import { supabase } from '@/lib/supabase';

export function FeedPostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const theme = useTheme();
  const router = useRouter();

  const [liked, setLikedState] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  async function toggleLike() {
    const next = !liked;
    setLikedState(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = await setLiked(currentUserId, post.id, next);
    if (error) {
      setLikedState(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      setComments(await fetchComments(post.id));
    }
  }

  async function submitComment() {
    const body = commentDraft.trim();
    if (!body || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: currentUserId, body });
    if (!error) {
      setCommentDraft('');
      setComments(await fetchComments(post.id));
      setCommentCount((c) => c + 1);
    }
    setSendingComment(false);
  }

  const authorName = post.profiles?.display_name ?? 'Unknown';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {post.profiles?.avatar_url ? (
            <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <ThemedText style={styles.avatarFallback}>
              {authorName.slice(0, 1).toUpperCase()}
            </ThemedText>
          )}
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {authorName}
          </ThemedText>
          {post.profiles?.username && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              @{post.profiles.username}
            </ThemedText>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(post.created_at)}
        </ThemedText>
      </View>

      <ThemedText style={styles.body}>{post.body}</ThemedText>

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
      )}

      {post.gardens && (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/garden-detail', params: { gardenId: post.gardens!.id } })
          }
          style={({ pressed }) => [styles.gardenTag, pressed && styles.pressed]}>
          <ThemedText type="small">🌱 {post.gardens.name}</ThemedText>
        </Pressable>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText type="small" style={liked ? styles.likedText : undefined}>
            {liked ? '♥' : '♡'} {likeCount > 0 ? likeCount : ''}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={toggleComments}
          accessibilityRole="button"
          accessibilityLabel="Show comments"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            💬 {commentCount > 0 ? commentCount : ''}
          </ThemedText>
        </Pressable>
      </View>

      {showComments && (
        <View style={styles.commentsWrap}>
          {comments === null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : comments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No comments yet.
            </ThemedText>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <ThemedText type="smallBold">
                  {comment.profiles?.display_name ?? 'Unknown'}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    {timeAgo(comment.created_at)}
                  </ThemedText>
                </ThemedText>
                <ThemedText type="small">{comment.body}</ThemedText>
              </View>
            ))
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              style={[styles.commentInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
              placeholder="Add a comment…"
              placeholderTextColor={theme.textSecondary}
              value={commentDraft}
              onChangeText={setCommentDraft}
              maxLength={2000}
              editable={!sendingComment}
            />
            <Pressable
              onPress={submitComment}
              disabled={sendingComment || !commentDraft.trim()}
              style={({ pressed }) => [
                styles.commentSend,
                { backgroundColor: theme.backgroundSelected },
                (pressed || sendingComment || !commentDraft.trim()) && styles.pressed,
              ]}>
              <ThemedText type="small">Send</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 36, height: 36 },
  avatarFallback: { fontWeight: '700' },
  headerText: { flex: 1, minWidth: 0 },
  body: { flexShrink: 1 },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  gardenTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Palette.greenTint,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  action: { paddingVertical: Spacing.one },
  likedText: { color: Palette.like },
  commentsWrap: { gap: Spacing.two },
  comment: { gap: 2 },
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
  },
  commentSend: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  pressed: { opacity: 0.6 },
});
