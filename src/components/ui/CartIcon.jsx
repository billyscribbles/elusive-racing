import { createPortal } from 'react-dom';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart, Money } from '@shopify/hydrogen-react';
import useCartStore from '../../store/cartStore';
import './CartIcon.css';

export default function CartIcon() {
  const { lines, cost, checkoutUrl, linesRemove, linesUpdate, status } = useCart();
  const { isOpen, openCart, closeCart } = useCartStore();

  const cartLines = lines ?? [];
  const itemCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const isLoading = status === 'fetching' || status === 'creating' || status === 'updating';

  function handleUpdateQty(lineId, newQty) {
    if (newQty < 1) {
      linesRemove([lineId]);
    } else {
      linesUpdate([{ id: lineId, quantity: newQty }]);
    }
  }

  return (
    <div className="cart-wrapper">
      <button className="cart-toggle" onClick={openCart} aria-label="View cart">
        {cost?.totalAmount && (
          <span className="cart-total">
            <Money data={cost.totalAmount} />
          </span>
        )}
        {!cost?.totalAmount && <span className="cart-total">$0.00</span>}
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
              {cartLines.length === 0 ? (
                <div className="cart-empty-state">
                  <ShoppingBag size={48} strokeWidth={1} className="cart-empty-icon" />
                  <p className="cart-empty">Your cart is empty.</p>
                  <button className="cart-continue" onClick={closeCart}>Continue Shopping</button>
                </div>
              ) : (
                <ul className="cart-items">
                  {cartLines.map((line) => {
                    const { merchandise } = line;
                    const image = merchandise.image ?? merchandise.product?.featuredImage;
                    const brand = merchandise.product?.vendor;
                    const name = merchandise.product?.title;
                    const variantTitle = merchandise.title !== 'Default Title' ? merchandise.title : null;

                    return (
                      <li key={line.id} className="cart-item">
                        <div className="cart-item-image-wrap">
                          {image
                            ? <img src={image.url} alt={image.altText ?? name} className="cart-item-image" />
                            : <div className="cart-item-no-image" />
                          }
                        </div>
                        <div className="cart-item-details">
                          {brand && <span className="cart-item-brand">{brand}</span>}
                          <p className="cart-item-name">{name}{variantTitle && ` — ${variantTitle}`}</p>
                          <div className="cart-item-bottom">
                            <div className="cart-qty">
                              <button onClick={() => handleUpdateQty(line.id, line.quantity - 1)} aria-label="Decrease" disabled={isLoading}>
                                <Minus size={12} />
                              </button>
                              <span>{line.quantity}</span>
                              <button onClick={() => handleUpdateQty(line.id, line.quantity + 1)} aria-label="Increase" disabled={isLoading}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="cart-item-price">
                              <Money data={line.cost.totalAmount} />
                            </span>
                            <button className="cart-item-remove" onClick={() => linesRemove([line.id])} aria-label="Remove item" disabled={isLoading}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {cartLines.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="cart-subtotal-row">
                  <span>Subtotal</span>
                  <span className="cart-subtotal-amount">
                    {cost?.totalAmount && <Money data={cost.totalAmount} />}
                  </span>
                </div>
                <p className="cart-shipping-note">Shipping &amp; taxes calculated at checkout</p>
                <a
                  href={checkoutUrl}
                  className="cart-checkout-btn"
                  onClick={closeCart}
                >
                  Proceed to Checkout
                </a>
                <button className="cart-clear" onClick={() => linesRemove(cartLines.map((l) => l.id))}>
                  Clear cart
                </button>
              </div>
            )}

          </div>
        </>,
        document.body
      )}
    </div>
  );
}
