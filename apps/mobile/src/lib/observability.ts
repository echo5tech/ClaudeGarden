import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';

// Crash reporting + product analytics. Both no-op without their env vars,
// so local dev needs no configuration.

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  });
}

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

/** Shared PostHog client, or null when analytics are not configured. */
export const analytics: PostHog | null = posthogKey
  ? new PostHog(posthogKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    })
  : null;

export function trackScreen(name: string) {
  analytics?.screen(name);
}
