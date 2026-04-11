import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import { formatPrice } from '../../lib/formatPrice';
import './AdminProducts.css';

const STOCK_LABEL = { instock: 'In Stock', outofstock: 'Out of Stock', onbackorder: 'Backorder' };
const STOCK_CLASS = { instock: 'ap-badge--green', outofstock: 'ap-badge--red', onbackorder: 'ap-badge--yellow' };

export default function AdminProducts() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useAdminTheme();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('any');
  const [deleting, setDeleting]   = useState(null);
  const debounceRef = useRef(null);
  const PER_PAGE = 20;

  useEffect(() => {
    fetchProducts();
  }, [page, search, statusFilter]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE });
      if (search) params.set('search', search);
      if (statusFilter !== 'any') params.set('status', statusFilter);
      const res  = await adminFetch(`/api/admin/products?${params}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // network error — leave stale data
    } finally {
      setLoading(false);
    }
  }

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

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(p => p.filter(x => x.id !== product.id));
        setTotal(t => t - 1);
      }
    } finally {
      setDeleting(null);
    }
  }

  function getBrand(p) {
    return p.brands?.[0]?.name
      ?? p.attributes?.find(a => ['brand', 'pa_brand', 'Brand'].includes(a.name))?.options?.[0]
      ?? '—';
  }

  return (
    <div className="ap-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="ap-main">
        <div className="ap-status-tabs">
          {[['any', 'All'], ['publish', 'Published'], ['draft', 'Drafts']].map(([val, label]) => (
            <button
              key={val}
              className={`ap-status-tab${statusFilter === val ? ' ap-status-tab--active' : ''}`}
              onClick={() => handleStatusFilter(val)}
            >
              {label}
              {statusFilter === val && !loading && <span className="ap-status-count">{total}</span>}
            </button>
          ))}
        </div>

        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <h1 className="ap-page-title">Products</h1>
            {!loading && <span className="ap-count">{total} total</span>}
          </div>
          <div className="ap-toolbar-right">
            <div className="ap-search-wrap">
              <Search size={14} className="ap-search-icon" />
              <input
                className="ap-search"
                type="text"
                placeholder="Search products…"
                value={localSearch}
                onChange={handleSearchChange}
              />
              {localSearch && (
                <button className="ap-search-clear" onClick={clearSearch}>
                  <X size={12} />
                </button>
              )}
            </div>
            <Link to="/admin/products/new" className="ap-new-btn">
              <Plus size={15} /> New Product
            </Link>
          </div>
        </div>

        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th className="ap-th ap-th--img" />
                <th className="ap-th">Product</th>
                <th className="ap-th ap-th--hide-sm">Brand</th>
                <th className="ap-th">Price</th>
                <th className="ap-th ap-th--hide-sm">Stock</th>
                <th className="ap-th ap-th--hide-sm">Status</th>
                <th className="ap-th ap-th--actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="ap-tr ap-tr--skeleton">
                    <td className="ap-td"><div className="ap-skeleton ap-skeleton--img" /></td>
                    <td className="ap-td"><div className="ap-skeleton ap-skeleton--name" /></td>
                    <td className="ap-td ap-th--hide-sm"><div className="ap-skeleton ap-skeleton--sm" /></td>
                    <td className="ap-td"><div className="ap-skeleton ap-skeleton--sm" /></td>
                    <td className="ap-td ap-th--hide-sm"><div className="ap-skeleton ap-skeleton--sm" /></td>
                    <td className="ap-td ap-th--hide-sm"><div className="ap-skeleton ap-skeleton--sm" /></td>
                    <td className="ap-td" />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="ap-empty">No products found.</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="ap-tr">
                  <td className="ap-td ap-td--img">
                    {p.images?.[0]?.src
                      ? <img src={p.images[0].src} alt={p.name} className="ap-thumb" />
                      : <div className="ap-thumb ap-thumb--empty" />}
                  </td>
                  <td className="ap-td">
                    <Link to={`/admin/products/${p.id}`} className="ap-product-name">{p.name}</Link>
                    {p.sku && <span className="ap-sku">SKU: {p.sku}</span>}
                  </td>
                  <td className="ap-td ap-th--hide-sm ap-text-muted">{getBrand(p)}</td>
                  <td className="ap-td">
                    {p.sale_price && parseFloat(p.sale_price) > 0 ? (
                      <span className="ap-sale-price">{formatPrice(parseFloat(p.sale_price))}</span>
                    ) : (
                      <span>{formatPrice(parseFloat(p.price || p.regular_price || 0))}</span>
                    )}
                  </td>
                  <td className="ap-td ap-th--hide-sm">
                    <span className={`ap-badge ${STOCK_CLASS[p.stock_status] || ''}`}>
                      {STOCK_LABEL[p.stock_status] || p.stock_status}
                    </span>
                  </td>
                  <td className="ap-td ap-th--hide-sm">
                    <span className={`ap-badge ${p.status === 'publish' ? 'ap-badge--green' : 'ap-badge--gray'}`}>
                      {p.status === 'publish' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="ap-td ap-td--actions">
                    <Link to={`/admin/products/${p.id}`} className="ap-action-btn" title="Edit">
                      <Edit2 size={14} />
                    </Link>
                    <button
                      className="ap-action-btn ap-action-btn--delete"
                      onClick={() => handleDelete(p)}
                      disabled={deleting === p.id}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="ap-pagination">
            <button className="ap-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={15} />
            </button>
            <span className="ap-page-info">Page {page} of {totalPages}</span>
            <button className="ap-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
