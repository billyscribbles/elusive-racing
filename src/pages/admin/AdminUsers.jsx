import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, X, RefreshCw, Check, XCircle } from 'lucide-react';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminUsers.css';

const PER_PAGE = 20;

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function roleLabel(role, tiers) {
  if (role === 'customer') return 'Customer';
  if (role === 'administrator') return 'Administrator';
  if (role === 'wwlc_unapproved') return 'Pending wholesale';
  const t = tiers.find(x => x.role === role);
  return t?.label || role;
}

function isPending(user) {
  return user.wholesaleStatus === 'pending' || user.role === 'wwlc_unapproved';
}

function statusBadgeClass(user) {
  if (isPending(user))                      return 'au-badge au-badge--yellow';
  if (user.wholesaleStatus === 'rejected')  return 'au-badge au-badge--red';
  if ((user.role || '').startsWith('wholesale_customer')) return 'au-badge au-badge--green';
  return 'au-badge au-badge--gray';
}

function statusLabel(user) {
  if (isPending(user))                      return 'Pending';
  if (user.wholesaleStatus === 'rejected')  return 'Rejected';
  if ((user.role || '').startsWith('wholesale_customer')) return 'Active wholesale';
  return 'Customer';
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [users, setUsers]           = useState([]);
  const [tiers, setTiers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingAction, setSavingAction]   = useState(false);
  const [toast, setToast]           = useState(null);

  const debounceRef = useRef(null);

  // Load tier list for labels + role filter options
  useEffect(() => {
    adminFetch('/api/admin/wholesale-tiers')
      .then(r => r.ok ? r.json() : { tiers: [] })
      .then(data => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE, role: roleFilter });
      if (search) params.set('search', search);
      const res = await adminFetch(`/api/admin/users?${params}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      showToast('Failed to load users', true);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, navigate]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

  function handleRoleFilter(r) {
    setRoleFilter(r);
    setPage(1);
  }

  async function openDetail(user) {
    setSelectedId(user.id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminFetch(`/api/admin/users/${user.id}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setDetail(data);
    } catch {
      showToast('Failed to load user', true);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
  }

  function applyUserUpdate(updated) {
    setDetail(updated);
    setUsers(list => list.map(u => u.id === updated.id ? { ...u, ...updated } : u));
  }

  async function handleApprove(role) {
    if (!detail) return;
    setSavingAction(true);
    try {
      const res = await adminFetch(`/api/admin/users/${detail.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Approve failed', true); return; }
      applyUserUpdate(data);
      showToast('User approved');
    } finally {
      setSavingAction(false);
    }
  }

  async function handleReject() {
    if (!detail) return;
    if (!window.confirm('Reject this wholesale application?')) return;
    setSavingAction(true);
    try {
      const res = await adminFetch(`/api/admin/users/${detail.id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Reject failed', true); return; }
      applyUserUpdate(data);
      showToast('Application rejected');
    } finally {
      setSavingAction(false);
    }
  }

  async function handleRoleChange(role) {
    if (!detail) return;
    setSavingAction(true);
    try {
      const res = await adminFetch(`/api/admin/users/${detail.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Update failed', true); return; }
      applyUserUpdate(data);
      showToast('Role updated');
    } finally {
      setSavingAction(false);
    }
  }

  function showToast(msg, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="au-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      {toast && (
        <div className={`au-toast${toast.error ? ' au-toast--error' : ''}`}>{toast.msg}</div>
      )}

      <main className="au-main">
        <div className="au-toolbar">
          <div className="au-toolbar-left">
            <h1 className="au-page-title">Users</h1>
            {!loading && <span className="au-count">{total} total</span>}
          </div>
          <div className="au-toolbar-right">
            <div className="au-search-wrap">
              <Search size={14} className="au-search-icon" />
              <input
                className="au-search"
                type="text"
                placeholder="Search by name or email…"
                value={localSearch}
                onChange={handleSearchChange}
              />
              {localSearch && (
                <button className="au-search-clear" onClick={clearSearch}>
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              className="au-role-select"
              value={roleFilter}
              onChange={e => handleRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              <option value="customer">Customer</option>
              <option value="pending">Pending wholesale</option>
              {tiers.map(t => (
                <option key={t.role} value={t.role}>{t.label}</option>
              ))}
            </select>
            <button className="au-refresh-btn" onClick={fetchUsers} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="au-table-wrap">
          <table className="au-table">
            <thead>
              <tr>
                <th className="au-th">Name</th>
                <th className="au-th">Email</th>
                <th className="au-th au-th--hide-sm">Role</th>
                <th className="au-th au-th--hide-sm">Registered</th>
                <th className="au-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="au-tr au-tr--skeleton">
                    <td className="au-td"><div className="au-skeleton" /></td>
                    <td className="au-td"><div className="au-skeleton" /></td>
                    <td className="au-td au-th--hide-sm"><div className="au-skeleton au-skeleton--sm" /></td>
                    <td className="au-td au-th--hide-sm"><div className="au-skeleton au-skeleton--sm" /></td>
                    <td className="au-td"><div className="au-skeleton au-skeleton--sm" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="au-empty">No users found.</td></tr>
              ) : users.map(u => (
                <tr
                  key={u.id}
                  className={`au-tr${selectedId === u.id ? ' au-tr--selected' : ''}`}
                  onClick={() => openDetail(u)}
                >
                  <td className="au-td au-td--name">
                    {u.avatarUrl && <img src={u.avatarUrl} alt="" className="au-avatar" />}
                    <span>{(u.firstName || u.lastName) ? `${u.firstName} ${u.lastName}`.trim() : '—'}</span>
                  </td>
                  <td className="au-td au-text-muted">{u.email}</td>
                  <td className="au-td au-th--hide-sm">{roleLabel(u.role, tiers)}</td>
                  <td className="au-td au-th--hide-sm au-text-muted">{formatDate(u.dateCreated)}</td>
                  <td className="au-td">
                    <span className={statusBadgeClass(u)}>{statusLabel(u)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="au-pagination">
            <button className="au-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={15} />
            </button>
            <span className="au-page-info">Page {page} of {totalPages}</span>
            <button className="au-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </main>

      {selectedId && (
        <>
          <div className="au-drawer-backdrop" onClick={closeDetail} />
          <aside className="au-drawer" data-admin-theme={theme}>
            <div className="au-drawer-header">
              <h2 className="au-drawer-title">
                {detail ? `${detail.firstName} ${detail.lastName}`.trim() || detail.email : 'Loading…'}
              </h2>
              <button className="au-drawer-close" onClick={closeDetail}><X size={18} /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="au-loading">Loading…</div>
            ) : (
              <div className="au-drawer-body">
                {isPending(detail) && (
                  <div className="au-pending-box">
                    <div className="au-pending-title">Wholesale application pending</div>
                    <p className="au-pending-sub">
                      {detail.wholesaleRequestedTier
                        ? `Requested tier: ${roleLabel(detail.wholesaleRequestedTier, tiers)}. `
                        : ''}
                      Approve and assign a tier, or reject.
                    </p>
                    <div className="au-pending-actions">
                      <select
                        className="au-tier-select"
                        defaultValue={detail.wholesaleRequestedTier || tiers[0]?.role || ''}
                        id="au-approve-tier"
                      >
                        {tiers.map(t => (
                          <option key={t.role} value={t.role}>{t.label} ({t.discount}%)</option>
                        ))}
                      </select>
                      <button
                        className="au-btn au-btn--approve"
                        disabled={savingAction}
                        onClick={() => {
                          const el = document.getElementById('au-approve-tier');
                          handleApprove(el?.value || tiers[0]?.role);
                        }}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        className="au-btn au-btn--reject"
                        disabled={savingAction}
                        onClick={handleReject}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                <section className="au-section">
                  <h3 className="au-section-title">Account</h3>
                  <dl className="au-dl">
                    <dt>Customer ID</dt><dd>{detail.id}</dd>
                    <dt>Email</dt><dd>{detail.email}</dd>
                    <dt>Username</dt><dd>{detail.username || '—'}</dd>
                    <dt>Registered</dt><dd>{formatDate(detail.dateCreated)}</dd>
                    <dt>Current role</dt><dd>{roleLabel(detail.role, tiers)}</dd>
                  </dl>
                </section>

                <section className="au-section">
                  <h3 className="au-section-title">Change role</h3>
                  <div className="au-role-edit">
                    <select
                      className="au-tier-select"
                      value={detail.role || 'customer'}
                      onChange={e => handleRoleChange(e.target.value)}
                      disabled={savingAction}
                    >
                      <option value="customer">Customer</option>
                      {tiers.map(t => (
                        <option key={t.role} value={t.role}>{t.label} ({t.discount}%)</option>
                      ))}
                    </select>
                    <p className="au-hint">
                      Setting a wholesale tier will clear any pending/rejected flag.
                    </p>
                  </div>
                </section>

                <section className="au-section">
                  <h3 className="au-section-title">Billing</h3>
                  <dl className="au-dl">
                    <dt>Company</dt><dd>{detail.billing?.company || '—'}</dd>
                    <dt>Address</dt>
                    <dd>
                      {detail.billing?.address_1 || '—'}
                      {detail.billing?.address_2 && <><br/>{detail.billing.address_2}</>}
                    </dd>
                    <dt>City / State</dt><dd>{[detail.billing?.city, detail.billing?.state].filter(Boolean).join(', ') || '—'}</dd>
                    <dt>Postcode</dt><dd>{detail.billing?.postcode || '—'}</dd>
                    <dt>Phone</dt><dd>{detail.billing?.phone || '—'}</dd>
                  </dl>
                </section>

                <section className="au-section">
                  <h3 className="au-section-title">Shipping</h3>
                  <dl className="au-dl">
                    <dt>Address</dt>
                    <dd>
                      {detail.shipping?.address_1 || '—'}
                      {detail.shipping?.address_2 && <><br/>{detail.shipping.address_2}</>}
                    </dd>
                    <dt>City / State</dt><dd>{[detail.shipping?.city, detail.shipping?.state].filter(Boolean).join(', ') || '—'}</dd>
                    <dt>Postcode</dt><dd>{detail.shipping?.postcode || '—'}</dd>
                  </dl>
                </section>

                {(detail.wholesale?.abn || detail.wholesale?.businessType || detail.wholesale?.website || detail.wholesale?.notes) && (
                  <section className="au-section">
                    <h3 className="au-section-title">Wholesale business</h3>
                    <dl className="au-dl">
                      <dt>ABN</dt><dd>{detail.wholesale.abn || '—'}</dd>
                      <dt>Business type</dt><dd>{detail.wholesale.businessType || '—'}</dd>
                      <dt>Website</dt><dd>{detail.wholesale.website || '—'}</dd>
                      <dt>Heard about us</dt><dd>{detail.wholesale.hearAbout || '—'}</dd>
                      <dt>Applied</dt><dd>{formatDate(detail.wholesale.appliedAt)}</dd>
                      {detail.wholesale.notes && (
                        <>
                          <dt>Notes</dt>
                          <dd className="au-notes">{detail.wholesale.notes}</dd>
                        </>
                      )}
                    </dl>
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
