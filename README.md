# Elusive Racing

Melbourne's premier Honda performance parts storefront. Built with React + Vite, designed for Shopify integration.

## Live Deployment

Hosted on Railway: **https://elusive-racing-production-d535.up.railway.app/**

Deploys automatically on every push to `main`.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Yarn](https://yarnpkg.com/) v4 (included via `packageManager` in `package.json`)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/billyscribbles/elusive-racing.git
cd elusive-racing
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Start the development server

```bash
yarn dev
```

The app will be running at `http://localhost:5173`

To also access it from your phone (on the same Wi-Fi), use:

```bash
yarn dev --host
```

Vite will print a **Network** URL (e.g. `http://192.168.x.x:5173`) — open that on your phone.

### 4. Build for production

```bash
yarn build
```

### 5. Preview the production build

```bash
yarn preview
```

---

## Environment Variables

Create a `.env` file in the project root when you're ready to connect Shopify:

```env
VITE_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=your-public-storefront-access-token
```

These are used by `src/lib/shopify.js` which contains the Storefront API client.

---

## Project Structure

```
src/
  layouts/
    MainLayout.jsx        # Shared shell — TopBar, Header, Nav, Footer, ChatWidget
  pages/
    HomePage.jsx          # Home page sections
  components/
    layout/               # TopBar, Header, Navigation, Footer
    home/                 # Hero, CategoryGrid, FeaturedProducts, PromoStrip, BrandsSection, AboutBanner, InstagramSection
    ui/                   # SearchBar, CartIcon, ChatWidget, VehicleSelector
  data/
    navigation.js         # Nav items, brands, vehicle data, featured categories
  lib/
    shopify.js            # Shopify Storefront API client (products, collections, cart)
  index.css               # Global styles and CSS variables
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| lucide-react | UI icons |
| react-icons | Brand icons (Font Awesome 6) |
| react-svg-credit-card-payment-icons | Payment icons |

---

## Meilisearch — Product Search

Product search (search bar, shop page, AI chatbot) is powered by [Meilisearch](https://www.meilisearch.com/) — all 4600+ products are indexed for instant, typo-tolerant search.

### How sync works

- **On deploy** — the main app server runs a full sync automatically on startup
- **Every hour** — a `setInterval` re-sync keeps the index fresh
- **Manual sync** — trigger immediately via the API:

```bash
curl -X POST https://elusive-racing-production-d535.up.railway.app/api/sync
```

If you set `SEARCH_SYNC_TOKEN` in Railway, include it as a Bearer token:

```bash
curl -X POST https://elusive-racing-production-d535.up.railway.app/api/sync \
  -H "Authorization: Bearer your-sync-token"
```

### Local development

1. Start Meilisearch:
```bash
./meilisearch --master-key="masterKey"
```

2. Start the sync (indexes all WC products into local Meilisearch):
```bash
yarn search-server
```

3. Get your public search key and add it to `.env`:
```bash
curl http://localhost:7700/keys -H "Authorization: Bearer masterKey"
# Copy "Default Search API Key" → VITE_MEILISEARCH_SEARCH_KEY
```

4. Start the app:
```bash
yarn dev
```

### Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `MEILISEARCH_HOST` | Server | Meilisearch instance URL |
| `MEILISEARCH_ADMIN_KEY` | Server | Write/index access (keep secret) |
| `VITE_MEILISEARCH_HOST` | Frontend build | Meilisearch instance URL |
| `VITE_MEILISEARCH_SEARCH_KEY` | Frontend build | Read-only public search key |

---

## Adding a New Page

1. Create the page component in `src/pages/`
2. Add the route to `src/App.jsx`:

```jsx
import MyNewPage from './pages/MyNewPage';

// Inside <Routes>
<Route path="/my-page" element={<MyNewPage />} />
```

---

## Shopify Integration

The Storefront API client is ready in `src/lib/shopify.js`. Available functions:

- `getFeaturedProducts(count)` — fetch best-selling products
- `getProductByHandle(handle)` — fetch a single product
- `searchProducts(query, count)` — search products
- `getCollectionByHandle(handle, count)` — fetch a collection with products
- `createCart()` — create a new cart
- `addToCart(cartId, variantId, quantity)` — add item to cart
- `removeFromCart(cartId, lineIds)` — remove item from cart
- `updateCartLine(cartId, lineId, quantity)` — update item quantity
