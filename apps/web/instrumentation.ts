import * as Sentry from '@sentry/nextjs';

// Server + edge error monitoring. No-ops entirely when SENTRY_DSN is unset,
// so local dev and CI need no configuration.
export function register() {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
