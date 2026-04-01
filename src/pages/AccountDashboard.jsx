import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, MapPin, LogOut, ExternalLink, ChevronRight, User } from 'lucide-react';
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

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

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

  return (
    <div className="account-page account-page--dashboard">
      <div className="container">

        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-info">
            <div className="dash-avatar">
              <User size={22} />
            </div>
            <div>
              <h1 className="dash-name">{user?.firstName} {user?.lastName}</h1>
              <p className="dash-email">{user?.email}</p>
            </div>
          </div>
          <button className="dash-logout" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        <div className="dash-layout">

          {/* Orders */}
          <div className="dash-section">
            <div className="dash-section-header">
              <Package size={16} />
              <h2>Order History</h2>
            </div>

            {loading && (
              <div className="dash-orders-skeleton">
                {[1,2,3].map(i => <div key={i} className="dash-order-skeleton" />)}
              </div>
            )}

            {error && <p className="dash-notice dash-notice--error">{error}</p>}

            {!loading && !error && orders.length === 0 && (
              <div className="dash-empty">
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
                  <div key={order.id} className="dash-order-row">
                    <span className="dash-order-num">#{order.number}</span>
                    <span className="dash-order-date">{formatDate(order.date_created)}</span>
                    <span className={`dash-status ${STATUS_CLASS[order.status] || ''}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                    <span className="dash-order-total">${parseFloat(order.total).toFixed(2)}</span>
                    <a
                      href={`${import.meta.env.VITE_WC_URL}/my-account/view-order/${order.id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="dash-order-link"
                      aria-label={`View order #${order.number}`}
                    >
                      <ExternalLink size={14} />
                    </a>
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
