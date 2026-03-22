# Elusive Racing — React Storefront

## Git Rules

- **Never commit or push automatically.** Only commit or push when the user explicitly says to (e.g. "commit", "push", "commit and push"). Do not commit after completing a task unless asked.
- **Do not bundle a commit at the end of a task.** Complete the task, stop. Wait for the user to review and explicitly request a commit/push.

## Project Overview

We are rebuilding the Elusive Racing website (https://elusiveracing.com.au) as a modern,
custom React application. The goal is to replicate and improve the existing frontend while
delegating all shopping functionality (cart, checkout, payments, shipping, freight, tax,
fulfilment) to Shopify via the Storefront API.

This is a **headless Shopify** setup. We own the entire frontend. Shopify is the backend.

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
- Shopify Storefront API client in `src/lib/shopify.js` (native fetch, no hydrogen-react yet)
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
- **Shopping**: Shopify Storefront API (GraphQL) via `@shopify/hydrogen-react`
- **UI Icons**: `lucide-react`
- **Social/Brand Icons**: `react-icons` (fa6 subset)
- **Payment Icons**: `react-svg-credit-card-payment-icons`
- **State Management**: Zustand (UI state) + Shopify cart API (commerce state)
- **Build Tool**: Vite

---

## Inventory Management — Cin7

Elusive Racing uses **Cin7** as the inventory management system. Cin7 is the source of truth for stock levels, SKUs, and product availability.

The sync flow is:
- **Cin7 → Shopify**: stock levels, product availability, and SKUs should sync from Cin7 to Shopify (via Cin7's native Shopify integration or webhooks). Do not manage inventory directly in Shopify.
- **Shopify → Frontend**: the React frontend reads stock/availability from Shopify Storefront API as normal — Cin7 is upstream and invisible to the frontend.

Do not build any direct Cin7 API calls in the React frontend. All inventory data the frontend needs should come through Shopify after Cin7 has synced it.

---

## What Shopify Handles (Do NOT rebuild these)

- Product catalogue, inventory, and variants
- Cart and checkout flow
- Payments (credit card, Afterpay, PayPal, etc.)
- Shipping, freight, and delivery calculations
- Tax calculations
- Order management and fulfilment
- Customer accounts and order history
- Discount codes and promotions

All of the above should be routed through Shopify's Storefront API or by redirecting
to the Shopify-hosted checkout URL. Never build custom payment or shipping logic.

---

## What We Own (Custom React Frontend)

- Full site layout and navigation
- Homepage with hero, featured products, brand logos, banners
- Product listing pages (by category, brand, vehicle fitment)
- Product detail pages (pulling data from Shopify Storefront API)
- Brand directory page
- Vehicle fitment selector / search
- "Add to Cart" — calls Shopify Storefront API to create/update cart
- Cart drawer/sidebar — reads from Shopify cart, links to Shopify checkout
- Search (using Shopify Storefront search API)
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
- Add to Cart button → Shopify cart
- Product description tabs (Description, Fitment, Shipping)
- Related products

### Brand Page
- Grid of all brand logos
- Clicking a brand filters products to that brand

### Cart
- Slide-out cart drawer
- Line items from Shopify cart
- Subtotal
- "Proceed to Checkout" button → redirect to Shopify checkout URL (do not rebuild checkout)

---

## Design Language

- **Dark theme** as default: deep black/charcoal backgrounds (#0a0a0a, #111, #1a1a1a)
- **Red accent**: `#d94040` / `var(--color-red)`
- **Typography**: Bold, aggressive — Montserrat (primary), Open Sans (body)
- **Cards**: Dark cards with subtle borders, hover lift effects
- **Imagery**: Large, high-quality hero images. Motorsport photography aesthetic.
- **Mobile-first**: Design mobile-first
- **Performance**: Lazy load images, skeleton loaders while Shopify data fetches
- **Trust signals**: Payment icons (Visa, Mastercard, Afterpay, PayPal, Amex) in footer
- Brand logo wall — smooth infinite scroll marquee

---

## Shopify Integration Notes

Use `@shopify/hydrogen-react` for all Shopify data fetching (target — currently using native fetch in `src/lib/shopify.js`).

Key Storefront API operations needed:
- `getProducts` — product listing pages
- `getProduct` — product detail page
- `getCollections` — category/brand pages
- `createCart` / `addCartLines` / `updateCartLines` / `removeCartLines` — cart management
- `getCart` — read current cart
- `predictiveSearch` / `search` — search bar
- Cart checkout URL: `cart.checkoutUrl` — redirect here, never build custom checkout

Store the Shopify Storefront API token in `.env`:
```
VITE_SHOPIFY_STORE_DOMAIN=elusiveracing.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=your_token_here
```

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
    shopify.ts
    queries.ts
  store/
    cartStore.ts
  types/
    shopify.ts
```

---

## Key Conventions (Target)

- All components use TypeScript with explicit prop types
- Tailwind only for styling — no CSS files except global reset
- All Shopify data fetching in hooks, never inline in components
- Cart state lives in Shopify (via Storefront API) — persist `cartId` in localStorage
- Images use `loading="lazy"` and explicit `width`/`height` to prevent layout shift
- Never hardcode product data — everything comes from Shopify Storefront API
- Mobile breakpoints: design mobile-first, then `md:` and `lg:` for larger screens
- Accessibility: all interactive elements have aria labels, images have alt text

---

## What NOT to Do

- Do not build a custom checkout page
- Do not store payment information
- Do not build order management
- Do not reinvent what Shopify already handles
- Do not use CSS modules or styled-components — Tailwind only (target)
- Do not use class components — functional components + hooks only
- Do not install Redux — use Zustand for any state beyond React useState
