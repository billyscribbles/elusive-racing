// Sentry init for the Node http server. Imported as the FIRST statement in
// server.js so the SDK's auto-instrumentation (uncaughtException,
// unhandledRejection, outgoing http) hooks in before anything else.
//
// Gated on SENTRY_DSN — when unset (local dev) the SDK is a no-op and the
// console.error patch below isn't installed.
import * as Sentry from '@sentry/node';

// Keys whose values must never reach Sentry. Match is case-insensitive and
// substring-based, so "customerEmail", "card_number", and "auth_token" all hit.
const SENSITIVE_KEY_RX = /(email|password|token|secret|cookie|authorization|card|cvc|cvv|pan|account.?number|iban)/i;

// Header names we always scrub regardless of value.
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-admin-token'];

// Recursively replace sensitive values with a placeholder. Cheap, mutating, depth-limited
// to keep big payloads bounded.
function scrub(obj, depth = 0) {
  if (depth > 6 || obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => scrub(v, depth + 1));
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY_RX.test(k)) {
      out[k] = '[scrubbed]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = scrub(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function scrubHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(k.toLowerCase())) out[k] = '[scrubbed]';
    else out[k] = v;
  }
  return out;
}

// Strip sensitive query-string params (e.g. password-reset ?key=...) from a URL.
function scrubUrl(url) {
  if (typeof url !== 'string' || !url.includes('?')) return url;
  try {
    const u = new URL(url, 'http://_');
    for (const param of ['key', 'token', 'password', 'email', 'reset_key', 'access_token']) {
      if (u.searchParams.has(param)) u.searchParams.set(param, '[scrubbed]');
    }
    const qs = u.searchParams.toString();
    return u.pathname + (qs ? '?' + qs : '');
  } catch {
    return url.split('?')[0] + '?[scrubbed]';
  }
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Strip PII before anything is sent. Sentry's `sendDefaultPii: false` is the
  // top-level switch; this hook handles values we explicitly include via
  // scope.setExtra / breadcrumbs / request capture.
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      if (event.request.headers) event.request.headers = scrubHeaders(event.request.headers);
      if (event.request.cookies) event.request.cookies = '[scrubbed]';
      if (event.request.data) event.request.data = scrub(event.request.data);
      if (event.request.query_string) event.request.query_string = '[scrubbed]';
      if (event.request.url) event.request.url = scrubUrl(event.request.url);
    }
    if (event.extra) event.extra = scrub(event.extra);
    if (event.contexts) event.contexts = scrub(event.contexts);
    if (event.user) {
      // Keep id for correlation, drop email/username/ip.
      event.user = event.user.id ? { id: event.user.id } : undefined;
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (!breadcrumb) return breadcrumb;
    if (breadcrumb.data) breadcrumb.data = scrub(breadcrumb.data);
    if (breadcrumb.message) {
      // Mask anything that smells like an email or a long key in raw log strings.
      breadcrumb.message = String(breadcrumb.message)
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
        .replace(/\b(sk|pk|rk|ck|cs)_(live|test)_[A-Za-z0-9]{8,}/g, '[key]');
    }
    if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
      breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
    }
    return breadcrumb;
  },
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
