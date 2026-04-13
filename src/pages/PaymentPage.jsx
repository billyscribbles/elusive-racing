import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { placeOrder, syncProductsToSearch, checkStock } from '../lib/woocommerce';
import { ArrowLeft, Lock, ShieldCheck, Truck, Store, AlertCircle, CreditCard, Building2 } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import useOrderStore from '../store/orderStore';
import { formatPrice } from '../lib/formatPrice';
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
            <span className="pp-order-price">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="pp-order-divider" />
      <div className="pp-order-row">
        <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="pp-order-row pp-order-row--muted">
        <span>Shipping</span>
        <span>{fulfillment === 'collect' ? 'Free' : shipping !== null ? formatPrice(shipping) : 'TBD'}</span>
      </div>
      {(fulfillment === 'collect' || shipping !== null) && (
        <div className="pp-order-total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── Build order snapshot for confirmation page ───────────────────────────────
function buildOrderSnapshot({ wcResponse, items, contact, shipping, fulfillment, freight, paymentMethod, paymentIntentId = null, needsReconcile = false }) {
  const subtotal     = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = fulfillment === 'collect' ? 0 : (freight?.price ?? 0);
  return {
    orderId:            wcResponse?.order_id ?? wcResponse?.id ?? (paymentIntentId ? `PI-${paymentIntentId.slice(-10)}` : `ER-${Date.now()}`),
    orderDate:          new Date().toISOString(),
    customer:           { ...contact },
    shippingAddress:    fulfillment === 'collect'
      ? { address1: '1/32 Graham Rd', city: 'Clayton South', state: 'VIC', postcode: '3169', country: 'Australia' }
      : { ...shipping },
    fulfillment,
    items:              items.map(i => ({ name: i.name, brand: i.brand, quantity: i.quantity, price: i.price, image: i.image })),
    subtotal,
    shippingCost,
    shippingLabel:      fulfillment === 'collect' ? 'Click & Collect' : (freight?.label ?? 'Shipping'),
    total:              subtotal + shippingCost,
    paymentMethod,
    paymentMethodLabel: paymentMethod === 'stripe_cc' ? 'Credit Card (Stripe)' : 'Direct Bank Transfer',
    paymentIntentId,
    needsReconcile,
  };
}

// Retry wrapper: Stripe has already taken payment — we must NOT silently drop the WC order.
async function placeOrderWithRetry(payload, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return { wcResponse: await placeOrder(payload), error: null };
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
  }
  return { wcResponse: null, error: lastError };
}

// ── Stripe payment form (inside Elements provider) ────────────────────────────
function StripePaymentForm({ onSuccess }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { contact, shipping, fulfillment, freight } = useCheckoutStore();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // belt-and-braces: prevent double submission
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);
    try {
      // Re-check live stock before taking payment. Between add-to-cart and now,
      // stock may have depleted. Fail open on network/server errors (see checkStock).
      const stockResult = await checkStock(items);
      if (!stockResult.ok && stockResult.issues?.length) {
        const lines = stockResult.issues.map((i) => {
          if (i.reason === 'out_of_stock') return `• ${i.name}: out of stock`;
          if (i.reason === 'insufficient_stock') return `• ${i.name}: only ${i.available} in stock (you have ${i.requested})`;
          if (i.reason === 'not_found') return `• ${i.name}: no longer available`;
          return `• ${i.name}: unavailable`;
        }).join('\n');
        setError(`Some items in your cart are no longer available:\n${lines}\n\nPlease adjust your cart and try again.`);
        setLoading(false);
        return;
      }

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
        // Payment is taken. From here we must NOT surface an error to the user that
        // makes them think payment failed — but we do flag orphan orders internally
        // so the confirmation page can tell them support will follow up.
        const { wcResponse, error: orderError } = await placeOrderWithRetry({
          items, contact, shipping, fulfillment,
          paymentMethod: 'stripe_cc',
          paymentData: [
            { key: 'stripe_payment_method', value: paymentIntent.payment_method },
            { key: 'stripe_payment_intent', value: paymentIntent.id },
          ],
        });
        if (orderError && !wcResponse) {
          // eslint-disable-next-line no-console
          console.error('[orphan-order] Stripe succeeded but WC placeOrder failed after retries', {
            paymentIntentId: paymentIntent.id,
            amountCents: paymentIntent.amount,
            customerEmail: contact.email,
            error: orderError?.message || String(orderError),
          });
        }
        syncProductsToSearch(items.map(i => parseInt(i.id, 10)));
        useOrderStore.getState().setOrder(
          buildOrderSnapshot({
            wcResponse, items, contact, shipping, fulfillment, freight,
            paymentMethod: 'stripe_cc',
            paymentIntentId: paymentIntent.id,
            needsReconcile: !wcResponse,
          })
        );
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
  const { contact, shipping, fulfillment, freight } = useCheckoutStore();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // belt-and-braces: prevent double submission
    setError(null);
    setLoading(true);
    try {
      const wcResponse = await placeOrder({ items, contact, shipping, fulfillment, paymentMethod: 'bacs', paymentData: [] });
      syncProductsToSearch(items.map(i => parseInt(i.id, 10)));
      useOrderStore.getState().setOrder(
        buildOrderSnapshot({ wcResponse, items, contact, shipping, fulfillment, freight, paymentMethod: 'bacs' })
      );
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
      setPiError('Payment unavailable. Please try again or use Direct Bank Transfer.');
      return;
    }
    if (totalCents <= 0) return;           // wait for cart to hydrate
    setPiError(null);
    setClientSecret(null);
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 s timeout
    fetch('/api/create-payment-intent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountCents: totalCents }),
      signal:  controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setPiError('Payment unavailable. Please try again or use Direct Bank Transfer.');
      })
      .catch(err => {
        if (cancelled) return;             // ignore aborted fetches
        console.error('PaymentIntent fetch failed:', err);
        setPiError('Payment unavailable. Please try again or use Direct Bank Transfer.');
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
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
