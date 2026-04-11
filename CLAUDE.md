# Elusive Racing — React Storefront

## Mobile-First Requirements

**Always consider mobile when writing or reviewing any CSS or layout code.**

- Minimum supported mobile width: **420px** (e.g. Samsung S24, iPhone SE)
- All UI changes must be verified mentally at 420px width before finalising
- Use `@media (max-width: 900px)` as the primary mobile breakpoint for layout/nav changes
- Use `@media (max-width: 768px)` for content/typography adjustments
- Use `@media (max-width: 480px)` for small phone tweaks
- `position: sticky` is unreliable inside `display: flex` column containers — use `position: fixed` for the header and nav on mobile, with a matching `padding-top` on `.app` to compensate
- The StickyFinder (vehicle search bar) is **hidden on mobile** (`display: none` at ≤900px)

---

## Git Rules

- **Never commit or push automatically.** Only commit or push when the user explicitly says to (e.g. "commit", "push", "commit and push"). Do not commit after completing a task unless asked.
- **Do not bundle a commit at the end of a task.** Complete the task, stop. Wait for the user to review and explicitly request a commit/push.

## Project Overview

We are rebuilding the Elusive Racing website (https://elusiveracing.com.au) as a modern,
custom React application. The goal is to replicate and improve the existing frontend with
a custom checkout flow powered by Stripe and WooCommerce.

This is a **headless WooCommerce** setup. We own the entire frontend. WooCommerce is the
product/inventory backend, and we handle cart, checkout, and payments ourselves.

---

## Current State (as of March 2026)

The project is in active development. The current codebase uses **plain JavaScript** (`.jsx`)
and **CSS files** — not TypeScript or Tailwind yet. The target stack below is the direction
we are migrating toward. Do not break existing working code in pursuit of the target stack
unless explicitly asked to migrate.

**What's already built:**
- React 18 + Vite + React Router v6
- Full layout shell: TopBar, Header, Navigation (with mega menu), Footer, ChatWidget
- Homepage: Hero (video + vehicle finder), ServicesStrip, ContactBanner, CategoryGrid, FeaturedProducts, BrandsSection, InstagramSection (video reel)
- StickyFinder bar (slides in above nav on scroll)
- `/services` page with hero, service rows, FAQ, CTA — booking links to MechanicDesk
- WooCommerce REST API client in `src/lib/woocommerce.js`
- Meilisearch integration for product search in `src/lib/meilisearch.js`
- Custom checkout with Stripe (card payments) and BACS (bank transfer)
- All styling via plain CSS with CSS custom properties (no Tailwind yet)

**Key business details:**
- Phone: 03 9574 1710 (`tel:+61395741710`)
- Address: 1/32 Graham Rd, Clayton South VIC 3169
- Instagram: @elusive_racing
- Facebook Messenger: https://m.me/ElusiveRacin
- Online booking: https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9
- Brand red: `#d94040` (var(--color-red)), hover: `#c03333`

---

## Target Tech Stack

- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Shopping Backend**: WooCommerce REST API
- **Search**: Meilisearch
- **Payments**: Stripe (card) + BACS (bank transfer)
- **UI Icons**: `lucide-react`
- **Social/Brand Icons**: `react-icons` (fa6 subset)
- **Payment Icons**: `react-svg-credit-card-payment-icons`
- **State Management**: Zustand (UI state + cart state)
- **Build Tool**: Vite

---

## Inventory Management — Cin7

Elusive Racing uses **Cin7** as the inventory management system. Cin7 is the source of truth for stock levels, SKUs, and product availability.

The sync flow is:
- **Cin7 → WooCommerce**: stock levels, product availability, and SKUs sync from Cin7 to WooCommerce. Do not manage inventory directly in WooCommerce.
- **WooCommerce → Meilisearch → Frontend**: the React frontend reads products from Meilisearch (synced from WooCommerce) for fast search, and from WooCommerce REST API for full product details.

Do not build any direct Cin7 API calls in the React frontend. All inventory data the frontend needs comes through WooCommerce after Cin7 has synced it.

---

## What WooCommerce Handles

- Product catalogue, inventory, and variants
- Order management and fulfilment
- Customer accounts (via JWT authentication)
- Discount codes and promotions
- Tax calculations
- Wholesale tier pricing (role-based percentage discounts)

## What the Custom Frontend Handles

- Cart state (Zustand store, persisted in localStorage)
- Multi-step checkout flow (contact → shipping → payment)
- Payments via Stripe (card) and BACS (bank transfer)
- Shipping rate calculation (Australia Post API via server.js)
- Order placement (WooCommerce REST API)

---

## What We Own (Custom React Frontend)

- Full site layout and navigation
- Homepage with hero, featured products, brand logos, banners
- Product listing pages (by category, brand, vehicle fitment)
- Product detail pages (pulling data from WooCommerce REST API)
- Brand directory page
- Vehicle fitment selector / search
- "Add to Cart" — adds to Zustand cart store (persisted in localStorage)
- Cart drawer/sidebar — reads from local cart store
- Search (using Meilisearch)
- Static pages: About, Contact, Wholesale enquiry
- Blog/news section
- Footer with social links, payment icons, trust badges

---

## Site Structure to Replicate & Improve

Based on https://elusiveracing.com.au, the key sections are:

### Navigation
- Top bar: Wholesale link, Login/Register
- Main nav: Brands (mega menu with brand logos), Shop by Category, Shop by Vehicle, Sale, About, Contact
- Search bar (prominent)
- Cart icon with item count

### Homepage
- Full-width hero banner (motorsport/racing aesthetic — dark, aggressive)
- Featured/sale products grid
- Shop by vehicle make (Honda-focused: Civic, Integra, NSX, S2000, etc.)
- Brand logo wall (scrollable, 80+ brands)
- Trust badges strip (Australian owned, fast shipping, secure payments, etc.)
- Featured categories
- Instagram/social feed section

### Product Listing Page
- Sidebar filters: brand, category, price range, vehicle fitment
- Product grid with image, name, price, "Add to Cart"
- Sort options
- Pagination

### Product Detail Page
- Image gallery
- Product title, brand, SKU, price
- Variant selector (size, spec options)
- Vehicle fitment table
- Add to Cart button → local cart (Zustand)
- Product description tabs (Description, Fitment, Shipping)
- Related products

### Brand Page
- Grid of all brand logos
- Clicking a brand filters products to that brand

### Cart
- Slide-out cart drawer
- Line items from local cart store
- Subtotal
- "Proceed to Checkout" button → custom multi-step checkout

---

## Design Language

- **Dark theme** as default: deep black/charcoal backgrounds (#0a0a0a, #111, #1a1a1a)
- **Red accent**: `#d94040` / `var(--color-red)`
- **Typography**: Bold, aggressive — Montserrat (primary), Open Sans (body)
- **Cards**: Dark cards with subtle borders, hover lift effects
- **Imagery**: Large, high-quality hero images. Motorsport photography aesthetic.
- **Mobile-first**: Design mobile-first
- **Performance**: Lazy load images, skeleton loaders while API data fetches
- **Trust signals**: Payment icons (Visa, Mastercard, Afterpay, PayPal, Amex) in footer
- Brand logo wall — smooth infinite scroll marquee

---

## Target File Structure

```
src/
  components/
    layout/        # Navbar, Footer, CartDrawer
    ui/            # Button, Badge, Card, Input, Skeleton
    product/       # ProductCard, ProductGrid, ProductDetail, VariantSelector
    brand/         # BrandCard, BrandGrid, BrandMarquee
    home/          # Hero, FeaturedProducts, VehicleSelector, TrustBadges
  pages/
    HomePage.tsx
    ShopPage.tsx
    ProductPage.tsx
    BrandPage.tsx
    BrandsPage.tsx
    SearchPage.tsx
    AboutPage.tsx
    ContactPage.tsx
  hooks/
    useCart.ts
    useSearch.ts
    useProducts.ts
  lib/
    woocommerce.js
    meilisearch.js
    formatPrice.js
  store/
    cartStore.js
    authStore.js
    vehicleStore.js
```

---

## Key Conventions (Target)

- All components use TypeScript with explicit prop types
- Tailwind only for styling — no CSS files except global reset
- All WooCommerce data fetching in lib modules, never inline in components
- Cart state lives in Zustand store, persisted in localStorage
- Images use `loading="lazy"` and explicit `width`/`height` to prevent layout shift
- Never hardcode product data — everything comes from WooCommerce REST API or Meilisearch
- Mobile breakpoints: design mobile-first, then `md:` and `lg:` for larger screens
- Accessibility: all interactive elements have aria labels, images have alt text

---

## What NOT to Do

- Do not store raw payment card details — Stripe handles PCI compliance
- Do not build order management UI (WooCommerce admin handles this)
- Do not use CSS modules or styled-components — Tailwind only (target)
- Do not use class components — functional components + hooks only
- Do not install Redux — use Zustand for any state beyond React useState
