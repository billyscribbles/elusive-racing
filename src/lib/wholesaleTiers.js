/**
 * Wholesale Suite tier definitions and helpers.
 *
 * Each tier maps to a WooCommerce user role, a product meta_data key
 * for per-product price overrides, and a default percentage discount
 * applied to all products when no per-product price is set.
 *
 * Labels and discount percentages are editable from the admin panel
 * and live in data/wholesale-tiers.json on the server. Role keys and
 * metaKeys are fixed because they must match WooCommerce WP roles.
 * The server exposes /api/public/wholesale-tiers so this module can
 * warm an in-memory override cache at boot via primeWholesaleTiers().
 */

const FALLBACK_TIERS = [
  { role: 'wholesale_customer',    label: 'Wholesale 5%',  tierNumber: 0, discount: 5,  metaKey: 'wholesale_customer_wholesale_price' },
  { role: 'wholesale_customer_10', label: 'Wholesale 10%', tierNumber: 1, discount: 10, metaKey: 'wholesale_customer_10_wholesale_price' },
  { role: 'wholesale_customer_15', label: 'Wholesale 15%', tierNumber: 2, discount: 15, metaKey: 'wholesale_customer_15_wholesale_price' },
  { role: 'wholesale_customer_20', label: 'Wholesale 20%', tierNumber: 3, discount: 20, metaKey: 'wholesale_customer_20_wholesale_price' },
  { role: 'wholesale_customer_25', label: 'Wholesale 25%', tierNumber: 4, discount: 25, metaKey: 'wholesale_customer_25_wholesale_price' },
];

let liveTiers = FALLBACK_TIERS.map(t => ({ ...t }));
let liveRoleMap = Object.fromEntries(liveTiers.map(t => [t.role, t]));

function rebuildMap() {
  liveRoleMap = Object.fromEntries(liveTiers.map(t => [t.role, t]));
}

/**
 * Fetches the live tier list from the server and updates the in-memory cache.
 * Safe to call multiple times; fails silently and keeps the fallback.
 */
export async function primeWholesaleTiers() {
  try {
    const res = await fetch('/api/public/wholesale-tiers');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data?.tiers) && data.tiers.length === FALLBACK_TIERS.length) {
      liveTiers = data.tiers.map(t => ({ ...t }));
      rebuildMap();
    }
  } catch {
    // network error — keep fallback
  }
}

/** The canonical wholesale tier list (reflects live overrides once primed). */
export const WHOLESALE_TIERS = new Proxy([], {
  get(_t, prop) { return liveTiers[prop]; },
  has(_t, prop) { return prop in liveTiers; },
  ownKeys() { return Reflect.ownKeys(liveTiers); },
  getOwnPropertyDescriptor(_t, prop) { return Object.getOwnPropertyDescriptor(liveTiers, prop); },
});

/** All meta keys used across tiers — for bulk extraction during sync. */
export const ALL_WHOLESALE_META_KEYS = FALLBACK_TIERS.map(t => t.metaKey);

/** Returns the tier object for a given WC role, or null. */
export function getTierByRole(role) {
  return liveRoleMap[role] ?? null;
}

/** True if the role string is any wholesale tier. */
export function isWholesaleRole(role) {
  return (role || '').startsWith('wholesale_customer');
}

/** Returns the product meta_data key for a given wholesale role. */
export function getWholesaleMetaKey(role) {
  return liveRoleMap[role]?.metaKey ?? null;
}

/** Returns the default percentage discount for a given wholesale role. */
export function getWholesaleDiscount(role) {
  return liveRoleMap[role]?.discount ?? 0;
}

/**
 * Extract all wholesale tier prices from a WC product/variation meta_data array.
 * Returns { wholesale_customer: 45.00, wholesale_customer_10: 42.00, ... }
 * Only includes tiers that have a non-zero price set.
 */
export function extractWholesalePrices(metaData) {
  if (!Array.isArray(metaData)) return {};
  const prices = {};
  for (const tier of liveTiers) {
    const entry = metaData.find(m => m.key === tier.metaKey);
    const val = parseFloat(entry?.value || '0');
    if (val > 0) prices[tier.role] = val;
  }
  return prices;
}
