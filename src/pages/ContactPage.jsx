import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Truck, Store, Package, Zap, Phone, Mail } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import { formatPrice } from '../lib/formatPrice';
import { getWCShippingRates } from '../lib/woocommerce';
import './ContactPage.css';

// International countries — alphabetical by name
const COUNTRIES = [
  { code: 'AR', name: 'Argentina',            region: 'ROW'  },
  { code: 'AT', name: 'Austria',              region: 'EU'   },
  { code: 'BE', name: 'Belgium',              region: 'EU'   },
  { code: 'BR', name: 'Brazil',               region: 'ROW'  },
  { code: 'CA', name: 'Canada',               region: 'US'   },
  { code: 'CN', name: 'China',                region: 'ASIA' },
  { code: 'DK', name: 'Denmark',              region: 'EU'   },
  { code: 'FI', name: 'Finland',              region: 'EU'   },
  { code: 'FR', name: 'France',               region: 'EU'   },
  { code: 'DE', name: 'Germany',              region: 'EU'   },
  { code: 'HK', name: 'Hong Kong',            region: 'ASIA' },
  { code: 'IN', name: 'India',                region: 'ASIA' },
  { code: 'ID', name: 'Indonesia',            region: 'ASIA' },
  { code: 'IE', name: 'Ireland',              region: 'EU'   },
  { code: 'IT', name: 'Italy',                region: 'EU'   },
  { code: 'JP', name: 'Japan',                region: 'ASIA' },
  { code: 'MY', name: 'Malaysia',             region: 'ASIA' },
  { code: 'MX', name: 'Mexico',               region: 'ROW'  },
  { code: 'NL', name: 'Netherlands',          region: 'EU'   },
  { code: 'NZ', name: 'New Zealand',          region: 'NZ'   },
  { code: 'NO', name: 'Norway',               region: 'EU'   },
  { code: 'PH', name: 'Philippines',          region: 'ASIA' },
  { code: 'PL', name: 'Poland',               region: 'EU'   },
  { code: 'PT', name: 'Portugal',             region: 'EU'   },
  { code: 'SA', name: 'Saudi Arabia',         region: 'ROW'  },
  { code: 'SG', name: 'Singapore',            region: 'ASIA' },
  { code: 'ZA', name: 'South Africa',         region: 'ROW'  },
  { code: 'KR', name: 'South Korea',          region: 'ASIA' },
  { code: 'ES', name: 'Spain',                region: 'EU'   },
  { code: 'SE', name: 'Sweden',               region: 'EU'   },
  { code: 'CH', name: 'Switzerland',          region: 'EU'   },
  { code: 'TW', name: 'Taiwan',               region: 'ASIA' },
  { code: 'TH', name: 'Thailand',             region: 'ASIA' },
  { code: 'AE', name: 'United Arab Emirates', region: 'ROW'  },
  { code: 'GB', name: 'United Kingdom',       region: 'EU'   },
  { code: 'US', name: 'United States',        region: 'US'   },
  { code: 'VN', name: 'Vietnam',              region: 'ASIA' },
];

// Per-country state/postcode config for validation and dynamic form fields
const COUNTRY_CONFIG = {
  CA: {
    stateLabel: 'Province',
    states: ['AB','BC','MB','NB','NL','NT','NS','NU','ON','PE','QC','SK','YT'],
    stateRequired: true,
    postcodeLabel: 'Postal Code',
    postcodePattern: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    postcodeHint: 'e.g. K1A 0A9',
    postcodeRequired: true,
  },
  US: {
    stateLabel: 'State',
    states: ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'],
    stateRequired: true,
    postcodeLabel: 'ZIP Code',
    postcodePattern: /^\d{5}(-\d{4})?$/,
    postcodeHint: 'e.g. 90210',
    postcodeRequired: true,
  },
  GB: {
    stateLabel: 'County',
    states: null,
    stateRequired: false,
    postcodeLabel: 'Postcode',
    postcodePattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
    postcodeHint: 'e.g. SW1A 1AA',
    postcodeRequired: true,
  },
  NZ: {
    stateLabel: 'Region',
    states: null,
    stateRequired: false,
    postcodeLabel: 'Postcode',
    postcodePattern: /^\d{4}$/,
    postcodeHint: 'e.g. 1010',
    postcodeRequired: true,
  },
  JP: {
    stateLabel: 'Prefecture',
    states: null,
    stateRequired: false,
    postcodeLabel: 'Postal Code',
    postcodePattern: /^\d{3}-?\d{4}$/,
    postcodeHint: 'e.g. 100-0001',
    postcodeRequired: true,
  },
};

