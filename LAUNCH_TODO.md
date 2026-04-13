# Launch TODO — Elusive Racing

Pre-production punch list from the April 2026 audit. Fix all 🔴 Critical and 🟠 High items before flipping DNS. Medium/Low can ship in a v1.1 patch.

> **Progress legend:** ✅ done (code) · ⏳ done, needs user action (rotate/provide value) · ⬜ not started

---

## 🔴 Critical — must fix before launch

- [x] ⏳ **C1. WC consumer key/secret leak** — CODE DONE, ROTATION STILL NEEDED
  Built a narrowly-whitelisted WC REST proxy at `/api/wc/*` in `server.js` (`handleWcProxy`). Whitelist: `products`, `products/categories`, `products/tags`, `products/attributes`, `brands` — customers/orders/reports/settings are explicitly NOT exposed. `src/lib/woocommerce.js` now calls `/api/wc/*` same-origin with no credentials in the browser. VITE_WC_CONSUMER_KEY/SECRET reads removed from all frontend code (`VITE_WC_URL` retained since it's just the public hostname). Server reads the creds as `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` primarily, with `VITE_WC_CONSUMER_KEY`/`SECRET` kept as a fallback for backwards compat.
  **Verified:** `grep -rE 'ck_[a-f0-9]{30,}|cs_[a-f0-9]{30,}' dist/` → zero matches. Built bundle contains `"/api/wc"` and no `wp-json/wc/v3` references.
  **Still need from you:**
  1. Assume the current WC key pair is compromised — rotate it in WP admin (WooCommerce → Settings → Advanced → REST API → revoke & regenerate).
  2. In your prod env, set `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` (non-VITE names). You can delete the `VITE_WC_CONSUMER_*` vars from `.env` entirely.

- [x] ✅ **C2. Stripe orphan orders** — DONE
  Removed silent `.catch`. Added `placeOrderWithRetry` (3 attempts, exponential backoff). Stores PaymentIntent ID on both the WC order metadata and the local snapshot. `OrderConfirmationPage` now shows a warning banner with the PaymentIntent ID as a reference when WC creation fails, so customers can quote it to support. Logs `[orphan-order]` to console — wire to Sentry in H5.
  **Still manual:** set up an admin email/webhook alert endpoint so orphan orders proactively notify staff instead of relying on console logs + customer inbound.

- [ ] **C3. BACS bank details are placeholder `"1234 5678"`**
  `src/pages/PaymentPage.jsx:232-237`. Replace with real Elusive Racing CBA account. Extract to config/env.

- [x] ⏳ **C4. Stripe live key boot guard** — CODE DONE, KEYS STILL NEEDED
  `server.js` now has a `validateProductionConfig()` block that runs at boot. When `NODE_ENV=production`, it refuses to start if Stripe key is missing / is `sk_test_*`, if WC credentials / URL are missing, if `ADMIN_JWT_SECRET` is missing or equals the default placeholder, if admin username/password aren't set, or if `ALLOWED_ORIGINS` is empty. All errors printed together before `process.exit(1)`.
  **Still need from you:** live Stripe key + all other prod env vars in the deploy environment.

- [x] ✅ **C5. Cart `removeItem` / `updateQuantity` variantId bug** — DONE
  Both now take `(id, variantId)`. Updated callers in `CheckoutPage.jsx` and `CartIcon.jsx`. Also fixed the React `key` collision on same product with different variants (both cart renders now use `` `${id}-${variantId ?? 'base'}` ``).

- [x] ✅ **C6. Order persistence** — DONE
  `orderStore` now uses `localStorage` (was `sessionStorage`). Receipts now survive tab close, so customers can re-download their PDF receipt the next day. `clearCart()`/`resetCheckout()` still fire on mount of the confirmation page, but `order` is preserved.

---

## 🟠 High — fix before launch (or ship with a documented mitigation)

- [x] ⏳ **H1. Admin hardening** — CODE DONE, PROD VALUES STILL NEEDED
  - **Rate limit:** in-memory IP map on `/api/admin/login` — 5 attempts / 15 min window. Returns `429` with `Retry-After` header. Failed attempts logged with `[admin-login]` prefix.
  - **CORS allowlist:** new `ALLOWED_ORIGINS` env var (comma-separated). `adminJson()` echoes the request origin if allowed, else falls back to the first allowed origin. Empty in dev = wildcard (dev-only).
  - **JWT secret boot check:** rolled into `validateProductionConfig()` — refuses to start in prod with default placeholder.
  **Still need from you:** set `ALLOWED_ORIGINS=https://elusiveracing.com.au,https://www.elusiveracing.com.au,<staging>` and rotate `ADMIN_PASSWORD` to a strong random string in the deploy environment.

- [x] ✅ **H2. 404 catch-all route** — DONE
  Added `NotFoundPage` at `src/pages/NotFoundPage.jsx` + catch-all `<Route path="*" />` in `src/App.jsx`. Injects `<meta name="prerender-status-code" content="404">` for prerender services and sets `<meta name="robots" content="noindex">`. Still serves HTTP 200 at the host layer (SPA) — for true 404s in crawlers you'll need prerender.io or static 404 from hosting.

- [ ] **H3. No redirect map from the old WordPress URLs**
  Inbound SEO equity (old `/product/*`, `/product-category/*`, `/brand/*`) will evaporate on launch day if the new URL scheme differs. Crawl the old site, build a 301 map in `server.js` or hosting config (Netlify `_redirects` / Vercel `vercel.json` / nginx).

- [ ] **H4. Missing `sitemap.xml`**
  `public/robots.txt` references it but the file doesn't exist. Generate at build time from WC products/categories/brands + static routes. Submit to GSC on launch day.

- [ ] **H5. No analytics, no error monitoring**
  Zero GA4, GTM, Sentry, Rollbar, LogRocket.
  **Fix:** GA4 via GTM with enhanced ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`) + `@sentry/react` on frontend + `@sentry/node` on `server.js`.

- [ ] **H6. No cookie / privacy consent banner**
  Required for AU Privacy Act + GDPR. Use `react-cookie-consent` or similar. Gate analytics (H5) on accept.

- [x] ✅ **H7. HTML sanitisation** — DONE
  Installed `dompurify`. Added `src/lib/sanitizeHtml.js` with a strict allowlist for tags/attrs WC and marked actually emit. Added an `afterSanitizeAttributes` hook that forces `target="_blank" rel="noopener noreferrer"` on every `<a>`. Wired into `ProductPage` (product description) and `ChatWidget` (bot markdown). Safe for renaming: `sanitizeHtml()` is the single choke-point.

- [x] ✅ **H8. Hero videos on mobile** — ALREADY CORRECT
  Verified: `Hero.jsx:150` already gates the `<video>` elements on `!isMobile` (now `shouldPlayVideo`), so mobile visitors never mount them and never request the mp4 files. Confirmed in source.

- [x] ✅ **H9. Shipping rate failure UX** — DONE
  `getWCShippingRates` now returns `{ ok, rates, taxAmount, error }`. `ContactPage` surfaces the error string as a red banner (domestic flow) and as a banner + manual-quote fallback (international flow). Distinguishes HTTP errors, network errors, and zone-not-configured states.

- [x] ✅ **H10. Live stock re-check before payment** — DONE
  New `POST /api/check-stock` endpoint in `server.js` that queries WC REST for each cart line and classifies issues as `out_of_stock` / `insufficient_stock` / `not_found`. Fails open on network errors (better than blocking customers during a WC blip). New `checkStock()` helper in `src/lib/woocommerce.js`. `StripePaymentForm.handleSubmit` now calls it before `stripe.confirmPayment` — if any line fails, payment is blocked and the customer sees a per-line breakdown. BACS intentionally skipped (no charge at checkout time, so WC's own stock check suffices).

- [x] ✅ **H11. React error boundary** — DONE
  Added `src/components/ErrorBoundary.jsx` and wrapped `<Suspense><Routes/></Suspense>` in `App.jsx`. Friendly fallback with Reload / Home buttons. Dev mode shows stack trace. Has a commented-out Sentry hook point for when H5 is wired.

- [ ] **H12. Build-time secret scan**
  Add a pre-deploy gate: `npm run build && grep -RE 'ck_[a-f0-9]{40}|cs_[a-f0-9]{40}|sk_live|sk_test' dist/` must return zero lines.

---

## 🟡 Medium — fix before or shortly after launch

- [ ] **M1. Rotate all secrets regardless** (WC key pair, Stripe restricted key, Meilisearch admin key, `ADMIN_JWT_SECRET`, Anthropic API key, admin password). Document in a password manager.
- [x] ✅ **M2. Security headers (baseline)** — DONE
  Added `securityHeaders()` helper in `server.js`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/FLoC off), and `Strict-Transport-Security` (only when `NODE_ENV=production` to avoid breaking localhost). Applied to SPA fallback, static assets, and all admin JSON responses. **CSP deliberately deferred** — needs to enumerate Stripe, GTM, Helmet, Sentry origins first, which happens in H5.
- [x] ✅ **M3. Stale promo banner** — DONE
  Updated all four copies of the fallback (`server.js:773`, `src/components/home/PromoBanner.jsx:8`, `src/pages/admin/AdminPromoBanner.jsx:15`/253, `data/promo-banner.json:5`) to remove the 2024 date. Note: the banner is not currently visible (`visible: false`) so this was cosmetic, but it removes the embarrassment if anyone toggles it on.
- [ ] **M4. Meilisearch fallback** — if Meili is down, fall back to WC REST search or show a clear "Search unavailable" state.
- [ ] **M5. 420px breakpoint check** — CLAUDE.md mandates 420px; smallest media query is 480px. Manually verify cart drawer, checkout, product grid, mega menu at 375px and 400px.
- [x] ✅ **M6. Reduced-motion (partial)** — DONE for Hero
  `Hero.jsx` now reads `prefers-reduced-motion: reduce` and skips mounting the `<video>` elements entirely (poster image shown instead). Still TODO: marquees (`BrandsSection`) and chat widget slide-in animations.
- [x] ✅ **M7. Skip-to-content link** — DONE
  `<a href="#main-content" class="skip-link">` added in `MainLayout.jsx`. Hidden off-screen until keyboard-focused; shows as a red pill top-left. `<main>` gained `id="main-content"`. Styles in `App.css`.
- [x] ✅ **M8. Double-submit guard** — DONE
  Both `StripePaymentForm.handleSubmit` and `BacsForm.handleSubmit` now early-return if `loading === true`, in addition to the existing disabled-button UX.
- [x] ✅ **M9. AU phone validation** — DONE
  `ContactPage.validate()` now checks optional phone against `/^(\+?61|0)[2-478]\d{8}$/` (mobile + landline), stripping spaces/dashes/parens/dots first. Field stays optional — empty passes.
- [x] ✅ **M10. Env var boot validation** — DONE
  `validateProductionConfig()` at top of `server.js` — runs only when `NODE_ENV=production`, collects all missing/bad vars, prints them as a list, then `process.exit(1)`. Covers: Stripe secret key (missing + test key), WC URL + key + secret, ADMIN_JWT_SECRET (missing + default), ADMIN_USERNAME/PASSWORD, ALLOWED_ORIGINS. Meilisearch is intentionally soft-failed because the site works without search.
- [ ] **M11. Deploy config confirmation** — SPA fallback, immutable cache headers on `/assets/*`, no sourcemaps in prod (`build.sourcemap: false`), Node version pinned, `server.js` supervised (PM2/systemd/Docker).
- [ ] **M12. Cart version/migration field** for safe future schema changes.

---

## 🟢 Low — post-launch polish

- [ ] **L1.** JSON-LD structured data (`Product`, `Organization`, `LocalBusiness`, `BreadcrumbList`).
- [ ] **L2.** Open Graph / Twitter card tags per route.
- [ ] **L3.** Preload critical font files (`woff2`, `as="font" crossorigin`).
- [ ] **L4.** `manifest.json` + `theme-color`.
- [ ] **L5.** Replace `placeholder="…"` with real `<label>` elements on wholesale form.
- [ ] **L6.** Instagram section is static — note as manual refresh or wire IG Basic Display API.
- [ ] **L7.** Consider TypeScript migration (long-term).
- [ ] **L8.** Admin audit log (who approved which wholesale signup and when).

---

## Verification gate (run all 20 on staging before flipping DNS)

- [ ] 1. Secret scan on built bundle returns zero lines.
- [ ] 2. Full checkout happy path (Stripe `4242…`) → WC order + email received + cart cleared.
- [ ] 3. 3DS checkout (`4000 0025 0000 3155`).
- [ ] 4. Declined card (`4000 0000 0000 9995`) → error shown, no WC order, cart preserved.
- [ ] 5. Forced orphan test (throw after Stripe succeeds, before `placeOrder`) → retry/alert path fires, customer sees sensible message.
- [ ] 6. BACS order → real bank details shown, pending WC order, email sent.
- [ ] 7. Cart variant bug → add 2 sizes, remove one, verify correct one removed.
- [ ] 8. Wholesale pricing consistent across cart/checkout/final total for each tier.
- [ ] 9. Shipping: valid postcode, invalid postcode, PO Box, AusPost mocked failure → error banner shown.
- [ ] 10. Refresh `/order-confirmation` after paying → details still visible.
- [ ] 11. Admin: cross-origin fetch blocked by CORS; 10 bad logins → rate-limited.
- [ ] 12. Visit `/this-does-not-exist` → custom 404 page.
- [ ] 13. Mobile 375px & 420px walkthrough; hero video does not download.
- [ ] 14. Lighthouse: Perf ≥80 mobile, A11y ≥95, SEO ≥95, Best Practices ≥95.
- [ ] 15. OS reduced-motion on → hero autoplay disabled.
- [ ] 16. GA4 DebugView shows `purchase` event on successful order.
- [ ] 17. Sentry dashboard receives test error.
- [ ] 18. Spot-check 10 high-traffic old URLs → 301 to new equivalents.
- [ ] 19. Transactional emails land in Gmail/Outlook inbox (not spam). SPF/DKIM/DMARC checked.
- [ ] 20. Rollback plan documented; pre-launch commit tagged.

---

## Suggested execution order (~2–3 days)

1. **Day 1 AM (4h) — Money safety:** C1, C2, C3, C4, C5, C6.
2. **Day 1 PM (3h) — Admin hardening + error visibility:** H1, H7, H11, H5 (Sentry only).
3. **Day 2 AM (3h) — SEO + observability:** H2, H3, H4, H5 (GA4), H6.
4. **Day 2 PM (3h) — Commerce resilience + polish:** H9, H10, H8, M3, M1.
5. **Day 3 — Verification gate:** run all 20 verification steps; only after green → flip DNS.
