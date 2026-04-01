import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { placeOrder } from '../lib/woocommerce';
import { ArrowLeft, Lock, ShieldCheck, Truck, Store, AlertCircle, CreditCard, Building2 } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './PaymentPage.css';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary:       '#d94040',
    colorBackground:    '#ffffff',
    colorText:          '#1a1a1a',
    colorDanger:        '#d94040',
    fontFamily:         'Open Sans, sans-serif',
    fontSizeBase:       '15px',
    borderRadius:       '5px',
    spacingUnit:        '4px',
  },
  rules: {
    '.Input': { border: '1px solid #e0e0e0', boxShadow: 'none', padding: '10px 12px' },
    '.Input:focus': { border: '1px solid #1a1a1a', boxShadow: 'none' },
    '.Label': { fontWeight: '600', fontSize: '13px', marginBottom: '6px' },
  },
};

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

function MiniOrderSummary({ shippingCost }) {
  const { items } = useCartStore();
  const { freight, fulfillment } = useCheckoutStore();
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const shipping  = fulfillment === 'collect' ? 0 : (freight?.price ?? null);
  const total     = subtotal + (shipping ?? 0);
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
        <span>{fulfillment === 'collect' ? 'Free' : shipping !== null ? `$${shipping.toFixed(2)}` : 'TBD'}</span>
      </div>
      {(fulfillment === 'collect' || shipping !== null) && (
        <div className="pp-order-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ── Stripe payment form (inside Elements provider) ────────────────────────────
function StripePaymentForm({ onSuccess }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { contact, shipping, fulfillment } = useCheckoutStore();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url:       `${window.location.origin}/order-confirmation`,
          payment_method_data: {
            billing_details: {
              name:  `${contact.firstName} ${contact.lastName}`,
              email: contact.email,
              phone: contact.phone || undefined,
            },
          },
        },
      });

      if (confirmError) {
        setError(confirmError.message);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await placeOrder({
          items, contact, shipping, fulfillment,
          paymentMethod: 'stripe_cc',
          paymentData:   [{ key: 'stripe_payment_method', value: paymentIntent.payment_method }],
        }).catch(() => {}); // best-effort — payment already taken
        onSuccess();
        navigate('/order-confirmation');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pp-stripe-form">
      <PaymentElement options={{ layout: 'accordion' }} />
      {error && (
        <div className="pp-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      <button type="submit" className="pp-checkout-btn" disabled={loading || !stripe}>
        <Lock size={15} /> {loading ? 'Processing…' : 'Complete Order'}
      </button>
    </form>
  );
}

// ── BACS form ─────────────────────────────────────────────────────────────────
function BacsForm({ onSuccess }) {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { contact, shipping, fulfillment } = useCheckoutStore();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await placeOrder({ items, contact, shipping, fulfillment, paymentMethod: 'bacs', paymentData: [] });
      onSuccess();
      navigate('/order-confirmation');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="pp-bank-details">
        <p className="pp-bank-note">
          Transfer the order total to our bank account. Your order will be confirmed once payment is received (1–2 business days).
        </p>
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
      {error && <div className="pp-error"><AlertCircle size={15} /> {error}</div>}
      <button type="submit" className="pp-checkout-btn" disabled={loading}>
        <Lock size={15} /> {loading ? 'Placing Order…' : 'Place Order'}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { items }    = useCartStore();
  const { contact, freight, fulfillment } = useCheckoutStore();
  const navigate     = useNavigate();

  const [method,       setMethod]       = useState('stripe'); // 'stripe' | 'bacs'
  const [clientSecret, setClientSecret] = useState(null);
  const [piError,      setPiError]      = useState(null);

  const subtotal     = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = fulfillment === 'collect' ? 0 : (freight?.price ?? 0);
  const totalCents   = Math.round((subtotal + shippingCost) * 100);

  // Create a PaymentIntent whenever the total is known and Stripe is configured
  useEffect(() => {
    if (method !== 'stripe') return;
    if (!stripePromise) {
      setPiError('Online payment is not configured. Please use Direct Bank Transfer or contact us.');
      return;
    }
    setPiError(null);
    setClientSecret(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 s timeout
    fetch('/api/create-payment-intent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountCents: totalCents }),
      signal:  controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setPiError(data.error || 'Could not initialise payment.');
      })
      .catch(err => {
        if (err.name !== 'AbortError') setPiError('Could not connect to payment service. Please try again.');
        else setPiError('Payment service timed out. Please try again.');
      })
      .finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [totalCents, method]);

  if (items.length === 0) {
    return (
      <div className="pp-page">
        <div className="container">
          <div className="pp-empty">
            <div className="pp-empty-icon">🛒</div>
            <h2 className="pp-empty-title">Your cart is empty</h2>
            <p className="pp-empty-text">Looks like you haven&apos;t added anything yet.</p>
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

  const elementsOptions = clientSecret
    ? { clientSecret, appearance: STRIPE_APPEARANCE }
    : null;

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

            <div className="pp-section">
              <h2 className="pp-section-title">Delivery Details</h2>
              <ShippingSummary />
            </div>

            <div className="pp-section">
              <h2 className="pp-section-title">Payment Method</h2>

              {/* Method tabs */}
              <div className="pp-method-tabs">
                <button
                  type="button"
                  className={`pp-method-tab${method === 'stripe' ? ' active' : ''}`}
                  onClick={() => setMethod('stripe')}
                >
                  <CreditCard size={15} /> Pay Online
                </button>
                <button
                  type="button"
                  className={`pp-method-tab${method === 'bacs' ? ' active' : ''}`}
                  onClick={() => setMethod('bacs')}
                >
                  <Building2 size={15} /> Direct Bank Transfer
                </button>
              </div>

              {/* Stripe — Payment Element (includes Link, Apple Pay, Google Pay) */}
              {method === 'stripe' && (
                piError ? (
                  <div className="pp-pi-error">
                    <AlertCircle size={15} /> {piError}
                  </div>
                ) : !elementsOptions ? (
                  <div className="pp-stripe-loading">
                    <div className="pp-stripe-spinner" />
                    <span>Loading payment form…</span>
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <StripePaymentForm onSuccess={() => {}} />
                  </Elements>
                )
              )}

              {/* Direct bank transfer */}
              {method === 'bacs' && <BacsForm onSuccess={() => {}} />}
            </div>

          </div>

          {/* Right: order summary */}
          <div className="pp-summary-col">
            <h2 className="pp-summary-heading">Order Summary</h2>
            <MiniOrderSummary />
            <div className="pp-trust">
              <span><ShieldCheck size={13} /> Secure Checkout</span>
              <span><Lock size={13} /> SSL Encrypted</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