const DEFAULT_COUNTRY_CONFIG = {
  stateLabel: 'State / Province',
  states: null,
  stateRequired: false,
  postcodeLabel: 'Postcode / ZIP',
  postcodePattern: null,
  postcodeHint: '',
  postcodeRequired: false,
};

function getCountryConfig(code) {
  return COUNTRY_CONFIG[code] ?? DEFAULT_COUNTRY_CONFIG;
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
            <span className="cp-mini-price">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="cp-mini-divider" />
      <div className="cp-mini-row">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="cp-mini-row cp-mini-row--muted">
        <span>Shipping</span>
        <span>{fulfillment === 'collect' ? 'Free' : shippingCost !== null ? formatPrice(shippingCost) : 'Calculate below'}</span>
      </div>
      {taxAmount > 0 && (
        <div className="cp-mini-row cp-mini-row--muted">
          <span>GST (incl.)</span>
          <span>{formatPrice(taxAmount)}</span>
        </div>
      )}
      {hasTotal && (
        <div className="cp-mini-row cp-mini-total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
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
  const [contactRequired, setContactRequired] = useState(false);

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
    // Phone is optional, but if provided must look like an AU number.
    if (contact.phone && contact.phone.trim()) {
      const digits = contact.phone.replace(/[\s\-().]/g, '');
      if (!/^(\+?61|0)[2-478]\d{8}$/.test(digits)) {
        e.phone = 'Enter a valid Australian phone number (e.g. 0412 345 678)';
      }
    }
    if (fulfillment === 'delivery') {
      if (!shipping.address1.trim()) e.address1 = 'Address is required';
      if (!shipping.city.trim())     e.city     = 'City is required';
      if (freightTab === 'domestic') {
        if (!shipping.state)           e.state    = 'State is required';
        if (!shipping.postcode.trim()) e.postcode = 'Postcode is required';
        else if (!/^\d{4}$/.test(shipping.postcode.trim())) e.postcode = 'Enter a valid 4-digit postcode';
      } else {
        if (!shipping.country) e.country = 'Country is required';
        else {
          const cfg = getCountryConfig(shipping.country);
          if (cfg.stateRequired && !shipping.state)
            e.state = `${cfg.stateLabel} is required`;
          if (cfg.postcodeRequired && !shipping.postcode.trim())
            e.postcode = `${cfg.postcodeLabel} is required`;
          else if (cfg.postcodePattern && shipping.postcode.trim() && !cfg.postcodePattern.test(shipping.postcode.trim()))
            e.postcode = `Enter a valid ${cfg.postcodeLabel.toLowerCase()} ${cfg.postcodeHint ? `(${cfg.postcodeHint})` : ''}`.trim();
        }
      }
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
    setContactRequired(false);
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
    setContactRequired(false);

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
        const result = await getWCShippingRates(items, {
          address1: shipping.address1,
          address2: shipping.address2,
          city:     shipping.city,
          state:    shipping.state,
          postcode: shipping.postcode,
          country:  'AU',
        });
        if (!result.ok) {
          setFreightError(result.error);
        } else if (result.rates.length === 0) {
          setFreightError('No shipping rates found for this address. Please call us on 03 9574 1710 for a freight quote.');
        } else {
          setFreightRates(result.rates);
          setTaxAmount(result.taxAmount);
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
        const result = await getWCShippingRates(items, {
          address1: shipping.address1,
          address2: shipping.address2,
          city:     shipping.city,
          state:    shipping.state,
          postcode: shipping.postcode,
          country:  shipping.country,
        });
        if (!result.ok) {
          // Shipping calculator unavailable — show the error and also offer manual quote.
          setFreightError(result.error);
          setContactRequired(true);
        } else if (result.rates.length > 0) {
          // Live rates from WooCommerce shipping plugin (e.g. UPS)
          setFreightRates(result.rates);
          setTaxAmount(result.taxAmount);
          setRatesAreEstimates(false);
        } else {
          // No WC zone configured for this country — require manual quote
          setContactRequired(true);
        }
      } catch {
        // Network error — require manual quote
        setContactRequired(true);
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
                      onChange={(e) => {
                        setShipping({ country: e.target.value, state: '', postcode: '' });
                        setFreightRates([]); setFreight(null); setContactRequired(false);
                        setErrors(s => { const n={...s}; delete n.country; delete n.state; delete n.postcode; return n; });
                      }}
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
                ) : (() => {
                  const cfg = getCountryConfig(shipping.country);
                  return (
                    <>
                      {field('City / Suburb', 'city', shipping, setShipping, { autoComplete: 'address-level2' })}
                      <div className="cp-row-2">
                        {/* State/Province — dropdown for US/CA, free text otherwise */}
                        {cfg.states ? (
                          <div className={`cp-field${errors.state ? ' cp-field--error' : ''}`}>
                            <label className="cp-label">
                              {cfg.stateLabel}{cfg.stateRequired && <span className="cp-required">*</span>}
                            </label>
                            <select
                              className="cp-input cp-select"
                              value={shipping.state}
                              onChange={(e) => { setShipping({ state: e.target.value }); setErrors(s => { const n={...s}; delete n.state; return n; }); }}
                            >
                              <option value="">Select…</option>
                              {cfg.states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {errors.state && <span className="cp-error">{errors.state}</span>}
                          </div>
                        ) : (
                          field(cfg.stateLabel, 'state', shipping, setShipping, {
                            autoComplete: 'address-level1',
                            placeholder: cfg.stateLabel,
                            optional: !cfg.stateRequired,
                          })
                        )}
                        {/* Postcode / ZIP */}
                        <div className={`cp-field${errors.postcode ? ' cp-field--error' : ''}`}>
                          <label className="cp-label">
                            {cfg.postcodeLabel}{cfg.postcodeRequired && <span className="cp-required">*</span>}
                          </label>
                          <input
                            className="cp-input"
                            placeholder={cfg.postcodeHint}
                            value={shipping.postcode}
                            autoComplete="postal-code"
                            onChange={(e) => { setShipping({ postcode: e.target.value }); setErrors(s => { const n={...s}; delete n.postcode; return n; }); }}
                          />
                          {errors.postcode && <span className="cp-error">{errors.postcode}</span>}
                        </div>
                      </div>
                    </>
                  );
                })()}

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
                          <span className="cp-freight-price">{formatPrice(rate.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {contactRequired && (
                    <div className="cp-intl-contact">
                      <p className="cp-intl-contact-heading">International shipping quote required</p>
                      <p className="cp-intl-contact-body">
                        We can&apos;t automatically calculate shipping to your destination. One of our team members will contact you with a freight quote before your order is dispatched.
                      </p>
                      <div className="cp-intl-contact-links">
                        <a href="tel:+61395741710" className="cp-intl-contact-link">
                          <Phone size={14} /> 03 9574 1710
                        </a>
                        <a href="mailto:info@elusiveracing.com.au" className="cp-intl-contact-link">
                          <Mail size={14} /> info@elusiveracing.com.au
                        </a>
                      </div>
                      <label className={`cp-freight-option cp-freight-option--contact${freight?.id === 'contact_quote' ? ' selected' : ''}`}>
                        <input
                          type="radio"
                          name="freight"
                          value="contact_quote"
                          checked={freight?.id === 'contact_quote'}
                          onChange={() => setFreight({ id: 'contact_quote', label: 'International shipping — quote to follow', price: 0 })}
                        />
                        <span className="cp-freight-icon"><Package size={15} /></span>
                        <span className="cp-freight-label">I understand — our team will contact me with a quote</span>
                        <span className="cp-freight-price cp-freight-price--tbd">TBD</span>
                      </label>
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
