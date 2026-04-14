import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, X, RefreshCw, Trash2, Plus } from 'lucide-react';
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
  const [trackProvider, setTrackProvider] = useState('');
  const [trackNumber, setTrackNumber]     = useState('');
  const [trackDate, setTrackDate]         = useState('');
  const [trackLink, setTrackLink]         = useState('');
  const [trackSaving, setTrackSaving]     = useState(false);
  const [statusSaving, setStatusSaving]   = useState(false);
  const [notes, setNotes]                 = useState([]);
  const [notesLoading, setNotesLoading]   = useState(false);
  const [newNote, setNewNote]             = useState('');
  const [newNoteCustomer, setNewNoteCustomer] = useState(false);
  const [noteSaving, setNoteSaving]       = useState(false);

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
    setNotes([]);
    setNewNote('');
    setNewNoteCustomer(false);
    resetTrackingForm();
    try {
      const res = await adminFetch(`/api/admin/orders/${order.id}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setDetail(data);
      loadNotes(order.id);
    } catch {
      showToast('Failed to load order', true);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadNotes(orderId) {
    setNotesLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/notes`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load notes', true);
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleStatusChange(e) {
    const next = e.target.value;
    if (!detail || next === detail.status) return;
    setStatusSaving(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${detail.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to update status', true); return; }
      setDetail(data);
      // update the row in the table too
      setOrders(list => list.map(o => o.id === data.id ? { ...o, status: data.status } : o));
      loadNotes(detail.id);
      showToast('Status updated');
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!detail || !newNote.trim()) return;
    setNoteSaving(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${detail.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote, customer_note: newNoteCustomer }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to add note', true); return; }
      setNewNote('');
      setNewNoteCustomer(false);
      loadNotes(detail.id);
      showToast('Note added');
    } finally {
      setNoteSaving(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setNotes([]);
    setNewNote('');
    setNewNoteCustomer(false);
    resetTrackingForm();
  }

  function resetTrackingForm() {
    setTrackProvider('');
    setTrackNumber('');
    setTrackDate('');
    setTrackLink('');
  }

  async function refreshDetail(id) {
    try {
      const res = await adminFetch(`/api/admin/orders/${id}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setDetail(data);
    } catch {
      showToast('Failed to refresh order', true);
    }
  }

  async function handleAddTracking(e) {
    e.preventDefault();
    if (!detail || !trackNumber.trim()) return;
    setTrackSaving(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${detail.id}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          tracking_provider: trackProvider.trim(),
          tracking_number: trackNumber.trim(),
          date_shipped: trackDate || undefined,
          custom_tracking_link: trackLink.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to add tracking', true); return; }
      resetTrackingForm();
      await refreshDetail(detail.id);
      showToast('Tracking added');
    } finally {
      setTrackSaving(false);
    }
  }

  async function handleDeleteTracking(trackingId) {
    if (!detail || !trackingId) return;
    if (!window.confirm('Remove this tracking entry?')) return;
    setTrackSaving(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${detail.id}/tracking/${trackingId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || 'Failed to remove tracking', true); return; }
      await refreshDetail(detail.id);
      showToast('Tracking removed');
    } finally {
      setTrackSaving(false);
    }
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
                <div className="ao-order-head">
                  <h2 className="ao-order-title">Order #{detail.number} details</h2>
                  <p className="ao-order-subtitle">
                    Payment via <strong>{detail.payment_method_title || '—'}</strong>.
                    {detail.date_paid && <> Paid on <strong>{formatDate(detail.date_paid)}</strong>.</>}
                    {' '}{detail.customer?.id ? `Customer ID: ${detail.customer.id}.` : 'Guest checkout.'}
                  </p>
                </div>

                <div className="ao-info-grid">
                  <div className="ao-info-col">
                    <h4 className="ao-info-title">General</h4>
                    <div className="ao-info-field">
                      <label>Date created</label>
                      <div>{formatDate(detail.date_created)}</div>
                    </div>
                    <div className="ao-info-field">
                      <label>Status</label>
                      <select
                        className={`ao-status-edit ${statusBadgeClass(detail.status).replace('ao-badge', 'ao-status-edit')}`}
                        value={detail.status}
                        onChange={handleStatusChange}
                        disabled={statusSaving}
                      >
                        {STATUS_OPTIONS.filter(o => o.value !== 'any').map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ao-info-field">
                      <label>Customer</label>
                      <div className="ao-info-customer">
                        <div>{customerName(detail.customer)}</div>
                        {detail.customer?.email && (
                          <a href={`mailto:${detail.customer.email}`}>{detail.customer.email}</a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ao-info-col">
                    <h4 className="ao-info-title">Billing</h4>
                    <address className="ao-address">
                      {`${detail.billing?.first_name || ''} ${detail.billing?.last_name || ''}`.trim() && (
                        <>{`${detail.billing.first_name || ''} ${detail.billing.last_name || ''}`.trim()}<br/></>
                      )}
                      {detail.billing?.company && <>{detail.billing.company}<br/></>}
                      {detail.billing?.address_1 && <>{detail.billing.address_1}<br/></>}
                      {detail.billing?.address_2 && <>{detail.billing.address_2}<br/></>}
                      {[detail.billing?.city, detail.billing?.state, detail.billing?.postcode].filter(Boolean).join(' ')}
                      {detail.billing?.country && <><br/>{detail.billing.country}</>}
                      {detail.billing?.phone && <><br/><a href={`tel:${detail.billing.phone}`}>{detail.billing.phone}</a></>}
                    </address>
                  </div>

                  <div className="ao-info-col">
                    <h4 className="ao-info-title">Shipping</h4>
                    <address className="ao-address">
                      {`${detail.shipping?.first_name || ''} ${detail.shipping?.last_name || ''}`.trim() && (
                        <>{`${detail.shipping.first_name || ''} ${detail.shipping.last_name || ''}`.trim()}<br/></>
                      )}
                      {detail.shipping?.company && <>{detail.shipping.company}<br/></>}
                      {detail.shipping?.address_1 && <>{detail.shipping.address_1}<br/></>}
                      {detail.shipping?.address_2 && <>{detail.shipping.address_2}<br/></>}
                      {[detail.shipping?.city, detail.shipping?.state, detail.shipping?.postcode].filter(Boolean).join(' ')}
                      {detail.shipping?.country && <><br/>{detail.shipping.country}</>}
                    </address>
                    {detail.customer_note && (
                      <div className="ao-cust-note">
                        <div className="ao-cust-note-label">Customer note</div>
                        <p>{detail.customer_note}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ao-main-grid">
                  <div className="ao-main-left">
                    <table className="ao-prod-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="ao-num">Cost</th>
                          <th className="ao-num">Qty</th>
                          <th className="ao-num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.line_items || []).map(li => (
                          <tr key={li.id}>
                            <td className="ao-prod-item">
                              {li.image ? (
                                <img src={li.image} alt="" className="ao-item-img" />
                              ) : (
                                <div className="ao-item-img ao-item-img--empty" />
                              )}
                              <div className="ao-item-info">
                                <div className="ao-item-name">{li.name}</div>
                                {li.sku && <div className="ao-item-sku">SKU: {li.sku}</div>}
                              </div>
                            </td>
                            <td className="ao-num">{formatMoney(li.price, detail.currency_symbol)}</td>
                            <td className="ao-num">{li.quantity}</td>
                            <td className="ao-num">{formatMoney(li.total, detail.currency_symbol)}</td>
                          </tr>
                        ))}
                        {parseFloat(detail.shipping_total) > 0 && (
                          <tr className="ao-prod-ship">
                            <td colSpan={3}>{detail.shipping_method || 'Shipping'}</td>
                            <td className="ao-num">{formatMoney(detail.shipping_total, detail.currency_symbol)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Items Subtotal</td>
                          <td className="ao-num">{formatMoney(detail.subtotal, detail.currency_symbol)}</td>
                        </tr>
                        {parseFloat(detail.discount_total) > 0 && (
                          <tr>
                            <td colSpan={3}>Discount</td>
                            <td className="ao-num">−{formatMoney(detail.discount_total, detail.currency_symbol)}</td>
                          </tr>
                        )}
                        {parseFloat(detail.total_tax) > 0 && (
                          <tr>
                            <td colSpan={3}>Tax</td>
                            <td className="ao-num">{formatMoney(detail.total_tax, detail.currency_symbol)}</td>
                          </tr>
                        )}
                        <tr className="ao-prod-grand">
                          <td colSpan={3}>Order Total</td>
                          <td className="ao-num">{formatMoney(detail.total, detail.currency_symbol)}</td>
                        </tr>
                      </tfoot>
                    </table>

                  <section className="ao-section">
                    <h3 className="ao-section-title">Order history</h3>
                    {notesLoading ? (
                      <p className="ao-track-empty">Loading…</p>
                    ) : notes.length === 0 ? (
                      <p className="ao-track-empty">No notes yet.</p>
                    ) : (
                      <ul className="ao-notes-list">
                        {notes.map(n => (
                          <li key={n.id} className={`ao-note ${n.customer_note ? 'ao-note--customer' : ''}`}>
                            <div className="ao-note-meta">
                              <span className="ao-note-author">{n.author || 'system'}</span>
                              <span className="ao-note-date">{formatDate(n.date_created)}</span>
                              {n.customer_note && <span className="ao-note-tag">Customer</span>}
                            </div>
                            <div className="ao-note-body" dangerouslySetInnerHTML={{ __html: n.note }} />
                          </li>
                        ))}
                      </ul>
                    )}
                    <form className="ao-track-form" onSubmit={handleAddNote}>
                      <textarea
                        className="ao-input ao-textarea"
                        placeholder="Add a note…"
                        rows={2}
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        disabled={noteSaving}
                      />
                      <div className="ao-note-actions">
                        <select
                          className="ao-input ao-note-type"
                          value={newNoteCustomer ? 'customer' : 'private'}
                          onChange={e => setNewNoteCustomer(e.target.value === 'customer')}
                          disabled={noteSaving}
                        >
                          <option value="private">Private note</option>
                          <option value="customer">Note to customer</option>
                        </select>
                        <button
                          type="submit"
                          className="ao-track-submit"
                          disabled={noteSaving || !newNote.trim()}
                        >
                          {noteSaving ? 'Saving…' : 'Add'}
                        </button>
                      </div>
                    </form>
                  </section>

                  </div>

                  <aside className="ao-main-right">
                    <section className="ao-section ao-section--panel">
                      <h3 className="ao-section-title">Shipment Tracking</h3>
                    {detail.tracking?.length > 0 ? (
                      <ul className="ao-track-list">
                        {detail.tracking.map((t, i) => (
                          <li key={t.tracking_id || i} className="ao-track-item">
                            <div className="ao-track-info">
                              <div className="ao-track-num">
                                {t.tracking_link
                                  ? <a href={t.tracking_link} target="_blank" rel="noreferrer">{t.tracking_number || '—'}</a>
                                  : (t.tracking_number || '—')}
                              </div>
                              <div className="ao-track-meta">
                                {t.provider || 'Custom'}
                                {t.date_shipped && ` • ${formatDate(t.date_shipped)}`}
                              </div>
                            </div>
                            {t.tracking_id && (
                              <button
                                className="ao-track-del"
                                onClick={() => handleDeleteTracking(t.tracking_id)}
                                disabled={trackSaving}
                                title="Remove tracking"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ao-track-empty">No tracking added yet.</p>
                    )}
                    <form className="ao-track-form" onSubmit={handleAddTracking}>
                      <div className="ao-track-form-row">
                        <input
                          className="ao-input"
                          type="text"
                          placeholder="Provider"
                          value={trackProvider}
                          onChange={e => setTrackProvider(e.target.value)}
                          disabled={trackSaving}
                        />
                        <input
                          className="ao-input"
                          type="text"
                          placeholder="Tracking number *"
                          value={trackNumber}
                          onChange={e => setTrackNumber(e.target.value)}
                          disabled={trackSaving}
                          required
                        />
                      </div>
                      <div className="ao-track-form-row">
                        <input
                          className="ao-input"
                          type="date"
                          value={trackDate}
                          onChange={e => setTrackDate(e.target.value)}
                          disabled={trackSaving}
                        />
                        <input
                          className="ao-input"
                          type="url"
                          placeholder="Link (optional)"
                          value={trackLink}
                          onChange={e => setTrackLink(e.target.value)}
                          disabled={trackSaving}
                        />
                      </div>
                      <button
                        type="submit"
                        className="ao-track-submit"
                        disabled={trackSaving || !trackNumber.trim()}
                      >
                        <Plus size={14} /> {trackSaving ? 'Saving…' : 'Add tracking'}
                      </button>
                    </form>
                    </section>

                    {detail.refunds?.length > 0 && (
                      <section className="ao-section ao-section--panel">
                        <h3 className="ao-section-title">Refunds</h3>
                        <ul className="ao-refunds">
                          {detail.refunds.map(r => (
                            <li key={r.id}>{formatMoney(r.total, detail.currency_symbol)} {r.reason && `— ${r.reason}`}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </aside>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
