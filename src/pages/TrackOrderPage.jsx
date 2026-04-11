import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ChevronDown, ChevronRight, CreditCard, Truck, Calendar, ShoppingBag, ArrowLeft, ExternalLink } from 'lucide-react';
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

export default function TrackOrderPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(null);

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

  return (
    <div className="account-page account-page--dashboard">
      <div className="container">

        {/* Page header */}
        <div className="track-header">
          <Link to="/my-account/dashboard" className="track-back">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="track-title-row">
            <Package size={20} />
            <h1 className="track-title">Track Your Orders</h1>
          </div>
        </div>

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

                  {expanded === order.id && (
                    <div className="dash-order-detail">

                      {/* Tracking information */}
                      <div className="dash-tracking">
                        <div className="dash-tracking-header">
                          <Truck size={14} />
                          <span>Tracking Information</span>
                        </div>
                        {order.tracking?.length > 0 ? (
                          order.tracking.map((t, i) => (
                            <div key={i} className="dash-tracking-item">
                              {t.provider && <span className="dash-tracking-provider">{t.provider}</span>}
                              {t.tracking_number && (
                                t.tracking_link ? (
                                  <a
                                    href={t.tracking_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="dash-tracking-link"
                                  >
                                    {t.tracking_number} <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="dash-tracking-number">{t.tracking_number}</span>
                                )
                              )}
                              {t.date_shipped && (
                                <span className="dash-tracking-date">Shipped {formatDate(t.date_shipped)}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="dash-tracking-empty">
                            Tracking information will appear here once your order has shipped.
                          </p>
                        )}
                      </div>

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

      </div>
    </div>
  );
}
