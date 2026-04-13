# Launch TODO — Elusive Racing

Pre-production punch list from the April 2026 audit. Fix all 🔴 Critical and 🟠 High items before flipping DNS. Medium/Low can ship in a v1.1 patch.

> **Progress legend:** ✅ done (code) · ⏳ done, needs user action (rotate/provide value) · ⬜ not started

---

## 🔴 Critical — must fix before launch

- [ ] **C1. WC consumer key/secret leaked in client bundle**
  `src/lib/woocommerce.js:9-14` — `VITE_WC_CONSUMER_KEY` / `VITE_WC_CONSUMER_SECRET` are baked into `dist/assets/*.js`. Any visitor can extract them and hit WC REST with full read/write.
  **Fix:** proxy all privileged WC calls through `server.js`. Rename env vars to non-`VITE_` and rotate the key pair in WP admin after cutover.

- [x] ✅ **C2. Stripe orphan orders** — DONE
  Removed silent `.catch`. Added `placeOrderWithRetry` (3 attempts, exponential backoff). Stores PaymentIntent ID on both the WC order metadata and the local snapshot. `OrderConfirmationPage` now shows a warning banner with the PaymentIntent ID as a reference when WC creation fails, so customers can quote it to support. Logs `[orphan-order]` to console — wire to Sentry in H5.
  **Still manual:** set up an admin email/webhook alert endpoint so orphan orders proactively notify staff instead of relying on console logs + customer inbound.

- [ ] **C3. BACS bank details are placeholder `"1234 5678"`**
  `src/pages/PaymentPage.jsx:232-237`. Replace with real Elusive Racing CBA account. Extract to config/env.

- [ ] **C4. Stripe is on TEST keys**
  `.env` `sk_test_*` / `pk_test_*`. Swap to live keys in production env only. Add a `server.js` boot guard that refuses to start if `NODE_ENV==='production'` and key starts with `sk_test_`.

- [x] ✅ **C5. Cart `removeItem` / `updateQuantity` variantId bug** — DONE
  Both now take `(id, variantId)`. Updated callers in `CheckoutPage.jsx` and `CartIcon.jsx`. Also fixed the React `key` collision on same product with different variants (both cart renders now use `` `${id}-${variantId ?? 'base'}` ``).

- [x] ✅ **C6. Order persistence** — DONE
  `orderStore` now uses `localStorage` (was `sessionStorage`). Receipts now survive tab close, so customers can re-download their PDF receipt the next day. `clearCart()`/`resetCheckout()` still fire on mount of the confirmation page, but `order` is preserved.

---

## 🟠 High — fix before launch (or ship with a documented mitigation)

- [ ] **H1. Admin endpoints: CORS wildcard + no rate limit + weak password**
  `server.js` ~L492, L602, L623, L629-642. Every response sets `Access-Control-Allow-Origin: *`. `/api/admin/login` has no rate limit. `ADMIN_PASSWORD=Elusive123!` is too weak.
  **Fix:** restrict CORS to prod + staging origins. Add IP-based rate limit (5 attempts / 15 min) on admin login. Strong random `ADMIN_PASSWORD`. Fail fast at boot if `ADMIN_JWT_SECRET` unset in production (don't rely on `'change-me-in-production'` fallback at `server.js:38`).

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

- [ ] **H7. Product description HTML not sanitised**
  `src/pages/ProductPage.jsx:604` — `dangerouslySetInnerHTML` on WC description. Pipe through `DOMPurify.sanitize` with an allowlist. Same for chat widget markdown at `src/components/ui/ChatWidget.jsx:188`.

- [x] ✅ **H8. Hero videos on mobile** — ALREADY CORRECT
  Verified: `Hero.jsx:150` already gates the `<video>` elements on `!isMobile` (now `shouldPlayVideo`), so mobile visitors never mount them and never request the mp4 files. Confirmed in source.

- [x] ✅ **H9. Shipping rate failure UX** — DONE
  `getWCShippingRates` now returns `{ ok, rates, taxAmount, error }`. `ContactPage` surfaces the error string as a red banner (domestic flow) and as a banner + manual-quote fallback (international flow). Distinguishes HTTP errors, network errors, and zone-not-configured states.

- [ ] **H10. No stock re-check before payment**
  `src/pages/PaymentPage.jsx`. Stock is only checked at add-to-cart. Between add and pay, items can deplete → Stripe charges → WC rejects `placeOrder` → orphan order (ties in with C2).
  **Fix:** re-validate stock immediately before `stripe.confirmCardPayment`. Block payment if any line is short.

- [x] ✅ **H11. React error boundary** — DONE
  Added `src/components/ErrorBoundary.jsx` and wrapped `<Suspense><Routes/></Suspense>` in `App.jsx`. Friendly fallback with Reload / Home buttons. Dev mode shows stack trace. Has a commented-out Sentry hook point for when H5 is wired.

- [ ] **H12. Build-time secret scan**
  Add a pre-deploy gate: `npm run build && grep -RE 'ck_[a-f0-9]{40}|cs_[a-f0-9]{40}|sk_live|sk_test' dist/` must return zero lines.

---

## 🟡 Medium — fix before or shortly after launch

- [ ] **M1. Rotate all secrets regardless** (WC key pair, Stripe restricted key, Meilisearch admin key, `ADMIN_JWT_SECRET`, Anthropic API key, admin password). Document in a password manager.
- [ ] **M2. Security headers** — CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS. Set in `server.js` or hosting layer.
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
- [ ] **M10. Env var boot validation** — `server.js` should fail fast with clear errors if `STRIPE_SECRET_KEY`, `WC_URL`, `ADMIN_JWT_SECRET`, `MEILISEARCH_HOST` missing in prod.
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
