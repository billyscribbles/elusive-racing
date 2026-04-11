import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight, Download, CreditCard, Building2, MapPin, Phone, Mail } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import useOrderStore from '../store/orderStore';
import { generateReceiptPdf } from '../lib/generateReceiptPdf';
import './OrderConfirmationPage.css';

function formatAddress(addr) {
  if (!addr) return '';
  const parts = [addr.address1, addr.address2, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean);
  return parts.join(', ');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

export default function OrderConfirmationPage() {
  const { clearCart } = useCartStore();
  const { resetCheckout } = useCheckoutStore();
  const { order } = useOrderStore();

  useEffect(() => {
    clearCart();
    resetCheckout();
  }, []);

  if (!order) {
    return (
      <div className="oc-page">
        <div className="container">
          <div className="oc-card oc-card--empty">
            <h1 className="oc-title">No Order Found</h1>
            <p className="oc-subtitle">It looks like you haven't placed an order yet.</p>
            <div className="oc-actions">
              <Link to="/shop" className="oc-btn oc-btn--primary">
                Go to Shop <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { customer, shippingAddress, fulfillment, items, subtotal, shippingCost, shippingLabel, total, paymentMethod, paymentMethodLabel, orderId, orderDate } = order;

  return (
    <div className="oc-page">
      <div className="container">
        {/* Success header */}
        <div className="oc-success">
          <CheckCircle size={48} className="oc-success-icon" />
          <h1 className="oc-title">Order Confirmed</h1>
          <p className="oc-subtitle">Thank you for your order! A confirmation email will be sent to <strong>{customer.email}</strong></p>
        </div>

        {/* Receipt card */}
        <div className="oc-receipt">
          {/* Business header */}
          <div className="oc-receipt-biz">
            <h2 className="oc-receipt-biz-name">Elusive Racing</h2>
            <p>1/32 Graham Rd, Clayton South VIC 3169</p>
            <p>Phone: (03) 9574 1710</p>
          </div>

          <div className="oc-receipt-divider" />

          {/* Order meta */}
          <div className="oc-receipt-meta">
            <div className="oc-receipt-meta-item">
              <span className="oc-label">Order Number</span>
              <span className="oc-value">#{orderId}</span>
            </div>
            <div className="oc-receipt-meta-item">
              <span className="oc-label">Date</span>
              <span className="oc-value">{formatDate(orderDate)}</span>
            </div>
            <div className="oc-receipt-meta-item">
              <span className="oc-label">Payment</span>
              <span className="oc-value oc-payment-badge">
                {paymentMethod === 'stripe_cc' ? <CreditCard size={14} /> : <Building2 size={14} />}
                {paymentMethodLabel}
              </span>
            </div>
          </div>

          <div className="oc-receipt-divider" />

          {/* Customer + Delivery */}
          <div className="oc-receipt-details">
            <div className="oc-receipt-detail-col">
              <h3 className="oc-receipt-section-title">Customer</h3>
              <p className="oc-detail-line"><strong>{customer.firstName} {customer.lastName}</strong></p>
              <p className="oc-detail-line"><Mail size={13} /> {customer.email}</p>
              {customer.phone && <p className="oc-detail-line"><Phone size={13} /> {customer.phone}</p>}
            </div>
            <div className="oc-receipt-detail-col">
              <h3 className="oc-receipt-section-title">
                {fulfillment === 'collect' ? 'Click & Collect' : 'Delivery Address'}
              </h3>
              {fulfillment === 'collect' ? (
                <div className="oc-collect-badge">
                  <ShoppingBag size={14} />
                  <span>Pick up at: 1/32 Graham Rd, Clayton South VIC 3169</span>
                </div>
              ) : (
                <p className="oc-detail-line"><MapPin size={13} /> {formatAddress(shippingAddress)}</p>
              )}
            </div>
          </div>

          <div className="oc-receipt-divider" />

          {/* Line items */}
          <table className="oc-items-table">
            <thead>
              <tr>
                <th className="oc-th-item">Item</th>
                <th className="oc-th-qty">Qty</th>
                <th className="oc-th-price">Price</th>
                <th className="oc-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="oc-td-item">
                    {item.brand && <span className="oc-item-brand">{item.brand}</span>}
                    <span className="oc-item-name">{item.name}</span>
                  </td>
                  <td className="oc-td-qty">{item.quantity}</td>
                  <td className="oc-td-price">${item.price.toFixed(2)}</td>
                  <td className="oc-td-total">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="oc-totals">
            <div className="oc-totals-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="oc-totals-row">
              <span>{shippingLabel}</span>
              <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
            </div>
            <div className="oc-totals-row oc-totals-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {paymentMethod === 'bacs' && (
            <div className="oc-bacs-note">
              <p>Please transfer <strong>${total.toFixed(2)} AUD</strong> to:</p>
              <p><strong>Commonwealth Bank of Australia</strong></p>
              <p>Account Name: Elusive Racing Pty Ltd &middot; BSB: 063-000 &middot; Account: 1234 5678</p>
              <p>Reference: <strong>#{orderId}</strong></p>
            </div>
          )}

          {/* Download PDF */}
          <button className="oc-pdf-btn" onClick={() => generateReceiptPdf(order)}>
            <Download size={16} /> Download PDF Receipt
          </button>
        </div>

        {/* Actions */}
        <div className="oc-actions">
          <Link to="/shop" className="oc-btn oc-btn--primary">
            Continue Shopping <ArrowRight size={16} />
          </Link>
          <Link to="/" className="oc-btn oc-btn--secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
