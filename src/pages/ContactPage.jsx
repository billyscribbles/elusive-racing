import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Truck, Store, Package, Zap } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './ContactPage.css';

// Mock freight rates — domestic
function calculateDomesticRates(state) {
  const vic  = ['VIC'];
  const near = ['NSW', 'ACT', 'QLD', 'SA'];
  const far  = ['WA', 'TAS', 'NT'];
  if (vic.includes(state))  return [{ id: 'std', label: 'Standard (3–5 business days)', price: 12.50 }, { id: 'exp', label: 'Express (1–2 business days)', price: 19.95 }];
  if (near.includes(state)) return [{ id: 'std', label: 'Standard (5–7 business days)', price: 14.95 }, { id: 'exp', label: 'Express (2–3 business days)', price: 24.95 }];
  if (far.includes(state))  return [{ id: 'std', label: 'Standard (7–10 business days)', price: 18.95 }, { id: 'exp', label: 'Express (3–5 business days)', price: 32.95 }];
  return [];
}

// Mock freight rates — international by region
const INTL_REGIONS = [
  { value: 'NZ',   label: 'New Zealand' },
  { value: 'ASIA', label: 'Asia Pacific (Japan, Singapore, HK, Korea…)' },
  { value: 'US',   label: 'USA / Canada' },
  { value: 'EU',   label: 'UK / Europe' },
  { value: 'ROW',  label: 'Rest of World' },
];

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

function MiniOrderSummary() {
  const { items } = useCartStore();
  const { freight, fulfillment } = useCheckoutStore();
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total     = subtotal + (freight ? freight.price : 0);
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
        <span>{fulfillment === 'collect' ? 'Free' : freight ? `$${freight.price.toFixed(2)}` : 'Calculate below'}</span>
      </div>
      {(freight || fulfillment === 'collect') && (
        <div className="cp-mini-row cp-mini-total">
          <span>Total</span>
          <span>${fulfillment === 'collect' ? subtotal.toFixed(2) : total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default function ContactPage() {
  const navigate = useNavigate();
  const { contact, shipping, fulfillment, freight, setContact, setShipping, setFulfillment, setFreight } = useCheckoutStore();
  const { items } = useCartStore();

  const [errors, setErrors] = useState({});
  const [freightTab, setFreightTab]         = useState('domestic'); // 'domestic' | 'international'
  const [intlRegion, setIntlRegion]         = useState('');
  const [freightRates, setFreightRates]     = useState([]);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError]     = useState('');

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
    if (!contact.email.trim())     e.email      = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(contact.email)) e.email = 'Enter a valid email';
    if (!contact.firstName.trim()) e.firstName   = 'First name is required';
    if (!contact.lastName.trim())  e.lastName    = 'Last name is required';
    if (fulfillment === 'delivery') {
      if (!shipping.address1.trim()) e.address1  = 'Address is required';
      if (!shipping.city.trim())     e.city      = 'City is required';
      if (!shipping.state)           e.state     = 'State is required';
      if (!shipping.postcode.trim()) e.postcode  = 'Postcode is required';
    }
    return e;
  }

  async function handleCalculateFreight() {
    setFreightError('');
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
    } else {
      if (!intlRegion) {
        setFreightError('Please select a region first.');
        return;
      }
    }
    setFreightLoading(true);
    setFreightRates([]);
    setFreight(null);
    await new Promise((r) => setTimeout(r, 900));
    const rates = freightTab === 'domestic'
      ? calculateDomesticRates(shipping.state)
      : calculateIntlRates(intlRegion);
    setFreightRates(rates);
    setFreightLoading(false);
  }

  function handleFreightTabChange(tab) {
    setFreightTab(tab);
    setFreightRates([]);
    setFreightError('');
    setFreight(null);
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
                {field('Address line 1', 'address1', shipping, setShipping, { autoComplete: 'address-line1', placeholder: 'Street address' })}
                {field('Address line 2', 'address2', shipping, setShipping, { autoComplete: 'address-line2', placeholder: 'Apt, unit, suite (optional)', optional: true })}
                <div className="cp-row-3">
                  {field('City / Suburb', 'city', shipping, setShipping, { autoComplete: 'address-level2' })}
                  <div className={`cp-field${errors.state ? ' cp-field--error' : ''}`}>
                    <label className="cp-label">State<span className="cp-required">*</span></label>
                    <select
                      className="cp-input cp-select"
                      value={shipping.state}
                      onChange={(e) => { setShipping({ state: e.target.value }); setErrors((s) => { const n={...s}; delete n.state; return n; }); }}
                    >
                      <option value="">Select</option>
                      {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <span className="cp-error">{errors.state}</span>}
                  </div>
                  {field('Postcode', 'postcode', shipping, setShipping, { autoComplete: 'postal-code', placeholder: '3000' })}
                </div>
                <div className="cp-field">
                  <label className="cp-label">Country</label>
                  <input className="cp-input" value="Australia" readOnly />
                </div>

                {/* Freight calculator */}
                <div className="cp-freight">
                  <div className="cp-freight-tabs">
                    <button type="button" className={`cp-freight-tab${freightTab === 'domestic' ? ' active' : ''}`} onClick={() => handleFreightTabChange('domestic')}>
                      <Truck size={14} /> Domestic (Australia)
                    </button>
                    <button type="button" className={`cp-freight-tab${freightTab === 'international' ? ' active' : ''}`} onClick={() => handleFreightTabChange('international')}>
                      <Package size={14} /> International
                    </button>
                  </div>

                  {freightTab === 'international' && (
                    <div className="cp-field">
                      <label className="cp-label">Region <span className="cp-required">*</span></label>
                      <div className="cp-select-wrap">
                        <select className="cp-input cp-select" value={intlRegion} onChange={(e) => { setIntlRegion(e.target.value); setFreightRates([]); setFreight(null); }}>
                          <option value="">Select region…</option>
                          {INTL_REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

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
            <MiniOrderSummary />
            <button type="submit" className="cp-continue">
              Continue to Payment <ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
