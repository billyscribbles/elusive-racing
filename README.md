# Elusive Racing

Melbourne's premier Honda performance parts storefront. Built with React + Vite, powered by WooCommerce and Meilisearch.

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

Create a `.env` file in the project root with your WooCommerce and service credentials:

```env
VITE_WC_URL=https://elusiveracing.com.au
VITE_WC_CONSUMER_KEY=ck_your_key
VITE_WC_CONSUMER_SECRET=cs_your_secret
```

These are used by `src/lib/woocommerce.js` which contains the WooCommerce REST API client.

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
    woocommerce.js        # WooCommerce REST API client (products, categories, orders)
    meilisearch.js        # Meilisearch search client
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

## Stripe Test Mode

The app uses Stripe test keys for development. No real charges are made.

### Test Card Numbers

| Scenario | Card Number | Expiry | CVC |
|---|---|---|---|
| **Successful payment** | `4242 4242 4242 4242` | Any future date (e.g. `12/28`) | Any 3 digits (e.g. `123`) |
| **Card declined** | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| **Insufficient funds** | `4000 0000 0000 9995` | Any future date | Any 3 digits |
| **3D Secure required** | `4000 0025 0000 3155` | Any future date | Any 3 digits |
| **Expired card** | `4000 0000 0000 0069` | Any future date | Any 3 digits |
| **Incorrect CVC** | `4000 0000 0000 0127` | Any future date | Any 3 digits |
| **Processing error** | `4000 0000 0000 0119` | Any future date | Any 3 digits |

### How to Test

1. Add items to cart and go through checkout
2. Fill in contact and shipping details (any test data is fine)
3. On the payment page, select "Pay Online"
4. Enter a test card number from the table above
5. Click "Complete Order"
6. You should see the order confirmation receipt page

View test payments in the Stripe dashboard: https://dashboard.stripe.com/test/payments (make sure "Test mode" is toggled on).

### Stripe Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Both must be **test** keys (prefixed with `sk_test_` and `pk_test_`). Never use live keys in development.

---

## Adding a New Page

1. Create the page component in `src/pages/`
2. Add the route to `src/App.jsx`:

```jsx
import MyNewPage from './pages/MyNewPage';

// Inside <Routes>
<Route path="/my-page" element={<MyNewPage />} />
```

