import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Truck, Store, Package, Zap } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import { getWCShippingRates } from '../lib/woocommerce';
import './ContactPage.css';

// International countries with their shipping region for rate lookup
const COUNTRIES = [
  { code: 'NZ', name: 'New Zealand',          region: 'NZ'   },
  { code: 'JP', name: 'Japan',                region: 'ASIA' },
  { code: 'SG', name: 'Singapore',            region: 'ASIA' },
  { code: 'HK', name: 'Hong Kong',            region: 'ASIA' },
  { code: 'KR', name: 'South Korea',          region: 'ASIA' },
  { code: 'TW', name: 'Taiwan',               region: 'ASIA' },
  { code: 'MY', name: 'Malaysia',             region: 'ASIA' },
  { code: 'TH', name: 'Thailand',             region: 'ASIA' },
  { code: 'ID', name: 'Indonesia',            region: 'ASIA' },
  { code: 'PH', name: 'Philippines',          region: 'ASIA' },
  { code: 'VN', name: 'Vietnam',              region: 'ASIA' },
  { code: 'IN', name: 'India',                region: 'ASIA' },
  { code: 'CN', name: 'China',                region: 'ASIA' },
  { code: 'US', name: 'United States',        region: 'US'   },
  { code: 'CA', name: 'Canada',               region: 'US'   },
  { code: 'GB', name: 'United Kingdom',       region: 'EU'   },
  { code: 'DE', name: 'Germany',              region: 'EU'   },
  { code: 'FR', name: 'France',               region: 'EU'   },
  { code: 'IT', name: 'Italy',                region: 'EU'   },
  { code: 'ES', name: 'Spain',                region: 'EU'   },
  { code: 'NL', name: 'Netherlands',          region: 'EU'   },
  { code: 'BE', name: 'Belgium',              region: 'EU'   },
  { code: 'SE', name: 'Sweden',               region: 'EU'   },
  { code: 'NO', name: 'Norway',               region: 'EU'   },
  { code: 'DK', name: 'Denmark',              region: 'EU'   },
  { code: 'AT', name: 'Austria',              region: 'EU'   },
  { code: 'CH', name: 'Switzerland',          region: 'EU'   },
  { code: 'IE', name: 'Ireland',              region: 'EU'   },
  { code: 'PT', name: 'Portugal',             region: 'EU'   },
  { code: 'FI', name: 'Finland',              region: 'EU'   },
  { code: 'PL', name: 'Poland',               region: 'EU'   },
  { code: 'ZA', name: 'South Africa',         region: 'ROW'  },
  { code: 'AE', name: 'United Arab Emirates', region: 'ROW'  },
  { code: 'SA', name: 'Saudi Arabia',         region: 'ROW'  },
  { code: 'BR', name: 'Brazil',               region: 'ROW'  },
  { code: 'MX', name: 'Mexico',               region: 'ROW'  },
  { code: 'AR', name: 'Argentina',            region: 'ROW'  },
];

// Fallback rates for international (WC won't have international zones)
function calculateIntlRates(region) {
  const map = {
    NZ:   [{ id: 'std', label: 'Standard (7–14 business days)',  price: 24.95 }, { id: 'exp', label: 'Express (3–5 business days)',   price: 44.95 }],
    ASIA: [{ id: 'std', label: 'Standard (10–14 business days)', price: 34.95 }, { id: 'exp', label: 'Express (5–7 business days)',   price: 59.95 }],
    US:   [{ id: 'std', label: 'Standard (14–21 business days)', price: 44.95 }, { id: 'exp', label: 'Express (7–10 business days)',  price: 79.95 }],
    EU:   [{ id: 'std', label: 'Standard (14–21 business days)', price: 49.95 }, { id: 'exp', label: 'Express (7–10 business days)',  price: 89.95 }],
    ROW:  [{ id: 'std', label: 'Standard (21–30 business days)', price: 59.95 }, { id: 'exp', label: 'Express (10–14 business days)', price: 109.95 }],
  };
  return map[region] ?? [];
}

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

