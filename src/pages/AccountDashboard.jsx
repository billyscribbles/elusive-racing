import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, MapPin, LogOut, ChevronDown, ChevronRight, User, Phone, Calendar, CreditCard, Truck, ShoppingBag } from 'lucide-react';
import useAuthStore from '../store/authStore';
import './AccountPage.css';

const STATUS_LABEL = {
  pending:    'Pending',
  processing: 'Processing',
  'on-hold':  'On Hold',
  completed:  'Completed',
  cancelled:  'Cancelled',
  refunded:   'Refunded',
  failed:     'Failed',
};

const STATUS_CLASS = {
  pending:    'dash-status--pending',
  processing: 'dash-status--processing',
  'on-hold':  'dash-status--hold',
  completed:  'dash-status--completed',
  cancelled:  'dash-status--cancelled',
  refunded:   'dash-status--cancelled',
  failed:     'dash-status--cancelled',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAddress(addr) {
  if (!addr?.address_1) return null;
  return [addr.address_1, addr.address_2, addr.city, addr.state, addr.postcode, addr.country]
    .filter(Boolean).join(', ');
}

export default function AccountDashboard() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn } = useAuthStore();

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(null); // order ID of expanded row

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/my-account', { replace: true }); return; }
    if (!user?.id) { setLoading(false); return; }

    fetch(`/api/account/orders?customer=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load orders.');
        setLoading(false);
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    logout();
    navigate('/my-account');
  }

  const billingAddr  = formatAddress(user?.billing);
  const shippingAddr = formatAddress(user?.shipping);
  const memberDate   = user?.memberSince ? formatDate(user.memberSince) : null;

  return (
    <div className="account-page account-page--dashboard">
      <div className="container">

        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-info">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="dash-avatar-img" />
            ) : (
              <div className="dash-avatar">
                <User size={22} />
              </div>
            )}
            <div>
              <h1 className="dash-name">{user?.firstName} {user?.lastName}</h1>
              <p className="dash-email">{user?.email}</p>
              <div className="dash-meta">
                {user?.phone && (
                  <span className="dash-meta-item">
                    <Phone size={12} /> {user.phone}
                  </span>
                )}
                {memberDate && (
                  <span className="dash-meta-item">
                    <Calendar size={12} /> Member since {memberDate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="dash-logout" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* Store Credit */}
        {user?.storeCredit > 0 && (
          <div className="dash-credit">
            <CreditCard size={16} />
            <span>Store Credit</span>
            <strong>${parseFloat(user.storeCredit).toFixed(2)}</strong>
          </div>
        )}

        <div className="dash-layout">

          {/* Orders */}
          <div className="dash-section">
            <div className="dash-section-header">
              <Package size={16} />
              <h2>Order History</h2>
              {!loading && orders.length > 0 && (
                <span className="dash-order-count">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loading && (
              <div className="dash-orders-skeleton">
                {[1,2,3].map(i => <div key={i} className="dash-order-skeleton" />)}
              </div>
            )}

            {error && <p className="dash-notice dash-notice--error">{error}</p>}

            {!loading && !error && orders.length === 0 && (
              <div className="dash-empty">
                <ShoppingBag size={40} className="dash-empty-icon" />
                <p>No orders yet.</p>
                <Link to="/shop" className="dash-empty-btn">Start Shopping</Link>
              </div>
            )}

            {!loading && orders.length > 0 && (
              <div className="dash-orders">
                <div className="dash-orders-head">
                  <span>Order</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Total</span>
                  <span />
                </div>
                {orders.map(order => (
                  <div key={order.id} className="dash-order-group">
                    <div
                      className={`dash-order-row ${expanded === order.id ? 'dash-order-row--expanded' : ''}`}
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setExpanded(expanded === order.id ? null : order.id)}
                    >
                      <span className="dash-order-num">#{order.number}</span>
                      <span className="dash-order-date">{formatDate(order.date_created)}</span>
                      <span className={`dash-status ${STATUS_CLASS[order.status] || ''}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                      <span className="dash-order-total">{order.currency_symbol}{parseFloat(order.total).toFixed(2)}</span>
                      <span className="dash-order-expand">
                        {expanded === order.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </div>

                    {/* Expanded order detail */}
                    {expanded === order.id && (
                      <div className="dash-order-detail">
                        {/* Line items */}
                        <div className="dash-items">
                          {order.line_items?.map(item => (
                            <div key={item.id} className="dash-item">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="dash-item-img" loading="lazy" />
                              )}
                              <div className="dash-item-info">
                                <Link to={`/products/${item.product_id}`} className="dash-item-name">{item.name}</Link>
                                {item.sku && <span className="dash-item-sku">SKU: {item.sku}</span>}
                              </div>
                              <span className="dash-item-qty">x{item.quantity}</span>
                              <span className="dash-item-price">{order.currency_symbol}{parseFloat(item.total).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Order summary */}
                        <div className="dash-order-summary">
                          <div className="dash-order-summary-rows">
                            <div className="dash-summary-row">
                              <span>Subtotal</span>
                              <span>{order.currency_symbol}{order.subtotal}</span>
                            </div>
                            {parseFloat(order.shipping_total) > 0 && (
                              <div className="dash-summary-row">
                                <span>
                                  <Truck size={12} /> {order.shipping_method || 'Shipping'}
                                </span>
                                <span>{order.currency_symbol}{parseFloat(order.shipping_total).toFixed(2)}</span>
                              </div>
                            )}
                            {parseFloat(order.discount_total) > 0 && (
                              <div className="dash-summary-row dash-summary-row--discount">
                                <span>Discount</span>
                                <span>-{order.currency_symbol}{parseFloat(order.discount_total).toFixed(2)}</span>
                              </div>
                            )}
                            {parseFloat(order.total_tax) > 0 && (
                              <div className="dash-summary-row">
                                <span>Tax (GST)</span>
                                <span>{order.currency_symbol}{parseFloat(order.total_tax).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="dash-summary-row dash-summary-row--total">
                              <span>Total</span>
                              <span>{order.currency_symbol}{parseFloat(order.total).toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Payment & date info */}
                          <div className="dash-order-meta">
                            {order.payment_method_title && (
                              <span className="dash-order-meta-item">
                                <CreditCard size={12} /> {order.payment_method_title}
                              </span>
                            )}
                            {order.date_paid && (
                              <span className="dash-order-meta-item">
                                <Calendar size={12} /> Paid {formatDate(order.date_paid)}
                              </span>
                            )}
                          </div>

                          {order.customer_note && (
                            <div className="dash-order-note">
                              <strong>Note:</strong> {order.customer_note}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="dash-section">
            <div className="dash-section-header">
              <MapPin size={16} />
              <h2>Saved Addresses</h2>
            </div>

            <div className="dash-addresses">
              <div className="dash-address-card">
                <p className="dash-address-label">Billing Address</p>
                {billingAddr
                  ? <p className="dash-address-text">{billingAddr}</p>
                  : <p className="dash-address-empty">No billing address saved.</p>
                }
              </div>
              <div className="dash-address-card">
                <p className="dash-address-label">Shipping Address</p>
                {shippingAddr
                  ? <p className="dash-address-text">{shippingAddr}</p>
                  : <p className="dash-address-empty">No shipping address saved.</p>
                }
              </div>
            </div>

            <a
              href={`${import.meta.env.VITE_WC_URL}/my-account/edit-address`}
              target="_blank" rel="noopener noreferrer"
              className="dash-edit-link"
            >
              Edit addresses <ChevronRight size={14} />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
