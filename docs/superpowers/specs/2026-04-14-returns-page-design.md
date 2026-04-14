# Returns Page — Design Spec

**Date:** 2026-04-14
**Status:** Approved for implementation
**Reference:** https://www.hardracesuspension.com.au/form/returns/

## Goal

Add a public `/returns` page to the Elusive Racing storefront containing the returns & warranty policy and a returns request form. Form submission is frontend-only for this iteration (no email/backend wiring).

## Scope

**In scope**
- New route `/returns`
- Policy content (generic AU consumer-law-compliant)
- Returns request form with client-side validation
- Success state after submit (no network call)
- Footer link
- Sitemap entry

**Out of scope**
- Backend email delivery / SMTP / Resend integration
- File / photo uploads
- Admin UI for viewing submitted requests
- Integration with WooCommerce order records
- Account-dashboard linkage

## Files Affected

| File | Change |
|---|---|
| `src/pages/ReturnsPage.jsx` | **New** — page component |
| `src/pages/ReturnsPage.css` | **New** — page styles |
| `src/App.jsx` | Add `<Route path="/returns" element={<ReturnsPage />} />` |
| `src/components/layout/Footer.jsx` | Add "Returns & Warranty" link |
| `scripts/build-sitemap.mjs` | Add `/returns` to static routes list |

## Page Structure

1. **Hero / title** — "Returns & Warranty" heading with short subtitle.
2. **Policy section** — readable prose, sectioned with subheadings:
   - Change of mind (14 days, unopened/uninstalled, restocking fee applies)
   - Faulty or incorrectly supplied items (Australian Consumer Law rights)
   - Warranty claims (excludes misuse, accident damage, products installed outside manufacturer guidelines)
   - How to lodge a return (instructions pointing at the form below)
   - Refund processing times (card vs bank transfer)
   - Contact details (phone, email, address — reuse values from CLAUDE.md)
3. **Returns request form** (see fields below)
4. **Success state** — replaces the form on submit with a confirmation card.

Policy copy is placed inline in the JSX as static content — editable in future by hand. Not stored in WooCommerce or a CMS.

## Form Fields

All fields required unless noted. Client-side validation only.

| Field | Input | Validation |
|---|---|---|
| Name | `text` | Non-empty, trim |
| Email | `email` | Valid email format |
| Contact Number | `tel` | AU phone format — reuse existing validator added in pre-launch audit (obs 565) |
| Order / Invoice Number | `text` | Non-empty |
| Request Type | `select` | One of: "Return for Refund", "Return for Store Credit", "Warranty Claim" |
| Part Numbers | `text` | Non-empty (free text, users may list multiple) |
| Date of Purchase | `date` | Not in the future; within last 365 days (soft warn if older) |
| Describe the Issue | `textarea` | 10–1000 characters |

### Submit behavior
- On submit, validate all fields. Surface errors inline under each field.
- If valid: call a stub `handleSubmit` that:
  - Prevents double-submission (disable button + loading state — match pattern from obs 566/567)
  - Resolves after a brief simulated delay
  - Swaps form out for a success card: *"Thanks {name}, we've received your request. Our team will contact you on {email} within 2 business days."*
- No `fetch` call. No data leaves the browser. A `TODO` comment marks where the future email endpoint will plug in.

## Styling

- Plain CSS in `ReturnsPage.css`, following the pattern of `ContactPage.css` / `WholesalePage.css`.
- Dark theme, `var(--color-red)` accents, Montserrat headings.
- Mobile-first, verified at 420px width. Form fields full-width on mobile, two-column on ≥768px where sensible.
- Fixed header already handled globally — no extra padding concerns.

## Accessibility

- All inputs have associated `<label>` elements.
- Errors announced via `aria-live="polite"` region.
- Submit button has `aria-busy` during loading.

## Validation / Acceptance

- [ ] `/returns` renders and is reachable from the footer link.
- [ ] Typing an invalid email surfaces an inline error.
- [ ] Submitting with empty required fields surfaces inline errors, no success state.
- [ ] Valid submission shows success card, form is removed.
- [ ] Double-clicking submit does not trigger multiple handlers.
- [ ] Page is legible at 420px width with no horizontal scroll.
- [ ] `/returns` appears in generated `dist/sitemap.xml` after build.
- [ ] 404 catch-all still works for typos like `/return`.

## Out of Scope — Follow-ups

Captured here so we don't forget when wiring up the backend later:
- Email delivery via server.js (Resend/SMTP) — would let us honour file attachments, actual delivery, and customer auto-reply
- Admin dashboard listing of requests
- Optional link from Account Dashboard → "Request a return for this order"
