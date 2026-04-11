import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useCheckoutStore from '../store/checkoutStore';
import './OrderConfirmationPage.css';

export default function OrderConfirmationPage() {
  const { contact, fulfillment, resetCheckout } = useCheckoutStore();
  const { clearCart } = useCartStore();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="oc-page">
      <div className="container">
        <div className="oc-card">
          <div className="oc-icon">
            <CheckCircle size={56} />
          </div>
          <h1 className="oc-title">Thank You for Your Order!</h1>
          <p className="oc-subtitle">
            Your order has been placed successfully.
          </p>

          {contact.email && (
            <p className="oc-email">
              A confirmation email will be sent to <strong>{contact.email}</strong>
            </p>
          )}

          {fulfillment === 'collect' && (
            <div className="oc-collect-note">
              <ShoppingBag size={16} />
              <span>Pick up at: 1/32 Graham Rd, Clayton South VIC 3169</span>
            </div>
          )}

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
    </div>
  );
}
