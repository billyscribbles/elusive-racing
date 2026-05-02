// Sentry init for the Node http server. Imported as the FIRST statement in
// server.js so the SDK's auto-instrumentation (uncaughtException,
// unhandledRejection, outgoing http) hooks in before anything else.
//
// Gated on SENTRY_DSN — when unset (local dev) the SDK is a no-op and the
// console.error patch below isn't installed.
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

// Forward any Error passed to console.error into Sentry. server.js has ~30
// "} catch (err) { console.error('[x]', err); res.writeHead(500); ... }"
// handlers — wiring Sentry.captureException into each one would be churn and
// easy to miss on future routes. Instead we observe console.error: if any
// argument is an Error instance, capture it. Plain string warnings stay local.
if (process.env.SENTRY_DSN) {
  const origConsoleError = console.error;
  console.error = (...args) => {
    const err = args.find((a) => a instanceof Error);
    if (err) Sentry.captureException(err);
    origConsoleError.apply(console, args);
  };
}
