import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/botanist-chat`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function BotanistScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsgId = Math.random().toString(36).slice(2);
    const assistantMsgId = Math.random().toString(36).slice(2);

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: trimmed },
      { id: assistantMsgId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setIsStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      // React Native's fetch ReadableStream support varies; use the response text
      // approach on native and stream on web.
      if (Platform.OS === 'web') {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            processSSELine(line, assistantMsgId);
          }
        }
      } else {
        // On native, fetch returns the full body at once (no streaming support in RN).
        // Parse all SSE events from the accumulated text.
        const text = await res.text();
        const lines = text.split('\n');
        for (const line of lines) {
          processSSELine(line, assistantMsgId);
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, streaming: false } : m,
        ),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: errMsg, streaming: false }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId]);

  function processSSELine(line: string, assistantMsgId: string) {
    if (!line.startsWith('data: ')) return;
    const raw = line.slice('data: '.length).trim();
    if (!raw) return;
    try {
      const event = JSON.parse(raw) as {
        type: string;
        session_id?: string;
        text?: string;
      };
      if (event.type === 'session_id' && event.session_id) {
        setSessionId(event.session_id);
      } else if (event.type === 'delta' && event.text) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + event.text! }
              : m,
          ),
        );
      }
    } catch {
      // Ignore malformed lines
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <ThemedView
          type={isUser ? 'backgroundElement' : 'backgroundElement'}
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {item.streaming && item.content === '' ? (
            <ThemedText type="small" themeColor="textSecondary">
              ...
            </ThemedText>
          ) : (
            <ThemedText type="small">{item.content}</ThemedText>
          )}
        </ThemedView>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          AI Botanist
        </ThemedText>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Ask me anything about your garden — planting timing, pest problems,
                companion plants, harvest tips...
              </ThemedText>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}

          {/* Input row */}
          <View
            style={[
              styles.inputRow,
              { backgroundColor: theme.background, borderTopColor: theme.backgroundElement },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your garden..."
              placeholderTextColor={theme.textSecondary}
              multiline
              editable={!isStreaming}
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
            <Pressable
              onPress={sendMessage}
              disabled={isStreaming || !input.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                (isStreaming || !input.trim()) && styles.sendButtonDisabled,
                pressed && styles.sendButtonPressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.sendButtonText}>
                Send
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  keyboardAvoid: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  bubbleUser: {
    // Green tint via background type override isn't possible without custom component,
    // so we use a direct style override for the user bubble green background
    backgroundColor: '#166534',
  },
  bubbleAssistant: {},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#16a34a',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonPressed: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#ffffff',
  },
});
