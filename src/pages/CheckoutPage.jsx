import { useState } from 'react';
import { ShoppingBag, Trash2, Minus, Plus, ArrowLeft, Truck, Store, Wrench, Lock, ShieldCheck, CreditCard } from 'lucide-react';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import useCartStore from '../store/cartStore';
import './CheckoutPage.css';

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
                  <a
                    href="https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="co-fitment-btn"
                  >
                    Request Fitment Appointment
                  </a>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="co-summary">
              <h2 className="co-summary-title">Order Summary</h2>

              <div className="co-summary-row">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="co-summary-row co-summary-row--shipping">
                <span>Shipping</span>
                <span className="co-shipping-note">Calculated at checkout</span>
              </div>

              <div className="co-summary-total">
                <span>Estimated Total</span>
                <span className="co-total-amount">${subtotal.toFixed(2)}</span>
              </div>

              <p className="co-tax-note">Taxes and shipping calculated at checkout</p>

              <a href="/checkout/contact" className="co-checkout-btn">
                <Lock size={15} /> Proceed Safely to Checkout
              </a>

              <div className="co-trust-row">
                <span><ShieldCheck size={13} /> Secure Checkout</span>
                <span><CreditCard size={13} /> Afterpay Available</span>
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
