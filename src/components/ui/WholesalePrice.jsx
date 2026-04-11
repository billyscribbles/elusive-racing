import useAuthStore from '../../store/authStore';
import './WholesalePrice.css';

/**
 * Displays wholesale tier-specific pricing with savings badge.
 *
 * Props:
 *  - retailPrice: number (the regular retail price)
 *  - wholesalePrices: { wholesale_customer: 45, wholesale_customer_1: 42, ... }
 *  - compact: boolean (optional, for tighter layouts like product cards)
 */
export default function WholesalePrice({ retailPrice, wholesalePrices, compact = false }) {
  const isWholesale = useAuthStore(s => s.isWholesale);
  const tierKey = useAuthStore(s => s.getWholesaleTierKey);

  if (!isWholesale() || !tierKey() || !wholesalePrices) return null;

  const wsPrice = wholesalePrices[tierKey()];
  if (!wsPrice || wsPrice <= 0) return null;

  const retail = parseFloat(retailPrice) || 0;
  if (retail <= 0) return null;

  const savings = retail - wsPrice;
  const pct = Math.round((savings / retail) * 100);

  if (savings <= 0) return null;

  return (
    <div className={`ws-price${compact ? ' ws-price--compact' : ''}`}>
      <span className="ws-price__amount">${wsPrice.toFixed(2)}</span>
      <span className="ws-price__retail">${retail.toFixed(2)}</span>
      <span className="ws-price__badge">
        {compact ? `${pct}% off` : `You save $${savings.toFixed(2)} (${pct}% off)`}
      </span>
    </div>
  );
}
