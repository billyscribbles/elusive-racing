import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, MapPin, LogOut, ChevronDown, ChevronRight, User, Phone, Calendar, CreditCard, Truck, ShoppingBag, Pencil, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { clearAdminAuth } from '../lib/adminAuth';
import WholesaleOrderPage from './WholesaleOrderPage';
import { formatPrice } from '../lib/formatPrice';
import { updateAccountProfile } from '../lib/woocommerce';
import './AccountPage.css';

const EMPTY_ADDRESS = {
  first_name: '', last_name: '', company: '',
  address_1: '', address_2: '', city: '', state: '', postcode: '', country: 'AU',
};

const ADDRESS_COMPARE_KEYS = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country'];

function shippingMatchesBilling(shipping, billing) {
  if (!shipping || !billing) return false;
  const blank = ADDRESS_COMPARE_KEYS.every(k => !(shipping[k] || '').trim());
  if (blank) return true;
  return ADDRESS_COMPARE_KEYS.every(k => (shipping[k] || '') === (billing[k] || ''));
}

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
  const { user, logout, isLoggedIn, isWholesale, userTypeLabel } = useAuthStore();
  const wholesale = isLoggedIn() && isWholesale();
  const roleLabel = userTypeLabel();

  const [activeTab, setActiveTab] = useState('overview');

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(null); // order ID of expanded row

  // Edit modal state — one button, one form covering name/phone/billing/shipping
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  function openEdit() {
    setSaveError(''); setSavedMsg('');
    const billing  = { ...EMPTY_ADDRESS, ...(user?.billing  || {}) };
    const shipping = { ...EMPTY_ADDRESS, ...(user?.shipping || {}) };
    setDraft({
      first_name: user?.firstName || '',
      last_name:  user?.lastName  || '',
      phone:      user?.phone     || user?.billing?.phone || '',
      billing,
      shipping,
      sameAsBilling: shippingMatchesBilling(shipping, billing),
    });
    setEditOpen(true);
  }

  function cancelEdit() {
    setEditOpen(false); setDraft(null); setSaveError('');
  }

  async function handleSave() {
    if (!user?.token) return;
    setSaving(true); setSaveError('');
    try {
      const billing  = { ...(user.billing || {}), ...draft.billing, phone: draft.phone };
      const shipping = draft.sameAsBilling
        ? ADDRESS_COMPARE_KEYS.reduce((acc, k) => ({ ...acc, [k]: draft.billing[k] || '' }), {})
        : draft.shipping;
      const payload = {
        first_name: draft.first_name,
        last_name:  draft.last_name,
        billing,
        shipping,
      };
      const updated = await updateAccountProfile(payload, user.token);
      useAuthStore.getState().updateUser(updated);
      setEditOpen(false); setDraft(null);
      setSavedMsg('Saved.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      setSaveError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

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
    clearAdminAuth();
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
              <h1 className="dash-name">
                {user?.firstName} {user?.lastName}
                <span className={`dash-role-badge dash-role-badge--${roleLabel.toLowerCase()}`}>{roleLabel}</span>
              </h1>
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
          <div className="dash-header-actions">
            <button className="dash-logout" onClick={openEdit}>
              <Pencil size={14} /> Edit details
            </button>
            <button className="dash-logout" onClick={handleLogout}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>

        {savedMsg && <div className="dash-form-toast">{savedMsg}</div>}

        {/* Store Credit */}
        {user?.storeCredit > 0 && (
          <div className="dash-credit">
            <CreditCard size={16} />
            <span>Store Credit</span>
            <strong>{formatPrice(parseFloat(user.storeCredit))}</strong>
          </div>
        )}

        {/* Wholesale Catalogue Tabs */}
        {wholesale && (
          <div className="dash-tabs">
            <button
              className={`dash-tab${activeTab === 'overview' ? ' dash-tab--active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`dash-tab${activeTab === 'catalogue' ? ' dash-tab--active' : ''}`}
              onClick={() => setActiveTab('catalogue')}
            >
              Catalogue
            </button>
          </div>
        )}

        {/* Overview Tab (default for all users) */}
        {activeTab === 'overview' && <div className="dash-layout">

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
          </div>

        </div>}
      </div>

      {/* Wholesale Catalogue Tab — rendered outside .container for full width */}
      {wholesale && activeTab === 'catalogue' && (
        <WholesaleOrderPage />
      )}

      {editOpen && draft && (
        <EditModal
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onCancel={cancelEdit}
        />
      )}
    </div>
  );
}

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

function AddressFields({ address, onChange }) {
  const update = (patch) => onChange({ ...address, ...patch });
  return (
    <>
      <div className="dash-form-row">
        <label>
          <span>First name</span>
          <input className="dash-form-input" value={address.first_name || ''} onChange={e => update({ first_name: e.target.value })} />
        </label>
        <label>
          <span>Last name</span>
          <input className="dash-form-input" value={address.last_name || ''} onChange={e => update({ last_name: e.target.value })} />
        </label>
      </div>
      <label>
        <span>Company (optional)</span>
        <input className="dash-form-input" value={address.company || ''} onChange={e => update({ company: e.target.value })} />
      </label>
      <label>
        <span>Street address</span>
        <input className="dash-form-input" value={address.address_1 || ''} onChange={e => update({ address_1: e.target.value })} />
      </label>
      <label>
        <span>Apartment, suite, etc. (optional)</span>
        <input className="dash-form-input" value={address.address_2 || ''} onChange={e => update({ address_2: e.target.value })} />
      </label>
      <div className="dash-form-row">
        <label>
          <span>Suburb</span>
          <input className="dash-form-input" value={address.city || ''} onChange={e => update({ city: e.target.value })} />
        </label>
        <label>
          <span>State</span>
          <select className="dash-form-input" value={address.state || ''} onChange={e => update({ state: e.target.value })}>
            <option value="">Select…</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="dash-form-row">
        <label>
          <span>Postcode</span>
          <input className="dash-form-input" value={address.postcode || ''} onChange={e => update({ postcode: e.target.value })} />
        </label>
        <label>
          <span>Country</span>
          <input className="dash-form-input" value={address.country || 'AU'} onChange={e => update({ country: e.target.value })} />
        </label>
      </div>
    </>
  );
}

function EditModal({ draft, setDraft, saving, saveError, onSave, onCancel }) {
  const update = (patch) => setDraft({ ...draft, ...patch });

  return (
    <div className="dash-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-label="Edit details">
      <div className="dash-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-head">
          <h2>Edit details</h2>
          <button className="dash-modal-close" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="dash-modal-body">
          {/* Profile */}
          <h3 className="dash-form-section-title">Your details</h3>
          <div className="dash-form-row">
            <label>
              <span>First name</span>
              <input className="dash-form-input" value={draft.first_name} onChange={e => update({ first_name: e.target.value })} />
            </label>
            <label>
              <span>Last name</span>
              <input className="dash-form-input" value={draft.last_name} onChange={e => update({ last_name: e.target.value })} />
            </label>
          </div>
          <label>
            <span>Phone</span>
            <input type="tel" className="dash-form-input" value={draft.phone} onChange={e => update({ phone: e.target.value })} />
          </label>

          {/* Billing */}
          <h3 className="dash-form-section-title">Billing address</h3>
          <AddressFields address={draft.billing} onChange={billing => update({ billing })} />

          {/* Shipping */}
          <h3 className="dash-form-section-title">Shipping address</h3>
          <label className="dash-form-checkbox">
            <input
              type="checkbox"
              checked={draft.sameAsBilling}
              onChange={e => update({ sameAsBilling: e.target.checked })}
            />
            <span>Same as billing address</span>
          </label>
          {!draft.sameAsBilling && (
            <AddressFields address={draft.shipping} onChange={shipping => update({ shipping })} />
          )}

          {saveError && <p className="dash-form-notice dash-form-notice--error">{saveError}</p>}
        </div>

        <div className="dash-modal-actions">
          <button className="dash-form-btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="dash-form-btn dash-form-btn--primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
