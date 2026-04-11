import useAuthStore from '../store/authStore';
import { getWholesaleDiscount } from '../lib/wholesaleTiers';

/**
 * Resolves the effective price for a product based on the user's wholesale tier.
 *
 * Priority:
 * 1. Per-product wholesale price (from wholesalePrices object) if set
 * 2. Role-level percentage discount (e.g. 5%, 10%, 25% off retail)
 * 3. Falls back to retail price
 *
 * @param {number} retailPrice
 * @param {object|null} wholesalePrices - { wholesale_customer: 45, ... }
 * @param {string|null} tierKey - e.g. 'wholesale_customer_10'
 * @returns {{ effectivePrice: number, isWholesalePrice: boolean }}
 */
export function getWholesalePrice(retailPrice, wholesalePrices, tierKey) {
  if (!tierKey || !retailPrice || retailPrice <= 0) {
    return { effectivePrice: retailPrice, isWholesalePrice: false };
  }

  // 1. Check for per-product fixed wholesale price
  const fixedPrice = wholesalePrices?.[tierKey];
  if (fixedPrice && fixedPrice > 0 && fixedPrice < retailPrice) {
    return { effectivePrice: fixedPrice, isWholesalePrice: true };
  }

  // 2. Apply role-level percentage discount
  const discountPct = getWholesaleDiscount(tierKey);
  if (discountPct > 0) {
    const discountedPrice = Math.round(retailPrice * (1 - discountPct / 100) * 100) / 100;
    return { effectivePrice: discountedPrice, isWholesalePrice: true };
  }

  return { effectivePrice: retailPrice, isWholesalePrice: false };
}

/**
 * React hook version — reads tier from auth store.
 */
export default function useWholesalePrice(retailPrice, wholesalePrices) {
  const isWholesale = useAuthStore(s => s.isWholesale);
  const tierKey = useAuthStore(s => s.getWholesaleTierKey);

  if (!isWholesale()) return { effectivePrice: retailPrice, isWholesalePrice: false };
  return getWholesalePrice(retailPrice, wholesalePrices, tierKey());
}
