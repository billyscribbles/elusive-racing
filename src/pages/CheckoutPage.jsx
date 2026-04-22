import { useState } from 'react';
import { ShoppingBag, Trash2, Minus, Plus, ArrowLeft, Wrench, Lock, ShieldCheck, X } from 'lucide-react';

const BOOKING_URL = 'https://www.mechanicdesk.com.au/online-booking/index.html?token=2b596cc338e4f3e969aab07b9cf924eb618076c9';
import CheckoutSteps from '../components/ui/CheckoutSteps';
import CheckoutExtras from '../components/checkout/CheckoutExtras';
import useCartStore from '../store/cartStore';
import { formatPrice } from '../lib/formatPrice';
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
            <button onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)} aria-label="Decrease quantity">
              <Minus size={12} />
            </button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)} aria-label="Increase quantity">
              <Plus size={12} />
            </button>
          </div>
          <span className="co-line-price">{formatPrice(item.price * item.quantity)}</span>
          <button className="co-line-remove" onClick={() => removeItem(item.id, item.variantId)} aria-label="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { items, clearCart, openCart } = useCartStore();
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
                  <CheckoutLineItem key={`${item.id}-${item.variantId ?? 'base'}`} item={item} />
                ))}
              </div>

              {/* In-store fitment */}
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

              <CheckoutExtras />

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
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="co-summary-total">
                <span>Estimated Total</span>
                <span className="co-total-amount">{formatPrice(subtotal)}</span>
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
