import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { placeOrder, capturePayPalOrder, createAfterpayCheckout, syncProductsToSearch, checkStock } from '../lib/woocommerce';
import { ArrowLeft, Lock, ShieldCheck, Truck, Store, AlertCircle, CreditCard, Building2, Wallet } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import AfterpayLogo from '../components/ui/AfterpayLogo';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import useOrderStore from '../store/orderStore';
import { formatPrice } from '../lib/formatPrice';
import bacsConfig from '../../data/bacs-config.json';
import afterpayConfig from '../../data/afterpay-config.json';
import './PaymentPage.css';

const PAYPAL_CLIENT_ID    = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const AFTERPAY_ENABLED    = import.meta.env.VITE_AFTERPAY_ENABLED === '1';

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
      <Link to="/checkout/contact" className="pp-shipping-edit">Edit</Link>
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
  const paymentMethodLabel =
    paymentMethod === 'stripe_cc' ? 'Credit Card (Stripe)' :
    paymentMethod === 'paypal'    ? 'PayPal' :
    paymentMethod === 'afterpay'  ? 'Afterpay' :
    'Direct Bank Transfer';
  return {
    orderId:            wcResponse?.order_id ?? wcResponse?.id ?? wcResponse?.wcOrderId ?? (paymentIntentId ? `PI-${paymentIntentId.slice(-10)}` : `ER-${Date.now()}`),
    orderDate:          new Date().toISOString(),
    customer:           { ...contact },
    shippingAddress:    fulfillment === 'collect'
      ? { address1: '1/32 Graham Rd', city: 'Clayton South', state: 'VIC', postcode: '3169', country: 'Australia' }
      : { ...shipping },
    fulfillment,
    items:              items.map(i => ({ name: i.name, brand: i.brand, quantity: i.quantity, price: i.price, image: i.image, stockStatus: i.stockStatus ?? null })),
    subtotal,
    shippingCost,
    shippingLabel:      fulfillment === 'collect' ? 'Click & Collect' : (freight?.label ?? 'Shipping'),
    total:              subtotal + shippingCost,
    paymentMethod,
    paymentMethodLabel,
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
          items, contact, shipping, fulfillment, freight,
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
      const wcResponse = await placeOrder({ items, contact, shipping, fulfillment, freight, paymentMethod: 'bacs', paymentData: [] });
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
            ['Bank',         bacsConfig.bank],
            ['Account Name', bacsConfig.accountName],
            ['BSB',          bacsConfig.bsb],
            ['Account No.',  bacsConfig.accountNumber],
            ['Reference',    bacsConfig.reference],
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

// ── PayPal form ───────────────────────────────────────────────────────────────
// Renders PayPal Smart Buttons. `createOrder` hits our server to create the
// PayPal order for the current cart total; `onApprove` asks the server to
// capture and to create the Woo order. We only ever send `totalCents` to
// /create-order — shipping + line items are authoritative server-side when we
// create the Woo order in /capture-order.
function PayPalForm({ totalCents }) {
  const navigate = useNavigate();
  const { items } = useCartStore();
  const { contact, shipping, fulfillment, freight } = useCheckoutStore();
  const [error, setError] = useState(null);
  const [busy,  setBusy]  = useState(false);

  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="pp-pi-error">
        <AlertCircle size={15} /> PayPal is not configured. Please try another payment method.
      </div>
    );
  }

  async function handleApprove(data) {
    setBusy(true);
    setError(null);
    try {
      // Pre-capture stock recheck happens server-side, but we also do a lightweight
      // one here to surface the error before the user hits "Approve". That check
      // already ran when the buttons were clicked, so we rely on the server now.
      const result = await capturePayPalOrder({
        paypalOrderId: data.orderID,
        items, contact, shipping, fulfillment, freight,
      });
      syncProductsToSearch(items.map(i => parseInt(i.id, 10)));
      useOrderStore.getState().setOrder(
        buildOrderSnapshot({
          wcResponse: { id: result.wcOrderId },
          items, contact, shipping, fulfillment, freight,
          paymentMethod: 'paypal',
          paymentIntentId: result.captureId,
          needsReconcile: false,
        })
      );
      navigate('/order-confirmation');
    } catch (err) {
      if (err?.status === 409 && err.issues?.length) {
        const lines = err.issues.map((i) => {
          if (i.reason === 'out_of_stock') return `• ${i.name}: out of stock`;
          if (i.reason === 'insufficient_stock') return `• ${i.name}: only ${i.available} in stock (you have ${i.requested})`;
          if (i.reason === 'not_found') return `• ${i.name}: no longer available`;
          return `• ${i.name}: unavailable`;
        }).join('\n');
        setError(`Some items in your cart are no longer available:\n${lines}\n\nPlease adjust your cart and try again.`);
      } else if (err?.captureId) {
        // Orphan: money captured, Woo order not created. Tell the user to contact support.
        setError(`Your payment was received but we couldn't finalise the order. Please contact us quoting reference ${err.captureId}.`);
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pp-paypal-wrap">
      <PayPalScriptProvider options={{ 'client-id': PAYPAL_CLIENT_ID, currency: 'AUD', intent: 'capture' }}>
        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
          disabled={busy || totalCents <= 0}
          createOrder={async () => {
            // Stock recheck before we even ask PayPal to open the popup.
            const stockResult = await checkStock(items);
            if (!stockResult.ok && stockResult.issues?.length) {
              const lines = stockResult.issues.map((i) => {
                if (i.reason === 'out_of_stock') return `• ${i.name}: out of stock`;
                if (i.reason === 'insufficient_stock') return `• ${i.name}: only ${i.available} in stock (you have ${i.requested})`;
                if (i.reason === 'not_found') return `• ${i.name}: no longer available`;
                return `• ${i.name}: unavailable`;
              }).join('\n');
              setError(`Some items in your cart are no longer available:\n${lines}\n\nPlease adjust your cart and try again.`);
              throw new Error('stock_changed');
            }
            const r = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amountCents: totalCents }),
            });
            const d = await r.json();
            if (!r.ok || !d.paypalOrderId) {
              setError(d?.error || 'Could not start PayPal payment.');
              throw new Error('create_order_failed');
            }
            return d.paypalOrderId;
          }}
          onApprove={handleApprove}
          onCancel={() => { /* user closed the popup — leave error null, let them retry */ }}
          onError={(err) => {
            console.error('[paypal] button error:', err);
            setError('PayPal could not complete your payment. Please try again.');
          }}
        />
      </PayPalScriptProvider>
      {error && <div className="pp-error"><AlertCircle size={15} /> {error}</div>}
    </div>
  );
}

