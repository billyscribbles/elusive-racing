/**
 * Wholesale Suite tier definitions and helpers.
 *
 * Each tier maps to a WooCommerce user role, a product meta_data key
 * for per-product price overrides, and a default percentage discount
 * applied to all products when no per-product price is set.
 */

export const WHOLESALE_TIERS = [
  { role: 'wholesale_customer',    label: 'Wholesale 5%',  tierNumber: 0, discount: 5,  metaKey: 'wholesale_customer_wholesale_price' },
  { role: 'wholesale_customer_10', label: 'Wholesale 10%', tierNumber: 1, discount: 10, metaKey: 'wholesale_customer_10_wholesale_price' },
  { role: 'wholesale_customer_15', label: 'Wholesale 15%', tierNumber: 2, discount: 15, metaKey: 'wholesale_customer_15_wholesale_price' },
  { role: 'wholesale_customer_20', label: 'Wholesale 20%', tierNumber: 3, discount: 20, metaKey: 'wholesale_customer_20_wholesale_price' },
  { role: 'wholesale_customer_25', label: 'Wholesale 25%', tierNumber: 4, discount: 25, metaKey: 'wholesale_customer_25_wholesale_price' },
];

/** All meta keys used across tiers — for bulk extraction during sync. */
export const ALL_WHOLESALE_META_KEYS = WHOLESALE_TIERS.map(t => t.metaKey);

/** Map of role → tier for quick lookup. */
const ROLE_TO_TIER = Object.fromEntries(WHOLESALE_TIERS.map(t => [t.role, t]));

/** Returns the tier object for a given WC role, or null. */
export function getTierByRole(role) {
  return ROLE_TO_TIER[role] ?? null;
}

/** True if the role string is any wholesale tier. */
export function isWholesaleRole(role) {
  return (role || '').startsWith('wholesale_customer');
}

/** Returns the product meta_data key for a given wholesale role. */
export function getWholesaleMetaKey(role) {
  return ROLE_TO_TIER[role]?.metaKey ?? null;
}

/** Returns the default percentage discount for a given wholesale role. */
export function getWholesaleDiscount(role) {
  return ROLE_TO_TIER[role]?.discount ?? 0;
}

/**
 * Extract all wholesale tier prices from a WC product/variation meta_data array.
 * Returns { wholesale_customer: 45.00, wholesale_customer_10: 42.00, ... }
 * Only includes tiers that have a non-zero price set.
 */
export function extractWholesalePrices(metaData) {
  if (!Array.isArray(metaData)) return {};
  const prices = {};
  for (const tier of WHOLESALE_TIERS) {
    const entry = metaData.find(m => m.key === tier.metaKey);
    const val = parseFloat(entry?.value || '0');
    if (val > 0) prices[tier.role] = val;
  }
  return prices;
}
