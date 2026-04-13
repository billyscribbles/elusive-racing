// Central consent helper. Analytics (GA4) and error monitoring (Sentry) should
// be gated on `hasAnalyticsConsent()` so we never fire a tracking script before
// the visitor has made a choice.
//
// Storage keys match react-cookie-consent's defaults so the banner and these
// helpers agree on state without manual wiring.

const COOKIE_KEY = 'elusive_consent';

export function getStoredConsent() {
  try {
    return localStorage.getItem(COOKIE_KEY);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return getStoredConsent() === 'true';
}

export function hasDeclinedConsent() {
  return getStoredConsent() === 'false';
}

export function setConsent(accepted) {
  try {
    localStorage.setItem(COOKIE_KEY, accepted ? 'true' : 'false');
  } catch {
    /* localStorage unavailable — fine, user will be re-prompted next visit */
  }
  // Fire a custom event so any already-mounted analytics gate can react.
  window.dispatchEvent(new CustomEvent('elusive:consent-change', { detail: { accepted } }));
}

export const CONSENT_COOKIE_KEY = COOKIE_KEY;
