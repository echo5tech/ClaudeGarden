import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/');
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }
    const user = data.user;
    if (!user) {
      setLoading(false);
      setError('Sign up succeeded but no user returned. Check your email for a confirmation link.');
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, display_name: displayName.trim() });
    setLoading(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    router.replace('/onboarding');
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inner}>
            <ThemedText type="title" style={styles.appName}>
              WeGarden
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
              {mode === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
            </ThemedText>

            {error && (
              <ThemedView type="backgroundElement" style={styles.errorBox}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </ThemedView>
            )}

            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              {mode === 'signUp' && (
                <TextInput
                  style={inputStyle}
                  placeholder="Display name"
                  placeholderTextColor={theme.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                />
              )}

              <TextInput
                style={inputStyle}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <ThemedText type="smallBold">
                    {mode === 'signIn' ? 'Sign In' : 'Create Account'}
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              onPress={() => {
                setError(null);
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              }}>
              <ThemedText type="linkPrimary" style={styles.toggleText}>
                {mode === 'signIn'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  appName: { textAlign: 'center' },
  tagline: { textAlign: 'center' },
  errorBox: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  errorText: { color: '#c00' },
  form: {
    width: '100%',
    gap: Spacing.two,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  toggleText: { textAlign: 'center' },
});
