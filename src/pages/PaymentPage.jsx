import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCheckoutUrl } from '../lib/woocommerce';
import { ArrowLeft, Lock, ShieldCheck, CreditCard, Truck, Store, Check } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './PaymentPage.css';

const PAYMENT_METHODS = [
  { id: 'card',     label: 'Credit / Debit Card',   badge: null },
  { id: 'afterpay', label: 'Afterpay',               badge: { text: 'Buy now, pay later', color: '#b2fcf0', textColor: '#016450' } },
  { id: 'zip',      label: 'Zip',                    badge: { text: 'Own it now, pay later', color: '#f0e6ff', textColor: '#6a0dad' } },
  { id: 'paypal',   label: 'PayPal',                 badge: null },
  { id: 'gpay',     label: 'Google Pay',             badge: null },
  { id: 'applepay', label: 'Apple Pay',              badge: null },
  { id: 'bank',     label: 'Direct Bank Transfer',   badge: { text: 'Manual payment', color: '#e8f4e8', textColor: '#2d6a2d' } },
];

function ShippingSummary() {
  const { contact, shipping, fulfillment } = useCheckoutStore();
  return (
    <div className="pp-shipping-summary">
      <div className="pp-shipping-row">
        <span className="pp-shipping-label">Contact</span>
        <span>{contact.firstName} {contact.lastName} &bull; {contact.email}</span>
      </div>
      <div className="pp-shipping-row">
        <span className="pp-shipping-label">
          {fulfillment === 'delivery' ? <><Truck size={13} /> Delivery</> : <><Store size={13} /> Click &amp; Collect</>}
        </span>
        <span>
          {fulfillment === 'delivery'
            ? [shipping.address1, shipping.city, shipping.state, shipping.postcode].filter(Boolean).join(', ') || '—'
            : '1/32 Graham Rd, Clayton South VIC 3169'
          }
        </span>
      </div>
      <a href="/checkout/contact" className="pp-shipping-edit">Edit</a>
    </div>
  );
}

