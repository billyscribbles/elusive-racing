// Sentry init sidecar — must be imported FIRST in src/main.jsx, before any
// other application code runs. Loading any other module before this can mean
// errors thrown during early module evaluation aren't captured.
//
// Privacy posture for this storefront:
// - sendDefaultPii is OFF (we override the SDK's `true` default) because the
//   site has a checkout flow with email + address fields. Re-enable only with
//   a beforeSend scrub if/when we actually need IPs/headers for diagnostics.
// - Replay masks all text + blocks media. Stripe Elements run in iframes so
//   card numbers were never in our DOM anyway, but other form values are
//   masked too as a safety net.
//
// The whole SDK is gated on VITE_SENTRY_DSN. With the var unset (local dev
// without a DSN), `enabled: false` makes init a no-op — no network calls.
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION || undefined,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: false,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
