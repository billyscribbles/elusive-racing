/**
 * Wholesale Suite tier definitions and helpers.
 *
 * Each tier maps to a WooCommerce user role and a product meta_data key
 * that holds that tier's wholesale price.
 */

export const WHOLESALE_TIERS = [
  { role: 'wholesale_customer',   label: 'Wholesale',          tierNumber: 0, metaKey: 'wholesale_customer_wholesale_price' },
  { role: 'wholesale_customer_1', label: 'Wholesale Tier 1',   tierNumber: 1, metaKey: 'wholesale_customer_1_wholesale_price' },
  { role: 'wholesale_customer_2', label: 'Wholesale Tier 2',   tierNumber: 2, metaKey: 'wholesale_customer_2_wholesale_price' },
];

/** All meta keys used across tiers — for bulk extraction during sync. */
export const ALL_WHOLESALE_META_KEYS = WHOLESALE_TIERS.map(t => t.metaKey);

/** Map of role → meta key for quick lookup. */
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

/**
 * Extract all wholesale tier prices from a WC product/variation meta_data array.
 * Returns { wholesale_customer: 45.00, wholesale_customer_1: 42.00, ... }
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
