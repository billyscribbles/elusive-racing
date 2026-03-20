import { useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import './CartIcon.css';

export default function CartIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const [itemCount] = useState(0);
  const [total] = useState('$0.00');

  return (
    <div className="cart-wrapper">
      <button
        className="cart-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View cart"
      >
        <span className="cart-total">{total}</span>
        <ShoppingBag className="cart-bag-icon" size={22} strokeWidth={1.75} />
        {itemCount > 0 && (
          <span className="cart-count">{itemCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="cart-overlay" onClick={() => setIsOpen(false)} />
          <div className="cart-drawer">
            <div className="cart-drawer-header">
              <h3>Cart</h3>
              <button className="cart-drawer-close" onClick={() => setIsOpen(false)} aria-label="Close cart"><X size={18} /></button>
            </div>
            <div className="cart-drawer-body">
              <p className="cart-empty">No products in the cart.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