function MiniOrderSummary() {
  const { items } = useCartStore();
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="pp-order">
      <ul className="pp-order-items">
        {items.map((item) => (
          <li key={item.id} className="pp-order-item">
            <div className="pp-order-img">
              {item.image ? <img src={item.image} alt={item.name} /> : <div className="pp-order-no-img" />}
              <span className="pp-order-qty">{item.quantity}</span>
            </div>
            <div className="pp-order-info">
              <span className="pp-order-brand">{item.brand}</span>
              <p className="pp-order-name">{item.name}</p>
            </div>
            <span className="pp-order-price">${(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="pp-order-divider" />
      <div className="pp-order-row">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="pp-order-row pp-order-row--muted">
        <span>Shipping</span>
        <span>Calculated at checkout</span>
      </div>
      <div className="pp-order-total">
        <span>Estimated Total</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { items } = useCartStore();
  const checkoutUrl = getCheckoutUrl();
  const navigate = useNavigate();
  const { contact } = useCheckoutStore();
  const [method, setMethod] = useState('card');

  if (items.length === 0) {
    return (
      <div className="pp-page">
        <div className="container">
          <p className="pp-empty">Your cart is empty. <a href="/shop">Continue shopping</a></p>
        </div>
      </div>
    );
  }

  // Guard: if contact info not filled, redirect back
  if (!contact.email) {
    navigate('/checkout/contact');
    return null;
  }

  return (
    <div className="pp-page">
      <div className="container">

        <div className="pp-header">
          <a href="/checkout/contact" className="pp-back"><ArrowLeft size={16} /> Back to Contact</a>
          <h1 className="pp-title">Payment</h1>
          <CheckoutSteps current={2} />
        </div>

        <div className="pp-layout">

          {/* Left col */}
          <div className="pp-left">

            {/* Shipping summary */}
            <div className="pp-section">
              <h2 className="pp-section-title">Delivery Details</h2>
              <ShippingSummary />
            </div>

            {/* Payment method */}
            <div className="pp-section">
              <h2 className="pp-section-title">Payment Method</h2>
              <div className="pp-method-list">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className={`pp-method${method === m.id ? ' active' : ''}`}>
                    <input type="radio" name="payment" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <div className="pp-method-radio">
                      {method === m.id && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="pp-method-label">{m.label}</span>
                    {m.badge && (
                      <span className="pp-method-badge" style={{ background: m.badge.color, color: m.badge.textColor }}>
                        {m.badge.text}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {method === 'card' && (
                <div className="pp-card-form">
                  <div className="pp-field">
                    <label className="pp-label">Card number</label>
                    <input className="pp-input" placeholder="1234 5678 9012 3456" maxLength={19} readOnly />
                  </div>
                  <div className="pp-row-2">
                    <div className="pp-field">
                      <label className="pp-label">Expiry</label>
                      <input className="pp-input" placeholder="MM / YY" maxLength={7} readOnly />
                    </div>
                    <div className="pp-field">
                      <label className="pp-label">CVV</label>
                      <input className="pp-input" placeholder="•••" maxLength={4} readOnly />
                    </div>
                  </div>
                  <div className="pp-field">
                    <label className="pp-label">Name on card</label>
                    <input className="pp-input" placeholder="As it appears on your card" readOnly />
                  </div>
                  <p className="pp-card-note">
                    <Lock size={12} /> Your payment details are entered securely on our checkout page.
                  </p>
                </div>
              )}

              {method === 'afterpay' && (
                <div className="pp-alt-note">
                  Pay in 4 interest-free fortnightly instalments with Afterpay. Available for orders between $1 and $2,000. No interest ever.
                </div>
              )}

              {method === 'zip' && (
                <div className="pp-alt-note">
                  Own it now, pay later with Zip. Split your purchase into flexible repayments. Available for orders up to $1,000.
                </div>
              )}

              {method === 'paypal' && (
                <div className="pp-alt-note">
                  You&apos;ll be redirected to PayPal to complete your payment securely.
                </div>
              )}

              {method === 'gpay' && (
                <div className="pp-alt-note">
                  Pay quickly and securely with Google Pay using your saved cards. You&apos;ll be redirected to complete payment.
                </div>
              )}

              {method === 'applepay' && (
                <div className="pp-alt-note">
                  Pay with Touch ID or Face ID using Apple Pay. Available on Safari and Apple devices.
                </div>
              )}

              {method === 'bank' && (
                <div className="pp-bank-details">
                  <p className="pp-bank-note">Transfer the order total directly to our bank account. Your order will be processed once payment is confirmed (1–2 business days).</p>
                  <div className="pp-bank-fields">
                    <div className="pp-bank-row">
                      <span className="pp-bank-key">Bank</span>
                      <span className="pp-bank-val">Commonwealth Bank of Australia</span>
                    </div>
                    <div className="pp-bank-row">
                      <span className="pp-bank-key">Account Name</span>
                      <span className="pp-bank-val">Elusive Racing Pty Ltd</span>
                    </div>
                    <div className="pp-bank-row">
                      <span className="pp-bank-key">BSB</span>
                      <span className="pp-bank-val">063-000</span>
                    </div>
                    <div className="pp-bank-row">
                      <span className="pp-bank-key">Account No.</span>
                      <span className="pp-bank-val">1234 5678</span>
                    </div>
                    <div className="pp-bank-row">
                      <span className="pp-bank-key">Reference</span>
                      <span className="pp-bank-val">Your order number (provided after placing order)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right: order summary + CTA */}
          <div className="pp-summary-col">
            <h2 className="pp-summary-heading">Order Summary</h2>
            <MiniOrderSummary />

            <div className="pp-cta">
              <a href={checkoutUrl} className="pp-checkout-btn">
                <Lock size={15} /> Complete Order
              </a>

              <div className="pp-trust">
                <span><ShieldCheck size={13} /> Secure Checkout</span>
                <span><Lock size={13} /> SSL Encrypted</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
