import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Truck, Store } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './ContactPage.css';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

function MiniOrderSummary() {
  const { items } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
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
        <span>Calculated next</span>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const navigate = useNavigate();
  const { contact, shipping, fulfillment, setContact, setShipping, setFulfillment } = useCheckoutStore();
  const { items } = useCartStore();

  const [errors, setErrors] = useState({});

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

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
              </div>
            )}

            <button type="submit" className="cp-continue">
              Continue to Payment <ArrowRight size={16} />
            </button>
          </div>

          {/* Right: mini order summary */}
          <div className="cp-summary-col">
            <h2 className="cp-summary-heading">Your Order</h2>
            <MiniOrderSummary />
          </div>

        </form>
      </div>
    </div>
  );
}
