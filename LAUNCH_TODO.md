# Launch TODO — Elusive Racing

Pre-production punch list from the April 2026 audit. Fix all 🔴 Critical and 🟠 High items before flipping DNS. Medium/Low can ship in a v1.1 patch.

> **Progress legend:** ✅ done (code) · ⏳ done, needs user action (rotate/provide value) · ⬜ not started

---

## 🔴 Critical — must fix before launch

- [x] ⏳ **C1. WC consumer key/secret leak** — CODE DONE, ROTATION STILL NEEDED
  Built a narrowly-whitelisted WC REST proxy at `/api/wc/*` in `server.js` (`handleWcProxy`). Whitelist: `products`, `products/categories`, `products/tags`, `products/attributes`, `brands` — customers/orders/reports/settings are explicitly NOT exposed. `src/lib/woocommerce.js` now calls `/api/wc/*` same-origin with no credentials in the browser. VITE_WC_CONSUMER_KEY/SECRET reads removed from all frontend code (`VITE_WC_URL` retained since it's just the public hostname). Server reads the creds as `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET` primarily, with `VITE_WC_CONSUMER_KEY`/`SECRET` kept as a fallback for backwards compat.
  **Verified:** `grep -rE 'ck_[a-f0-9]{30,}|cs_[a-f0-9]{30,}' dist/` → zero matches. Built bundle contains `"/api/wc"` and no `wp-json/wc/v3` references.
  **Still need from you:**
  1. ~~Rotate the WC key pair~~ — **deferred:** site hasn't launched yet, credentials were never actually exposed to the public, so the current pair is fine. If the repo ever becomes public before launch, or you see unexpected WC activity, rotate immediately.
  2. In your prod env, set `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` (non-VITE names). You can delete the `VITE_WC_CONSUMER_*` vars from `.env` entirely.

- [x] ⏳ **C4. Stripe live key boot guard** — CODE DONE, KEYS STILL NEEDED
  `server.js` now has a `validateProductionConfig()` block that runs at boot. When `NODE_ENV=production`, it refuses to start if Stripe key is missing / is `sk_test_*`, if WC credentials / URL are missing, if `ADMIN_JWT_SECRET` is missing or equals the default placeholder, if admin username/password aren't set, or if `ALLOWED_ORIGINS` is empty. All errors printed together before `process.exit(1)`.
  **Still need from you:** live Stripe key + all other prod env vars in the deploy environment.

---

## 🟠 High — fix before launch (or ship with a documented mitigation)

- [x] ⏳ **H1. Admin hardening** — CODE DONE, PROD VALUES STILL NEEDED
  - **Rate limit:** in-memory IP map on `/api/admin/login` — 5 attempts / 15 min window. Returns `429` with `Retry-After` header. Failed attempts logged with `[admin-login]` prefix.
  - **CORS allowlist:** new `ALLOWED_ORIGINS` env var (comma-separated). `adminJson()` echoes the request origin if allowed, else falls back to the first allowed origin. Empty in dev = wildcard (dev-only).
  - **JWT secret boot check:** rolled into `validateProductionConfig()` — refuses to start in prod with default placeholder.
  **Still need from you:** set `ALLOWED_ORIGINS=https://elusiveracing.com.au,https://www.elusiveracing.com.au,<staging>` and rotate `ADMIN_PASSWORD` to a strong random string in the deploy environment.

- [ ] **H3. No redirect map from the old WordPress URLs**
  Inbound SEO equity (old `/product/*`, `/product-category/*`, `/brand/*`) will evaporate on launch day if the new URL scheme differs. Crawl the old site, build a 301 map in `server.js` or hosting config (Netlify `_redirects` / Vercel `vercel.json` / nginx).

- [x] ⏳ **H4. Sitemap generator** — DONE
  `scripts/build-sitemap.mjs` runs as a postbuild step (`"build": "vite build && node scripts/build-sitemap.mjs"`). Queries WC REST for published products (skipping out-of-stock), all categories, and all brands; prepends 8 static routes (home, shop, brands, services, about, contact, terms, wholesale-registration). Writes `dist/sitemap.xml` — **4896 URLs on the current WC store** (4614 products + 172 categories + 116 brands + 8 static). `SITE_URL` env var controls the base; defaults to `https://elusiveracing.com.au`. Fails soft: if WC is unreachable at build time, writes a static-only fallback instead of breaking the build. `public/robots.txt` already references `/sitemap.xml`.
  **Still need from you:** after DNS is live, submit the sitemap to Google Search Console.

- [ ] **H5. No analytics, no error monitoring**
  Zero GA4, GTM, Sentry, Rollbar, LogRocket.
  **Fix:** GA4 via GTM with enhanced ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`) + `@sentry/react` on frontend + `@sentry/node` on `server.js`.

- [ ] **H13. Set `elusive_frontend_url` WP option before DNS flip**
  The Elusive Auth plugin's password-reset email filter falls back to `site_url()` if this option is unset, which would point reset links at the WP domain instead of the React frontend. Set it to the final public URL — currently staging on Railway at `https://elusive-racing-production-d535.up.railway.app`, update to `https://elusiveracing.com.au` at DNS flip.
  **Set via any of:**
  - WP-CLI: `wp option update elusive_frontend_url https://<frontend-url>`
  - Options Editor plugin (wp-admin → Plugins → Add New → search "Options Editor")
  - SQL: `INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('elusive_frontend_url', 'https://<frontend-url>', 'yes') ON DUPLICATE KEY UPDATE option_value = VALUES(option_value);`
  **Verify:** trigger a test reset and confirm the link in the email starts with the expected host.

---

## 🟡 Medium — fix before or shortly after launch

- [ ] **M1. Rotate all secrets regardless** (WC key pair, Stripe restricted key, Meilisearch admin key, `ADMIN_JWT_SECRET`, Anthropic API key, admin password). Document in a password manager.
- [ ] **M11. Deploy config confirmation** — SPA fallback, immutable cache headers on `/assets/*`, no sourcemaps in prod (`build.sourcemap: false`), Node version pinned, `server.js` supervised (PM2/systemd/Docker).

---

## 🟢 Low — post-launch polish

- [ ] **L6.** Instagram section is static — note as manual refresh or wire IG Basic Display API.
- [ ] **L7.** Consider TypeScript migration (long-term).
- [ ] **L8.** Admin audit log (who approved which wholesale signup and when).
- [x] ⏳ **L9. Returns & Warranty page** — FRONTEND DONE, EMAIL BACKEND PENDING
  New `/returns` route (`src/pages/ReturnsPage.jsx` + `.css`) with AU consumer-law-compliant policy sections and a client-side-validated request form (name, email, AU phone, order number, request type, part numbers, purchase date, description). Linked from footer (replaces the old `/terms#returns` anchor) and added to `scripts/build-sitemap.mjs`. Submit is stubbed with an inline success card — a `TODO` marks where to wire up the future `/api/returns` email endpoint (requires adding SMTP/Resend to `server.js`, same infra that would benefit a contact form).

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
