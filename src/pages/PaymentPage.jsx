import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { placeOrder } from '../lib/woocommerce';
import { ArrowLeft, Lock, ShieldCheck, Truck, Store, Check, AlertCircle } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './PaymentPage.css';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const PAYMENT_METHODS = [
  { id: 'stripe_cc', label: 'Credit / Debit Card',  available: true  },
  { id: 'bacs',      label: 'Direct Bank Transfer', available: true  },
  { id: 'afterpay',  label: 'Afterpay',             available: false },
  { id: 'zipmoney',  label: 'Zip',                  available: false },
  { id: 'ppcp',      label: 'PayPal',               available: false },
  { id: 'gpay',      label: 'Google Pay',           available: false },
  { id: 'applepay',  label: 'Apple Pay',            available: false },
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
            : '1/32 Graham Rd, Clayton South VIC 3169'}
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

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1a1a1a',
      fontFamily: 'Open Sans, sans-serif',
      '::placeholder': { color: '#aaa' },
    },
    invalid: { color: '#d94040' },
  },
};

function PaymentForm() {
  const stripe     = useStripe();
  const elements   = useElements();
  const navigate   = useNavigate();
  const { items }  = useCartStore();
  const { contact, shipping, fulfillment } = useCheckoutStore();

  const [method,  setMethod]  = useState('stripe_cc');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (method === 'stripe_cc') {
        if (!stripe || !elements) {
          setError('Stripe is not configured yet. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env file.');
          setLoading(false);
          return;
        }
        const cardElement = elements.getElement(CardElement);
        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name:  `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone || undefined,
          },
        });
        if (stripeError) {
          setError(stripeError.message);
          setLoading(false);
          return;
        }
        await placeOrder({
          items, contact, shipping, fulfillment,
          paymentMethod: 'stripe_cc',
          paymentData:   [{ key: 'stripe_payment_method', value: paymentMethod.id }],
        });
      } else if (method === 'bacs') {
        await placeOrder({
          items, contact, shipping, fulfillment,
          paymentMethod: 'bacs',
          paymentData:   [],
        });
      }

      setSuccess(true);
      navigate('/order-confirmation');
    } catch (err) {
      setError(err.message || 'Something went wrong placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="pp-layout">

        {/* Left col */}
        <div className="pp-left">

          <div className="pp-section">
            <h2 className="pp-section-title">Delivery Details</h2>
            <ShippingSummary />
          </div>

          <div className="pp-section">
            <h2 className="pp-section-title">Payment Method</h2>
            <div className="pp-method-list">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`pp-method${method === m.id ? ' active' : ''}${!m.available ? ' pp-method--disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => m.available && setMethod(m.id)}
                    disabled={!m.available}
                  />
                  <div className="pp-method-radio">
                    {method === m.id && m.available && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span className="pp-method-label">{m.label}</span>
                  {!m.available && (
                    <span className="pp-method-badge pp-method-badge--unavailable">Coming soon</span>
                  )}
                </label>
              ))}
            </div>

            {method === 'stripe_cc' && (
              <div className="pp-card-form">
                {stripePromise ? (
                  <div className="pp-field">
                    <label className="pp-label">Card details</label>
                    <div className="pp-card-element-wrap">
                      <CardElement options={CARD_ELEMENT_OPTIONS} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pp-field">
                      <label className="pp-label">Card number</label>
                      <input className="pp-input" placeholder="1234 5678 9012 3456" disabled />
                    </div>
                    <div className="pp-row-2">
                      <div className="pp-field">
                        <label className="pp-label">Expiry</label>
                        <input className="pp-input" placeholder="MM / YY" disabled />
                      </div>
                      <div className="pp-field">
                        <label className="pp-label">CVV</label>
                        <input className="pp-input" placeholder="•••" disabled />
                      </div>
                    </div>
                    <div className="pp-field">
                      <label className="pp-label">Name on card</label>
                      <input className="pp-input" placeholder="As it appears on your card" disabled />
                    </div>
                  </>
                )}
                <p className="pp-card-note">
                  <Lock size={12} /> Your card details are encrypted and processed securely by Stripe.
                </p>
              </div>
            )}

            {method === 'bacs' && (
              <div className="pp-bank-details">
                <p className="pp-bank-note">Transfer the order total to our bank account. Your order will be confirmed once payment is received (1–2 business days).</p>
                <div className="pp-bank-fields">
                  {[
                    ['Bank',         'Commonwealth Bank of Australia'],
                    ['Account Name', 'Elusive Racing Pty Ltd'],
                    ['BSB',          '063-000'],
                    ['Account No.',  '1234 5678'],
                    ['Reference',    'Your order number (provided after placing order)'],
                  ].map(([k, v]) => (
                    <div key={k} className="pp-bank-row">
                      <span className="pp-bank-key">{k}</span>
                      <span className="pp-bank-val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="pp-error">
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>

        </div>

        {/* Right: order summary + CTA */}
        <div className="pp-summary-col">
          <h2 className="pp-summary-heading">Order Summary</h2>
          <MiniOrderSummary />
          <div className="pp-cta">
            <button type="submit" className="pp-checkout-btn" disabled={loading || success}>
              <Lock size={15} /> {loading ? 'Processing…' : 'Complete Order'}
            </button>
            <div className="pp-trust">
              <span><ShieldCheck size={13} /> Secure Checkout</span>
              <span><Lock size={13} /> SSL Encrypted</span>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}

export default function PaymentPage() {
  const { items }   = useCartStore();
  const navigate    = useNavigate();
  const { contact } = useCheckoutStore();

  if (items.length === 0) {
    return (
      <div className="pp-page">
        <div className="container">
          <div className="pp-empty">
            <div className="pp-empty-icon">🛒</div>
            <h2 className="pp-empty-title">Your cart is empty</h2>
            <p className="pp-empty-text">Looks like you haven't added anything yet.</p>
            <a href="/shop" className="pp-empty-btn">Continue Shopping</a>
          </div>
        </div>
      </div>
    );
  }

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

        <Elements stripe={stripePromise}>
          <PaymentForm />
        </Elements>
      </div>
    </div>
  );
}
