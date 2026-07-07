import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// Browser-side error monitoring + product analytics. Both no-op without
// their env vars, so local dev and CI need no configuration.

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.1,
  });
}

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: 'history_change',
    capture_exceptions: false, // Sentry owns errors
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
