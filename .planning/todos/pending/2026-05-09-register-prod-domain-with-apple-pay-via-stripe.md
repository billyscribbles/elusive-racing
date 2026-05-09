---
created: 2026-05-09T03:52:33.325Z
title: Register prod domain with Apple Pay via Stripe
area: payments
files:
  - public/.well-known/apple-developer-merchantid-domain-association
  - server.js:3618
  - src/pages/PaymentPage.jsx:250
---

## Problem

Apple Pay does not appear in the Stripe Payment Element on `/checkout/payment`. The integration uses `<PaymentElement>` with `automatic_payment_methods: { enabled: true }` (server.js:2847), which is the right setup — Stripe will surface Apple Pay automatically once two conditions are met:

1. The browser/device supports it (Safari on macOS with Touch ID, or Safari on iOS). Chrome on Mac will only ever show Google Pay — that is by design and not a bug.
2. The prod domain is registered with Apple Pay through the Stripe Dashboard, and the `apple-developer-merchantid-domain-association` file is reachable at `/.well-known/apple-developer-merchantid-domain-association` on that domain.

The unrelated "Another step will appear to securely submit your payment information" copy on the wallet button is Stripe's standard wallet label, not an error — once Google/Apple Pay is selected, the OS-level wallet sheet opens next.

## Solution

1. **Stripe Dashboard** → Settings → Payments → Payment methods → confirm **Apple Pay** is enabled.
2. Same screen, scroll to **Apple Pay** → **Add a new domain** → enter the prod domain (`elusive-racing-production-d535.up.railway.app`, or whatever custom domain we're pointing at it).
3. Stripe will hand you a file named `apple-developer-merchantid-domain-association` (no extension, opaque blob).
4. Place it at `public/.well-known/apple-developer-merchantid-domain-association` in this repo. Vite copies the entire `public/` tree (including dotfile dirs) into `dist/` at build time, and the static handler in `server.js:3618` serves anything under `dist/` — no new route needed.
5. Commit, push, wait for the Railway redeploy.
6. Sanity check from terminal:
   ```
   curl -i https://elusive-racing-production-d535.up.railway.app/.well-known/apple-developer-merchantid-domain-association
   ```
   Expect `200 OK` with the file body. If the response is `index.html` or 404, the file didn't make it through Vite's copy or the static handler is rejecting dotfile dirs — fall back to wiring an explicit early route in `server.js`.
7. In Stripe Dashboard, click **Verify** on the domain entry — status flips to verified.
8. Test on Safari on iPhone (or Mac with Touch ID/paired iPhone) at `/checkout/payment` with at least one item in cart and contact/shipping completed. The Apple Pay button should appear inside the Stripe Payment Element accordion alongside the card form.
