import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminOrders.css';

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'any',        label: 'All statuses' },
  { value: 'pending',    label: 'Pending payment' },
  { value: 'processing', label: 'Processing' },
  { value: 'on-hold',    label: 'On hold' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'refunded',   label: 'Refunded' },
  { value: 'failed',     label: 'Failed' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(amount, symbol = '$') {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${symbol}0.00`;
  return `${symbol}${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadgeClass(status) {
  switch (status) {
    case 'completed':  return 'ao-badge ao-badge--green';
    case 'processing': return 'ao-badge ao-badge--blue';
    case 'on-hold':    return 'ao-badge ao-badge--yellow';
    case 'pending':    return 'ao-badge ao-badge--gray';
    case 'cancelled':
    case 'failed':
    case 'refunded':   return 'ao-badge ao-badge--red';
    default:           return 'ao-badge ao-badge--gray';
  }
}

function statusLabel(status) {
  if (!status) return '—';
  return status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function customerName(c) {
  if (!c) return '—';
  const full = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return full || c.email || '—';
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('any');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast]           = useState(null);

  const debounceRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE, status: statusFilter });
      if (search) params.set('search', search);
      const res = await adminFetch(`/api/admin/orders?${params}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      showToast('Failed to load orders', true);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, navigate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function handleSearchChange(e) {
    setLocalSearch(e.target.value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(e.target.value.trim());
      setPage(1);
    }, 400);
  }

  function clearSearch() {
    setLocalSearch('');
    setSearch('');
    setPage(1);
  }

  function handleStatusFilter(s) {
    setStatusFilter(s);
    setPage(1);
  }

  async function openDetail(order) {
    setSelectedId(order.id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminFetch(`/api/admin/orders/${order.id}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setDetail(data);
    } catch {
      showToast('Failed to load order', true);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
  }

  function showToast(msg, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="ao-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      {toast && (
        <div className={`ao-toast${toast.error ? ' ao-toast--error' : ''}`}>{toast.msg}</div>
      )}

      <main className="ao-main">
        <div className="ao-toolbar">
          <div className="ao-toolbar-left">
            <h1 className="ao-page-title">Orders</h1>
            {!loading && <span className="ao-count">{total} total</span>}
          </div>
          <div className="ao-toolbar-right">
            <div className="ao-search-wrap">
              <Search size={14} className="ao-search-icon" />
              <input
                className="ao-search"
                type="text"
                placeholder="Search by order # or customer…"
                value={localSearch}
                onChange={handleSearchChange}
              />
              {localSearch && (
                <button className="ao-search-clear" onClick={clearSearch}>
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              className="ao-status-select"
              value={statusFilter}
              onChange={e => handleStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="ao-refresh-btn" onClick={fetchOrders} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="ao-table-wrap">
          <table className="ao-table">
            <thead>
              <tr>
                <th className="ao-th">Order</th>
                <th className="ao-th ao-th--hide-sm">Date</th>
                <th className="ao-th">Status</th>
                <th className="ao-th ao-th--right">Total</th>
                <th className="ao-th ao-th--hide-sm">Type</th>
                <th className="ao-th">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="ao-tr ao-tr--skeleton">
                    <td className="ao-td"><div className="ao-skeleton ao-skeleton--sm" /></td>
                    <td className="ao-td ao-th--hide-sm"><div className="ao-skeleton ao-skeleton--sm" /></td>
                    <td className="ao-td"><div className="ao-skeleton ao-skeleton--sm" /></td>
                    <td className="ao-td ao-th--right"><div className="ao-skeleton ao-skeleton--sm" /></td>
                    <td className="ao-td ao-th--hide-sm"><div className="ao-skeleton ao-skeleton--sm" /></td>
                    <td className="ao-td"><div className="ao-skeleton" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="ao-empty">No orders found.</td></tr>
              ) : orders.map(o => (
                <tr
                  key={o.id}
                  className={`ao-tr${selectedId === o.id ? ' ao-tr--selected' : ''}`}
                  onClick={() => openDetail(o)}
                >
                  <td className="ao-td ao-td--num">#{o.number}</td>
                  <td className="ao-td ao-th--hide-sm ao-text-muted">{formatDate(o.date_created)}</td>
                  <td className="ao-td">
                    <span className={statusBadgeClass(o.status)}>{statusLabel(o.status)}</span>
                  </td>
                  <td className="ao-td ao-th--right ao-td--total">
                    {formatMoney(o.total, o.currency_symbol)}
                  </td>
                  <td className="ao-td ao-th--hide-sm">
                    <span className={`ao-badge ${o.order_type === 'Wholesale' ? 'ao-badge--blue' : 'ao-badge--gray'}`}>
                      {o.order_type || 'Retail'}
                    </span>
                  </td>
                  <td className="ao-td ao-text-muted ao-td--email">{o.customer?.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="ao-pagination">
            <button className="ao-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={15} />
            </button>
            <span className="ao-page-info">Page {page} of {totalPages}</span>
            <button className="ao-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </main>

      {selectedId && (
        <>
          <div className="ao-drawer-backdrop" onClick={closeDetail} />
          <aside className="ao-drawer" data-admin-theme={theme}>
            <div className="ao-drawer-header">
              <h2 className="ao-drawer-title">
                {detail ? `Order #${detail.number}` : 'Loading…'}
              </h2>
              <button className="ao-drawer-close" onClick={closeDetail}><X size={18} /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="ao-loading">Loading…</div>
            ) : (
              <div className="ao-drawer-body">
                <div className="ao-summary">
                  <span className={statusBadgeClass(detail.status)}>{statusLabel(detail.status)}</span>
                  <span className="ao-summary-date">{formatDate(detail.date_created)}</span>
                </div>

                <section className="ao-section">
                  <h3 className="ao-section-title">Customer</h3>
                  <dl className="ao-dl">
                    <dt>Name</dt><dd>{customerName(detail.customer)}</dd>
                    <dt>Email</dt><dd>{detail.customer?.email || '—'}</dd>
                    <dt>Phone</dt><dd>{detail.billing?.phone || '—'}</dd>
                    <dt>Customer ID</dt><dd>{detail.customer?.id || '—'}</dd>
                  </dl>
                </section>

                <section className="ao-section">
                  <h3 className="ao-section-title">Line items ({detail.line_items?.length || 0})</h3>
                  <ul className="ao-items">
                    {(detail.line_items || []).map(li => (
                      <li key={li.id} className="ao-item">
                        {li.image ? (
                          <img src={li.image} alt="" className="ao-item-img" />
                        ) : (
                          <div className="ao-item-img ao-item-img--empty" />
                        )}
                        <div className="ao-item-info">
                          <div className="ao-item-name">{li.name}</div>
                          {li.sku && <div className="ao-item-sku">SKU: {li.sku}</div>}
                          <div className="ao-item-qty">Qty: {li.quantity} × {formatMoney(li.price, detail.currency_symbol)}</div>
                        </div>
                        <div className="ao-item-total">{formatMoney(li.total, detail.currency_symbol)}</div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="ao-section">
                  <h3 className="ao-section-title">Totals</h3>
                  <dl className="ao-dl">
                    <dt>Subtotal</dt><dd>{formatMoney(detail.subtotal, detail.currency_symbol)}</dd>
                    <dt>Discount</dt><dd>{formatMoney(detail.discount_total, detail.currency_symbol)}</dd>
                    <dt>Shipping</dt><dd>{formatMoney(detail.shipping_total, detail.currency_symbol)} {detail.shipping_method && `(${detail.shipping_method})`}</dd>
                    <dt>Tax</dt><dd>{formatMoney(detail.total_tax, detail.currency_symbol)}</dd>
                    <dt>Total</dt><dd className="ao-total-big">{formatMoney(detail.total, detail.currency_symbol)}</dd>
                    <dt>Payment</dt><dd>{detail.payment_method_title || '—'}</dd>
                    {detail.date_paid && <><dt>Paid</dt><dd>{formatDate(detail.date_paid)}</dd></>}
                  </dl>
                </section>

                <section className="ao-section">
                  <h3 className="ao-section-title">Shipping address</h3>
                  <dl className="ao-dl">
                    <dt>Name</dt><dd>{`${detail.shipping?.first_name || ''} ${detail.shipping?.last_name || ''}`.trim() || '—'}</dd>
                    <dt>Address</dt>
                    <dd>
                      {detail.shipping?.address_1 || '—'}
                      {detail.shipping?.address_2 && <><br/>{detail.shipping.address_2}</>}
                    </dd>
                    <dt>City / State</dt><dd>{[detail.shipping?.city, detail.shipping?.state].filter(Boolean).join(', ') || '—'}</dd>
                    <dt>Postcode</dt><dd>{detail.shipping?.postcode || '—'}</dd>
                    <dt>Country</dt><dd>{detail.shipping?.country || '—'}</dd>
                  </dl>
                </section>

                {detail.tracking?.length > 0 && (
                  <section className="ao-section">
                    <h3 className="ao-section-title">Tracking</h3>
                    {detail.tracking.map((t, i) => (
                      <dl key={i} className="ao-dl">
                        <dt>Provider</dt><dd>{t.provider || '—'}</dd>
                        <dt>Number</dt>
                        <dd>
                          {t.tracking_link
                            ? <a href={t.tracking_link} target="_blank" rel="noreferrer">{t.tracking_number || '—'}</a>
                            : (t.tracking_number || '—')}
                        </dd>
                        {t.date_shipped && <><dt>Shipped</dt><dd>{formatDate(t.date_shipped)}</dd></>}
                      </dl>
                    ))}
                  </section>
                )}

                {detail.refunds?.length > 0 && (
                  <section className="ao-section">
                    <h3 className="ao-section-title">Refunds</h3>
                    <ul className="ao-refunds">
                      {detail.refunds.map(r => (
                        <li key={r.id}>{formatMoney(r.total, detail.currency_symbol)} {r.reason && `— ${r.reason}`}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {detail.customer_note && (
                  <section className="ao-section">
                    <h3 className="ao-section-title">Customer note</h3>
                    <p className="ao-notes">{detail.customer_note}</p>
                  </section>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
