import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import { formatPrice } from '../../lib/formatPrice';
import './CartIcon.css';

export default function CartIcon() {
  const { items, isOpen, openCart, closeCart, removeItem, updateQuantity, clearCart } = useCartStore();
  const [confirmingClear, setConfirmingClear] = useState(false);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal  = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="cart-wrapper">
      <button className="cart-toggle" onClick={openCart} aria-label="View cart">
        <span className="cart-total" aria-hidden="true">{formatPrice(subtotal)}</span>
        <ShoppingBag className="cart-bag-icon" size={22} strokeWidth={1.75} />
        {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
      </button>

      {isOpen && createPortal(
        <>
          <div className="cart-overlay" onClick={closeCart} />
          <div className="cart-drawer">

            {/* Header */}
            <div className="cart-drawer-header">
              <h3>Cart {itemCount > 0 && <span className="cart-header-count">({itemCount})</span>}</h3>
              <button className="cart-drawer-close" onClick={closeCart} aria-label="Close cart">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="cart-drawer-body">
              {items.length === 0 ? (
                <div className="cart-empty-state">
                  <ShoppingBag size={48} strokeWidth={1} className="cart-empty-icon" />
                  <p className="cart-empty">Your cart is empty.</p>
                  <button className="cart-continue" onClick={closeCart}>Continue Shopping</button>
                </div>
              ) : (
                <ul className="cart-items">
                  {items.map((item) => (
                    <li key={`${item.id}-${item.variantId ?? 'base'}`} className="cart-item">
                      <div className="cart-item-image-wrap">
                        {item.image
                          ? <img src={item.image} alt={item.name} className="cart-item-image" />
                          : <div className="cart-item-no-image" />
                        }
                      </div>
                      <div className="cart-item-details">
                        <span className="cart-item-brand">{item.brand}</span>
                        <p className="cart-item-name">{item.name}</p>
                        <div className="cart-item-bottom">
                          <div className="cart-qty">
                            <button onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)} aria-label="Decrease">
                              <Minus size={12} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                              aria-label="Increase"
                              disabled={item.stockQuantity !== null && item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="cart-item-price">{formatPrice(item.price * item.quantity)}</span>
                          <button className="cart-item-remove" onClick={() => removeItem(item.id, item.variantId)} aria-label="Remove item">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="cart-subtotal-row">
                  <span>Subtotal</span>
                  <span className="cart-subtotal-amount">{formatPrice(subtotal)}</span>
                </div>
                <p className="cart-shipping-note">Shipping &amp; taxes calculated at checkout</p>
                <Link to="/checkout" className="cart-checkout-btn" onClick={closeCart}>
                  Proceed to Checkout
                </Link>
                <button className="cart-clear" onClick={() => setConfirmingClear(true)}>Clear cart</button>
              </div>
            )}

          </div>
        </>,
        document.body
      )}
      {confirmingClear && createPortal(
        <div className="clear-modal-overlay" onClick={() => setConfirmingClear(false)}>
          <div className="clear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clear-modal-icon">
              <Trash2 size={28} strokeWidth={1.5} />
            </div>
            <h4 className="clear-modal-title">Clear your cart?</h4>
            <p className="clear-modal-body">All items will be removed. This can't be undone.</p>
            <div className="clear-modal-actions">
              <button className="clear-modal-cancel" onClick={() => setConfirmingClear(false)}>Cancel</button>
              <button className="clear-modal-confirm" onClick={() => { clearCart(); setConfirmingClear(false); }}>Yes, clear cart</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
