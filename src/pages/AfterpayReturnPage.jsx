import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { captureAfterpayPayment, syncProductsToSearch } from '../lib/woocommerce';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import useOrderStore from '../store/orderStore';
import './PaymentPage.css';

// Mirror of PaymentPage's buildOrderSnapshot, kept local so the capture path
// can own it and we don't export that helper out of the component module.
function buildOrderSnapshot({ items, contact, shipping, fulfillment, freight, paymentId, wcOrderId }) {
  const subtotal     = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = fulfillment === 'collect' ? 0 : (freight?.price ?? 0);
  return {
    orderId:         wcOrderId || (paymentId ? `AP-${String(paymentId).slice(-10)}` : `ER-${Date.now()}`),
    orderDate:       new Date().toISOString(),
    customer:        { ...contact },
    shippingAddress: fulfillment === 'collect'
      ? { address1: '1/32 Graham Rd', city: 'Clayton South', state: 'VIC', postcode: '3169', country: 'Australia' }
      : { ...shipping },
    fulfillment,
    items:           items.map(i => ({ name: i.name, brand: i.brand, quantity: i.quantity, price: i.price, image: i.image })),
    subtotal,
    shippingCost,
    shippingLabel:   fulfillment === 'collect' ? 'Click & Collect' : (freight?.label ?? 'Shipping'),
    total:           subtotal + shippingCost,
    paymentMethod:   'afterpay',
    paymentMethodLabel: 'Afterpay',
    paymentIntentId: paymentId,
    needsReconcile:  !wcOrderId,
  };
}

export default function AfterpayReturnPage() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { items } = useCartStore();
  const { contact, shipping, fulfillment, freight, afterpayOrderToken, setAfterpayOrderToken } = useCheckoutStore();

  const [phase,  setPhase]  = useState('working'); // 'working' | 'cancelled' | 'error' | 'orphan'
  const [error,  setError]  = useState(null);
  const [orphan, setOrphan] = useState(null);
  const fired = useRef(false); // guard against React 18 double-invoke in strict mode

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const status = params.get('status');
    const urlToken = params.get('orderToken');
    const token = urlToken || afterpayOrderToken;

    if (status !== 'SUCCESS') {
      setPhase('cancelled');
      return;
    }
    if (!token) {
      setPhase('error');
      setError('Your Afterpay session could not be resumed. Please start checkout again.');
      return;
    }
    if (!items?.length) {
      setPhase('error');
      setError('Your cart is empty — we can’t finalise this order. If you were just redirected from Afterpay, please contact us.');
      return;
    }

    (async () => {
      try {
        const { wcOrderId, paymentId } = await captureAfterpayPayment({
          orderToken: token, items, contact, shipping, fulfillment, freight,
        });
        syncProductsToSearch(items.map(i => parseInt(i.id, 10)));
        useOrderStore.getState().setOrder(
          buildOrderSnapshot({ items, contact, shipping, fulfillment, freight, paymentId, wcOrderId })
        );
        setAfterpayOrderToken(null);
        navigate('/order-confirmation', { replace: true });
      } catch (err) {
        if (err?.paymentId) {
          setOrphan({ paymentId: err.paymentId });
          setPhase('orphan');
        } else {
          setError(err?.message || 'We couldn’t finalise your Afterpay order. Please try again.');
          setPhase('error');
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'working') {
    return (
      <div className="pp-page">
        <div className="container" style={{ padding: '64px 16px', textAlign: 'center' }}>
          <Loader2 size={36} className="pp-stripe-spinner" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: 22, fontWeight: 700 }}>Finalising your order…</h1>
          <p style={{ color: 'var(--color-mid)', marginTop: 8 }}>
            Don’t close this window. We’re confirming your Afterpay payment.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'cancelled') {
    return (
      <div className="pp-page">
        <div className="container" style={{ padding: '64px 16px', textAlign: 'center', maxWidth: 560 }}>
          <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: 22, fontWeight: 700 }}>Afterpay payment cancelled</h1>
          <p style={{ color: 'var(--color-mid)', marginTop: 8 }}>
            No problem — your cart is still waiting. You can try again with Afterpay, or use a different payment method.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link to="/checkout/payment" className="pp-checkout-btn" style={{ display: 'inline-flex', width: 'auto' }}>
              Back to payment <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'orphan') {
    return (
      <div className="pp-page">
        <div className="container" style={{ padding: '64px 16px', textAlign: 'center', maxWidth: 560 }}>
          <AlertCircle size={36} style={{ color: 'var(--color-red)', margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: 22, fontWeight: 700 }}>Payment received — order pending</h1>
          <p style={{ color: 'var(--color-mid)', marginTop: 8 }}>
            Your Afterpay payment was successful, but we couldn’t finalise the order on our side. Our team will reach out shortly.
            Please contact us and quote this reference:
          </p>
          <p style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 15 }}>{orphan?.paymentId}</p>
          <div style={{ marginTop: 20 }}>
            <Link to="/contact" className="pp-checkout-btn" style={{ display: 'inline-flex', width: 'auto' }}>
              Contact us <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // phase === 'error'
  return (
    <div className="pp-page">
      <div className="container" style={{ padding: '64px 16px', textAlign: 'center', maxWidth: 560 }}>
        <AlertCircle size={36} style={{ color: 'var(--color-red)', margin: '0 auto 12px', display: 'block' }} />
        <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: 22, fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: 'var(--color-mid)', marginTop: 8, whiteSpace: 'pre-line' }}>{error}</p>
        <div style={{ marginTop: 20 }}>
          <Link to="/checkout/payment" className="pp-checkout-btn" style={{ display: 'inline-flex', width: 'auto' }}>
            Back to payment <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
