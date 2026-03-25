# WooCommerce REST API Reference

Base URL: `{VITE_WC_URL}/wp-json/wc/v3`
Auth: `Authorization: Basic base64(consumer_key:consumer_secret)`

Store API (no auth): `{VITE_WC_URL}/wp-json/wc/store/v1`

---

## Products

| Endpoint | Data |
|---|---|
| `GET /products` | List of products — name, slug, price, sale price, SKU, stock status, images, categories, tags, attributes, variants |
| `GET /products/:id` | Single product (same fields, fully expanded) |
| `GET /products/:id/variations` | All variants of a variable product — price, attributes (e.g. size/colour), stock per variant |
| `GET /products/attributes` | Product attribute types (e.g. "Brand", "Colour") |
| `GET /products/attributes/:id/terms` | Terms for an attribute (e.g. all brand names) |
| `GET /products/categories` | Category list — name, slug, parent, image, product count |
| `GET /products/categories/:id` | Single category |
| `GET /products/tags` | Tag list — name, slug, count |
| `GET /products/reviews` | Product reviews — rating, review text, reviewer, date |
| `GET /products/brands` | Brand list (requires WooCommerce Brands plugin) |

### Useful query params for `/products`
| Param | Description |
|---|---|
| `search` | Full-text search on title + description |
| `sku` | Exact SKU match |
| `category` | Filter by category ID |
| `tag` | Filter by tag ID |
| `per_page` | Results per page (max 100) |
| `page` | Page number |
| `orderby` | `date`, `price`, `popularity`, `title` |
| `order` | `asc` or `desc` |
| `on_sale` | `true` to return only sale products |
| `min_price` / `max_price` | Price range filter |
| `stock_status` | `instock`, `outofstock`, `onbackorder` |
| `featured` | `true` to return featured products only |

---

## Orders

| Endpoint | Data |
|---|---|
| `GET /orders` | All orders — line items, totals, shipping, billing, status, customer |
| `GET /orders/:id` | Single order |
| `POST /orders` | Create an order |
| `PUT /orders/:id` | Update order status |
| `GET /orders/:id/notes` | Order notes/history |
| `GET /orders/:id/refunds` | Refunds on an order |

---

## Customers

| Endpoint | Data |
|---|---|
| `GET /customers` | All customers — name, email, billing/shipping address, order count, total spend |
| `GET /customers/:id` | Single customer |
| `POST /customers` | Create customer |

---

## Coupons

| Endpoint | Data |
|---|---|
| `GET /coupons` | All coupons — code, discount type, amount, usage count, expiry |
| `POST /coupons` | Create a coupon |

---

## Reports

| Endpoint | Data |
|---|---|
| `GET /reports/sales` | Sales totals, orders, items sold, refunds, discounts — filterable by date |
| `GET /reports/top-sellers` | Best selling products |
| `GET /reports/customers/totals` | Customer count breakdowns |
| `GET /reports/orders/totals` | Order count by status |
| `GET /reports/products/totals` | Product count by type |

---

## Shipping & Tax

| Endpoint | Data |
|---|---|
| `GET /shipping/zones` | Shipping zones |
| `GET /shipping/zones/:id/methods` | Methods per zone (flat rate, free, etc.) |
| `GET /shipping/methods` | All available shipping methods |
| `GET /taxes` | Tax rates — rate, class, country/state |
| `GET /tax/classes` | Tax classes (standard, reduced, zero) |

---

## Settings & System

| Endpoint | Data |
|---|---|
| `GET /settings` | All setting groups |
| `GET /settings/:group` | Settings in a group (general, products, tax, shipping, etc.) |
| `GET /payment_gateways` | Enabled payment methods — ID, title, enabled status |
| `GET /system_status` | WP/WC version, PHP, active plugins, database info |

---

## Store API — `/wp-json/wc/store/v1` (no auth required)

| Endpoint | Data |
|---|---|
| `GET /cart` | Current cart — line items, totals, coupon, shipping options |
| `POST /cart/add-item` | Add product to cart |
| `POST /cart/update-item` | Change quantity |
| `POST /cart/remove-item` | Remove a line item |
| `POST /cart/apply-coupon` | Apply a coupon code |
| `POST /cart/remove-coupon` | Remove a coupon |
| `GET /products` | Public product list (lighter payload, no auth needed) |
| `GET /products/:id` | Public single product |
| `GET /products/collection` | Products in a category |

---

## Currently Used in This App

| Feature | Endpoint |
|---|---|
| Product listing / search | `GET /products` |
| Product detail page | `GET /products?slug=` + `GET /products/:id/variations` |
| Categories (nav + filters) | `GET /products/categories` |
| Brands (filter sidebar) | `GET /products/brands` → fallback to `GET /products/attributes` |
| Cart | Store API `/cart/*` |

## Opportunities Not Yet Used

| Feature | Endpoint |
|---|---|
| Product reviews on PDP | `GET /products/:id/reviews` |
| Featured / top-seller products | `GET /reports/top-sellers` |
| Discount codes in cart | Store API `POST /cart/apply-coupon` |
| Payment method display in footer | `GET /payment_gateways` |
