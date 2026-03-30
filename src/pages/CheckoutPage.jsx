import { useState } from 'react';
import { ShoppingBag, Trash2, Minus, Plus, ArrowLeft, Truck, Store, Wrench, Lock, ShieldCheck, X, Package, ChevronDown } from 'lucide-react';
import { getWCShippingRates } from '../lib/woocommerce';

const BOOKING_URL = 'https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import './CheckoutPage.css';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const COUNTRIES = [
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
];

function FreightEstimator({ items }) {
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState('domestic');
  const [state, setState]       = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry]   = useState('');
  const [province, setProvince] = useState('');
  const [loading, setLoading]   = useState(false);
  const [rates, setRates]       = useState([]);
  const [error, setError]       = useState('');
  const [isEstimate, setIsEstimate] = useState(false);

  function reset() {
    setRates([]); setError(''); setIsEstimate(false);
  }

  function switchTab(t) {
    setTab(t); reset();
    if (t === 'domestic') { setCountry(''); setProvince(''); }
    else { setState(''); }
  }

  async function calculate() {
    reset();
    if (tab === 'domestic') {
      if (!state || !postcode.trim()) { setError('Please select a state and enter your postcode.'); return; }
    } else {
      if (!country || !postcode.trim()) { setError('Please select a country and enter your postcode / ZIP.'); return; }
    }
    setLoading(true);
    try {
      const { rates: r } = await getWCShippingRates(items, {
        state:   tab === 'domestic' ? state : province,
        postcode,
        country: tab === 'domestic' ? 'AU' : country,
      });
      if (r.length > 0) {
        setRates(r); setIsEstimate(false);
      } else {
        // Fallback estimate if WC returns no zone for this destination
        setRates([{ id: 'est', label: 'Shipping estimate', price: tab === 'domestic' ? 14.95 : 49.95 }]);
        setIsEstimate(true);
      }
    } catch {
      setError('Could not fetch rates. Please continue to checkout for shipping options.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="co-freight-estimator">
      <button type="button" className="co-freight-toggle" onClick={() => setOpen(o => !o)}>
        <Truck size={13} /> Calculate freight cost
        <ChevronDown size={13} className={`co-freight-chevron${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div className="co-freight-body">
          <div className="co-freight-tabs">
            <button type="button" className={`co-freight-tab${tab === 'domestic' ? ' active' : ''}`} onClick={() => switchTab('domestic')}>
              <Truck size={12} /> Australia
            </button>
            <button type="button" className={`co-freight-tab${tab === 'international' ? ' active' : ''}`} onClick={() => switchTab('international')}>
              <Package size={12} /> International
            </button>
          </div>

          {tab === 'domestic' ? (
            <div className="co-freight-inputs">
              <select className="co-freight-select" value={state} onChange={e => { setState(e.target.value); reset(); }}>
                <option value="">State…</option>
                {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="co-freight-input" placeholder="Postcode" value={postcode} maxLength={4} onChange={e => { setPostcode(e.target.value); reset(); }} />
            </div>
          ) : (
            <div className="co-freight-inputs co-freight-inputs--intl">
              <select className="co-freight-select" value={country} onChange={e => { setCountry(e.target.value); reset(); }}>
                <option value="">Country…</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input className="co-freight-input" placeholder="State / Province" value={province} onChange={e => { setProvince(e.target.value); reset(); }} />
              <input className="co-freight-input" placeholder="Postcode / ZIP" value={postcode} onChange={e => { setPostcode(e.target.value); reset(); }} />
            </div>
          )}

          <button className={`co-freight-calc-btn${loading ? ' loading' : ''}`} onClick={calculate} disabled={loading}>
            {loading ? 'Calculating…' : 'Get Rates'}
          </button>

          {error && <p className="co-freight-error">{error}</p>}

          {rates.length > 0 && (
            <div className="co-freight-results">
              {isEstimate && <p className="co-freight-estimate-note">Estimated — confirmed at dispatch</p>}
              {rates.map(r => (
                <div key={r.id} className="co-freight-rate-row">
                  <span>{r.label}</span>
                  <span>${r.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckoutLineItem({ item }) {
  const { removeItem, updateQuantity } = useCartStore();

  return (
    <div className="co-line">
      <div className="co-line-image">
        {item.image
          ? <img src={item.image} alt={item.name} />
          : <div className="co-line-no-image" />
        }
      </div>
      <div className="co-line-details">
        {item.brand && <span className="co-line-brand">{item.brand}</span>}
        <p className="co-line-name">{item.name}</p>
        <div className="co-line-bottom">
          <div className="co-qty">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
              <Minus size={12} />
            </button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
              <Plus size={12} />
            </button>
          </div>
          <span className="co-line-price">${(item.price * item.quantity).toFixed(2)}</span>
          <button className="co-line-remove" onClick={() => removeItem(item.id)} aria-label="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { items, clearCart, openCart } = useCartStore();
  const [fulfillment, setFulfillment] = useState('delivery');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  const isEmpty = items.length === 0;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="co-page">
      <div className="container">

        <div className="co-header">
          <a href="/shop" className="co-back">
            <ArrowLeft size={16} /> Continue Shopping
          </a>
          <h1 className="co-title">Checkout</h1>
          <CheckoutSteps current={0} />
        </div>

        {isEmpty ? (
          <div className="co-empty">
            <ShoppingBag size={64} strokeWidth={1} />
            <p>Your cart is empty.</p>
            <a href="/shop" className="co-empty-btn">Browse Products</a>
          </div>
        ) : (
          <div className="co-layout">

            {/* Line items + fulfillment */}
            <div className="co-left-col">
              <div className="co-lines">
                <div className="co-lines-header">
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                  <button className="co-clear" onClick={clearCart}>Clear cart</button>
                </div>
                {items.map((item) => (
                  <CheckoutLineItem key={item.id} item={item} />
                ))}
              </div>

              {/* Delivery / Click & Collect tabs */}
              <div className="co-fulfillment-card">
                <h3 className="co-fulfillment-heading">Fulfilment Method</h3>
                <div className="co-fulfillment-tabs">
                  <button
                    className={`co-fulfillment-tab${fulfillment === 'delivery' ? ' active' : ''}`}
                    onClick={() => setFulfillment('delivery')}
                  >
                    <Truck size={14} /> Delivery
                  </button>
                  <button
                    className={`co-fulfillment-tab${fulfillment === 'collect' ? ' active' : ''}`}
                    onClick={() => setFulfillment('collect')}
                  >
                    <Store size={14} /> Click &amp; Collect
                  </button>
                </div>
                {fulfillment === 'delivery' && (
                  <p className="co-fulfillment-note">
                    <Truck size={13} /> Standard &amp; express shipping Australia-wide. Rates calculated at checkout.
                  </p>
                )}
                {fulfillment === 'collect' && (
                  <p className="co-fulfillment-note">
                    <Store size={13} /> Pick up from <strong>1/32 Graham Rd, Clayton South VIC 3169</strong>. Ready same or next business day.
                  </p>
                )}
              </div>

              {/* In-store fitment — separate section */}
              <div className="co-fitment-box">
                <Wrench size={16} />
                <div>
                  <p className="co-fitment-title">In-store Fitment Request</p>
                  <p className="co-fitment-desc">Want us to fit the parts for you? Book an appointment at our Clayton South workshop and we&apos;ll take care of the rest.</p>
                  <button
                    className="co-fitment-btn"
                    onClick={() => { setBookingOpen(true); setBookingLoaded(false); }}
                  >
                    Request Fitment Appointment
                  </button>
                </div>
              </div>

              {/* Booking iframe modal */}
              {bookingOpen && (
                <div className="co-booking-overlay" onClick={() => setBookingOpen(false)}>
                  <div className="co-booking-modal" onClick={e => e.stopPropagation()}>
                    <div className="co-booking-modal-header">
                      <span>Book a Fitment Appointment</span>
                      <button className="co-booking-close" onClick={() => setBookingOpen(false)} aria-label="Close">
                        <X size={18} />
                      </button>
                    </div>
                    {!bookingLoaded && (
                      <div className="co-booking-skeleton">
                        <div className="co-booking-spinner" />
                        <p>Loading booking form…</p>
                      </div>
                    )}
                    <iframe
                      src={BOOKING_URL}
                      title="Book a Fitment Appointment"
                      className={`co-booking-frame${bookingLoaded ? '' : ' co-booking-frame--hidden'}`}
                      allow="payment"
                      onLoad={() => setBookingLoaded(true)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="co-summary">
              <h2 className="co-summary-title">Order Summary</h2>

              <div className="co-summary-row">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <FreightEstimator items={items} />

              <div className="co-summary-total">
                <span>Estimated Total</span>
                <span className="co-total-amount">${subtotal.toFixed(2)}</span>
              </div>

              <p className="co-tax-note">Taxes and shipping calculated at checkout</p>

              <a href="/checkout/contact" className="co-checkout-btn">
                Proceed to Contact Details
              </a>

              <div className="co-trust-row">
                <span><ShieldCheck size={13} /> Secure Checkout</span>
                <span><Lock size={13} /> SSL Encrypted</span>
              </div>

              <button className="co-view-cart" onClick={openCart}>
                View Cart
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