function MiniOrderSummary({ taxAmount = 0 }) {
  const { items } = useCartStore();
  const { freight, fulfillment } = useCheckoutStore();
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const shippingCost = fulfillment === 'collect' ? 0 : (freight ? freight.price : null);
  const total     = subtotal + (shippingCost ?? 0) + (taxAmount ?? 0);
  const hasTotal  = fulfillment === 'collect' || freight;
  return (
    <div className="cp-mini-order">
      <ul className="cp-mini-items">
        {items.map((item) => (
          <li key={item.id} className="cp-mini-item">
            <div className="cp-mini-img">
              {item.image ? <img src={item.image} alt={item.name} /> : <div className="cp-mini-no-img" />}
              <span className="cp-mini-qty">{item.quantity}</span>
            </div>
            <div className="cp-mini-info">
              <span className="cp-mini-brand">{item.brand}</span>
              <p className="cp-mini-name">{item.name}</p>
            </div>
            <span className="cp-mini-price">${(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="cp-mini-divider" />
      <div className="cp-mini-row">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="cp-mini-row cp-mini-row--muted">
        <span>Shipping</span>
        <span>{fulfillment === 'collect' ? 'Free' : shippingCost !== null ? `$${shippingCost.toFixed(2)}` : 'Calculate below'}</span>
      </div>
      {taxAmount > 0 && (
        <div className="cp-mini-row cp-mini-row--muted">
          <span>GST (incl.)</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
      )}
      {hasTotal && (
        <div className="cp-mini-row cp-mini-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default function ContactPage() {
  const navigate = useNavigate();
  const { contact, shipping, fulfillment, freight, setContact, setShipping, setFulfillment, setFreight } = useCheckoutStore();
  const { items } = useCartStore();

  const [errors, setErrors]               = useState({});
  const [freightTab, setFreightTab]       = useState('domestic'); // 'domestic' | 'international'
  const [freightRates, setFreightRates]   = useState([]);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError]   = useState('');
  const [taxAmount, setTaxAmount]         = useState(0);
  const [ratesAreEstimates, setRatesAreEstimates] = useState(false);

  if (items.length === 0) {
    return (
      <div className="cp-page">
        <div className="container">
          <p className="cp-empty">Your cart is empty. <a href="/shop">Continue shopping</a></p>
        </div>
      </div>
    );
  }

  function validate() {
    const e = {};
    if (!contact.email.trim())     e.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(contact.email)) e.email = 'Enter a valid email';
    if (!contact.firstName.trim()) e.firstName  = 'First name is required';
    if (!contact.lastName.trim())  e.lastName   = 'Last name is required';
    if (fulfillment === 'delivery') {
      if (!shipping.address1.trim()) e.address1 = 'Address is required';
      if (!shipping.city.trim())     e.city     = 'City is required';
      if (!shipping.postcode.trim()) e.postcode = 'Postcode is required';
      if (freightTab === 'domestic' && !shipping.state) e.state = 'State is required';
      if (freightTab === 'international' && !shipping.country) e.country = 'Country is required';
    }
    return e;
  }

  function handleFreightTabChange(tab) {
    setFreightTab(tab);
    setFreightRates([]);
    setFreightError('');
    setFreight(null);
    setTaxAmount(0);
    setRatesAreEstimates(false);
    // Reset country/state to match the new tab
    if (tab === 'domestic') {
      setShipping({ country: 'AU', state: '' });
    } else {
      setShipping({ country: '', state: '' });
    }
  }

  async function handleCalculateFreight() {
    setFreightError('');
    setFreightRates([]);
    setFreight(null);
    setTaxAmount(0);
    setRatesAreEstimates(false);

    if (freightTab === 'domestic') {
      const missing = [];
      if (!shipping.address1.trim()) missing.push('street address');
      if (!shipping.city.trim())     missing.push('city / suburb');
      if (!shipping.state)           missing.push('state');
      if (!shipping.postcode.trim()) missing.push('postcode');
      if (missing.length) {
        setFreightError(`Please fill in your ${missing.join(', ')} before calculating freight.`);
        return;
      }
      setFreightLoading(true);
      try {
        const { rates, taxAmount: tax } = await getWCShippingRates(items, {
          address1: shipping.address1,
          address2: shipping.address2,
          city:     shipping.city,
          state:    shipping.state,
          postcode: shipping.postcode,
          country:  'AU',
        });
        if (rates.length === 0) {
          setFreightError('No shipping rates found for this address. Please call us on 03 9574 1710 for a freight quote.');
        } else {
          setFreightRates(rates);
          setTaxAmount(tax);
        }
      } catch {
        setFreightError('Could not retrieve shipping rates. Please try again or call us on 03 9574 1710.');
      } finally {
        setFreightLoading(false);
      }
    } else {
      if (!shipping.country) {
        setFreightError('Please select a country first.');
        return;
      }
      if (!shipping.postcode.trim()) {
        setFreightError('Please enter your postcode / ZIP before calculating freight.');
        return;
      }
      setFreightLoading(true);
      try {
        const { rates, taxAmount: tax } = await getWCShippingRates(items, {
          address1: shipping.address1,
          address2: shipping.address2,
          city:     shipping.city,
          state:    shipping.state,
          postcode: shipping.postcode,
          country:  shipping.country,
        });
        if (rates.length > 0) {
          // Live rates from WooCommerce shipping plugin (e.g. UPS)
          setFreightRates(rates);
          setTaxAmount(tax);
          setRatesAreEstimates(false);
        } else {
          // No WC zone configured for this country — fall back to estimates
          const region = COUNTRIES.find(c => c.code === shipping.country)?.region ?? 'ROW';
          setFreightRates(calculateIntlRates(region));
          setRatesAreEstimates(true);
        }
      } catch {
        // Network error — fall back to estimates
        const region = COUNTRIES.find(c => c.code === shipping.country)?.region ?? 'ROW';
        setFreightRates(calculateIntlRates(region));
        setRatesAreEstimates(true);
      } finally {
        setFreightLoading(false);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (fulfillment === 'delivery' && !freight) {
      setFreightError('Please calculate and select a freight option to continue.');
      return;
    }
    navigate('/checkout/payment');
  }

  function field(label, key, store, setter, opts = {}) {
    const val = store[key];
    const err = errors[key];
    return (
      <div className={`cp-field${err ? ' cp-field--error' : ''}`}>
        <label className="cp-label">{label}{!opts.optional && <span className="cp-required">*</span>}</label>
        <input
          className="cp-input"
          type={opts.type || 'text'}
          placeholder={opts.placeholder || ''}
          value={val}
          autoComplete={opts.autoComplete}
          onChange={(ev) => { setter({ [key]: ev.target.value }); if (err) setErrors((s) => { const n = {...s}; delete n[key]; return n; }); }}
        />
        {err && <span className="cp-error">{err}</span>}
      </div>
    );
  }

  const isDomestic = freightTab === 'domestic';

  return (
    <div className="cp-page">
      <div className="container">

        <div className="cp-header">
          <a href="/checkout" className="cp-back"><ArrowLeft size={16} /> Back to Cart</a>
          <h1 className="cp-title">Contact &amp; Shipping</h1>
          <CheckoutSteps current={1} />
        </div>

        <form className="cp-layout" onSubmit={handleSubmit} noValidate>

          {/* Left: form */}
          <div className="cp-form-col">

            {/* Contact info */}
            <div className="cp-section">
              <h2 className="cp-section-title">Contact Information</h2>
              {field('Email address', 'email', contact, setContact, { type: 'email', autoComplete: 'email', placeholder: 'you@example.com' })}
              <div className="cp-row-2">
                {field('First name', 'firstName', contact, setContact, { autoComplete: 'given-name' })}
                {field('Last name',  'lastName',  contact, setContact, { autoComplete: 'family-name' })}
              </div>
              {field('Phone', 'phone', contact, setContact, { type: 'tel', autoComplete: 'tel', placeholder: '04xx xxx xxx', optional: true })}
            </div>

            {/* Fulfilment method */}
            <div className="cp-section">
              <h2 className="cp-section-title">Fulfilment Method</h2>
              <div className="cp-fulfillment-tabs">
                <button type="button" className={`cp-fulfillment-tab${fulfillment === 'delivery' ? ' active' : ''}`} onClick={() => setFulfillment('delivery')}>
                  <Truck size={15} /> Delivery
                </button>
                <button type="button" className={`cp-fulfillment-tab${fulfillment === 'collect' ? ' active' : ''}`} onClick={() => setFulfillment('collect')}>
                  <Store size={15} /> Click &amp; Collect
                </button>
              </div>

              {fulfillment === 'collect' && (
                <div className="cp-collect-note">
                  <Store size={14} />
                  <div>
                    <strong>Elusive Racing — Clayton South</strong>
                    <p>1/32 Graham Rd, Clayton South VIC 3169</p>
                    <p>Ready same or next business day. We&apos;ll contact you when your order is ready.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping address — only shown for delivery */}
            {fulfillment === 'delivery' && (
              <div className="cp-section">
                <h2 className="cp-section-title">Shipping Address</h2>

                {/* Domestic / International — at the top */}
                <div className="cp-freight-tabs cp-freight-tabs--top">
                  <button type="button" className={`cp-freight-tab${isDomestic ? ' active' : ''}`} onClick={() => handleFreightTabChange('domestic')}>
                    <Truck size={14} /> Domestic (Australia)
                  </button>
                  <button type="button" className={`cp-freight-tab${!isDomestic ? ' active' : ''}`} onClick={() => handleFreightTabChange('international')}>
                    <Package size={14} /> International
                  </button>
                </div>

                {/* Country selector */}
                {isDomestic ? (
                  <div className="cp-field">
                    <label className="cp-label">Country</label>
                    <input className="cp-input" value="Australia" readOnly />
                  </div>
                ) : (
                  <div className={`cp-field${errors.country ? ' cp-field--error' : ''}`}>
                    <label className="cp-label">Country<span className="cp-required">*</span></label>
                    <select
                      className="cp-input cp-select"
                      value={shipping.country}
                      onChange={(e) => { setShipping({ country: e.target.value }); setFreightRates([]); setFreight(null); setErrors(s => { const n={...s}; delete n.country; return n; }); }}
                    >
                      <option value="">Select country…</option>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    {errors.country && <span className="cp-error">{errors.country}</span>}
                  </div>
                )}

                {field('Address line 1', 'address1', shipping, setShipping, { autoComplete: 'address-line1', placeholder: 'Street address' })}
                {field('Address line 2', 'address2', shipping, setShipping, { autoComplete: 'address-line2', placeholder: 'Apt, unit, suite (optional)', optional: true })}

                {isDomestic ? (
                  <div className="cp-row-3">
                    {field('City / Suburb', 'city', shipping, setShipping, { autoComplete: 'address-level2' })}
                    <div className={`cp-field${errors.state ? ' cp-field--error' : ''}`}>
                      <label className="cp-label">State<span className="cp-required">*</span></label>
                      <select
                        className="cp-input cp-select"
                        value={shipping.state}
                        onChange={(e) => { setShipping({ state: e.target.value }); setErrors(s => { const n={...s}; delete n.state; return n; }); }}
                      >
                        <option value="">Select</option>
                        {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.state && <span className="cp-error">{errors.state}</span>}
                    </div>
                    {field('Postcode', 'postcode', shipping, setShipping, { autoComplete: 'postal-code', placeholder: '3000' })}
                  </div>
                ) : (
                  <>
                    <div className="cp-row-2">
                      {field('City / Suburb', 'city', shipping, setShipping, { autoComplete: 'address-level2' })}
                      {field('State / Province', 'state', shipping, setShipping, { autoComplete: 'address-level1', placeholder: 'e.g. ON, CA', optional: true })}
                    </div>
                    {field('Postcode / ZIP', 'postcode', shipping, setShipping, { autoComplete: 'postal-code', placeholder: '' })}
                  </>
                )}

                {/* Freight calculator */}
                <div className="cp-freight">
                  <button
                    type="button"
                    className={`cp-freight-btn${freightLoading ? ' loading' : ''}`}
                    onClick={handleCalculateFreight}
                    disabled={freightLoading}
                  >
                    <Truck size={15} />
                    {freightLoading ? 'Calculating…' : 'Calculate Freight Cost'}
                  </button>

                  {freightError && <p className="cp-freight-error">{freightError}</p>}

                  {freightRates.length > 0 && (
                    <div className="cp-freight-rates">
                      {ratesAreEstimates && (
                        <p className="cp-freight-estimate-note">Estimated rates — final price confirmed at dispatch</p>
                      )}
                      {freightRates.map((rate) => (
                        <label key={rate.id} className={`cp-freight-option${freight?.id === rate.id ? ' selected' : ''}`}>
                          <input type="radio" name="freight" value={rate.id} checked={freight?.id === rate.id} onChange={() => setFreight(rate)} />
                          <span className="cp-freight-icon">
                            {rate.id === 'exp' ? <Zap size={15} /> : <Package size={15} />}
                          </span>
                          <span className="cp-freight-label">{rate.label}</span>
                          <span className="cp-freight-price">${rate.price.toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right: mini order summary + continue */}
          <div className="cp-summary-col">
            <h2 className="cp-summary-heading">Your Order</h2>
            <MiniOrderSummary taxAmount={taxAmount} />
            <button type="submit" className="cp-continue">
              Continue to Payment <ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