// ── Afterpay form ─────────────────────────────────────────────────────────────
// Redirect flow: we call our server to create a hosted checkout, stash the
// token in persistent checkout state (so the return page can capture against
// it), then hard-redirect the browser to Afterpay. Afterpay bounces the user
// back to /checkout/afterpay-return where the capture + WC order creation
// happens. See AfterpayReturnPage.jsx for the other half.
function AfterpayForm({ totalCents }) {
  const { items } = useCartStore();
  const { contact, shipping, fulfillment, freight, setAfterpayOrderToken } = useCheckoutStore();
  const [error, setError] = useState(null);
  const [busy,  setBusy]  = useState(false);

  const minCents = afterpayConfig.minCents ?? 100;
  const maxCents = afterpayConfig.maxCents ?? 200000;
  const outOfRange = totalCents < minCents || totalCents > maxCents;

  async function handleClick() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      // Stock recheck before we even ask Afterpay to create the checkout.
      const stockResult = await checkStock(items);
      if (!stockResult.ok && stockResult.issues?.length) {
        const lines = stockResult.issues.map((i) => {
          if (i.reason === 'out_of_stock') return `• ${i.name}: out of stock`;
          if (i.reason === 'insufficient_stock') return `• ${i.name}: only ${i.available} in stock (you have ${i.requested})`;
          if (i.reason === 'not_found') return `• ${i.name}: no longer available`;
          return `• ${i.name}: unavailable`;
        }).join('\n');
        setError(`Some items in your cart are no longer available:\n${lines}\n\nPlease adjust your cart and try again.`);
        setBusy(false);
        return;
      }

      const { orderToken, redirectCheckoutUrl } = await createAfterpayCheckout({
        amountCents: totalCents,
        items, contact, shipping, fulfillment, freight,
      });
      if (!orderToken || !redirectCheckoutUrl) {
        setError('Could not start Afterpay payment. Please try another method.');
        setBusy(false);
        return;
      }
      setAfterpayOrderToken(orderToken);
      window.location.href = redirectCheckoutUrl;
    } catch (err) {
      if (err?.status === 409 && err.issues?.length) {
        const lines = err.issues.map((i) => {
          if (i.reason === 'out_of_stock') return `• ${i.name}: out of stock`;
          if (i.reason === 'insufficient_stock') return `• ${i.name}: only ${i.available} in stock (you have ${i.requested})`;
          if (i.reason === 'not_found') return `• ${i.name}: no longer available`;
          return `• ${i.name}: unavailable`;
        }).join('\n');
        setError(`Some items in your cart are no longer available:\n${lines}\n\nPlease adjust your cart and try again.`);
      } else {
        setError(err?.message || 'Could not start Afterpay payment. Please try another method.');
      }
      setBusy(false);
    }
  }

  return (
    <div className="pp-afterpay-wrap">
      <p className="pp-afterpay-blurb">
        Buy now, pay in 4 interest-free instalments. You'll be redirected to Afterpay to complete your order.
      </p>
      {outOfRange && (
        <div className="pp-error">
          <AlertCircle size={15} /> Afterpay is available for orders between {formatPrice(minCents / 100)} and {formatPrice(maxCents / 100)}.
        </div>
      )}
      <button
        type="button"
        className="pp-afterpay-btn"
        onClick={handleClick}
        disabled={busy || outOfRange || totalCents <= 0}
      >
        <AfterpayLogo width={56} height={26} />
        <span>{busy ? 'Redirecting…' : 'Pay with Afterpay'}</span>
      </button>
      {error && <div className="pp-error"><AlertCircle size={15} /> {error}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { items }    = useCartStore();
  const { contact, freight, fulfillment } = useCheckoutStore();
  const navigate     = useNavigate();

  const [method,       setMethod]       = useState('stripe'); // 'stripe' | 'bacs' | 'paypal' | 'afterpay'
  const [clientSecret, setClientSecret] = useState(null);
  const [piError,      setPiError]      = useState(null);

  const subtotal     = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = fulfillment === 'collect' ? 0 : (freight?.price ?? 0);
  const totalCents   = Math.round((subtotal + shippingCost) * 100);

  // Stable idempotency key for THIS amount+method tuple. Re-rendering the
  // effect (StrictMode double-mount, React 18 transitions, transient state
  // flips) reuses the same key so Stripe returns the same PaymentIntent
  // instead of creating duplicates. When totalCents or method change, a new
  // key is generated — that's a different attempt and deserves a new PI.
  const stripeIdempotencyKey = useMemo(() => {
    if (method !== 'stripe' || totalCents <= 0) return null;
    return (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }, [totalCents, method]);

  // Create a PaymentIntent whenever the total is known and Stripe is configured
  useEffect(() => {
    if (method !== 'stripe') return;
    if (!stripePromise) {
      setPiError('Payment unavailable. Please try again or use Direct Bank Transfer.');
      return;
    }
    if (totalCents <= 0) return;           // wait for cart to hydrate
    if (!stripeIdempotencyKey) return;
    setPiError(null);
    setClientSecret(null);
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 s timeout
    fetch('/api/create-payment-intent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountCents: totalCents, idempotencyKey: stripeIdempotencyKey }),
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
  }, [totalCents, method, stripeIdempotencyKey]);

  if (items.length === 0) {
    return (
      <div className="pp-page">
        <div className="container">
          <div className="pp-empty">
            <div className="pp-empty-icon">🛒</div>
            <h2 className="pp-empty-title">Your cart is empty</h2>
            <p className="pp-empty-text">Looks like you haven&apos;t added anything yet.</p>
            <Link to="/shop" className="pp-empty-btn">Continue Shopping</Link>
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
          <Link to="/checkout/contact" className="pp-back"><ArrowLeft size={16} /> Back to Contact</Link>
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
                  className={`pp-method-tab${method === 'paypal' ? ' active' : ''}`}
                  onClick={() => setMethod('paypal')}
                >
                  <Wallet size={15} /> PayPal
                </button>
                {AFTERPAY_ENABLED && (
                  <button
                    type="button"
                    className={`pp-method-tab${method === 'afterpay' ? ' active' : ''}`}
                    onClick={() => setMethod('afterpay')}
                  >
                    <AfterpayLogo width={40} height={20} /> Afterpay
                  </button>
                )}
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

              {/* PayPal — Smart Buttons (server-side create + capture) */}
              {method === 'paypal' && <PayPalForm totalCents={totalCents} />}

              {/* Afterpay — redirect flow (browser leaves, returns to /checkout/afterpay-return) */}
              {method === 'afterpay' && AFTERPAY_ENABLED && <AfterpayForm totalCents={totalCents} />}

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
