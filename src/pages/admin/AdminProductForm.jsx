import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminProductForm.css';

const EMPTY_FORM = {
  name: '',
  sku: '',
  brand: '',
  regular_price: '',
  sale_price: '',
  short_description: '',
  stock_status: 'instock',
  status: 'publish',
  categories: [],
  tags: '',
};

function formFromProduct(p) {
  const brand = p.brands?.[0]?.name
    ?? p.attributes?.find(a => ['brand', 'pa_brand', 'Brand'].includes(a.name))?.options?.[0]
    ?? '';
  return {
    name:              p.name || '',
    sku:               p.sku  || '',
    brand,
    regular_price:     p.regular_price || '',
    sale_price:        p.sale_price    || '',
    short_description: (p.short_description || '').replace(/<[^>]+>/g, ''),
    stock_status:      p.stock_status  || 'instock',
    status:            p.status        || 'publish',
    categories:        (p.categories || []).map(c => c.id),
    tags:              (p.tags || []).map(t => t.name).join(', '),
  };
}

function buildPayload(form) {
  const payload = {
    name:              form.name,
    sku:               form.sku,
    regular_price:     form.regular_price,
    sale_price:        form.sale_price || '',
    short_description: form.short_description,
    stock_status:      form.stock_status,
    status:            form.status,
    categories:        form.categories.map(id => ({ id })),
    tags:              form.tags.split(',').map(t => ({ name: t.trim() })).filter(t => t.name),
  };
  if (form.brand) {
    payload.attributes = [{
      name: 'Brand',
      visible: true,
      options: [form.brand],
    }];
  }
  return payload;
}

export default function AdminProductForm() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const isNew     = !id;
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [form, setForm]         = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    fetchCategories();
    if (!isNew) fetchProduct();
  }, [id]);

  async function fetchCategories() {
    try {
      const res  = await adminFetch('/api/admin/categories');
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setCategories(data);
    } catch { /* non-fatal */ }
  }

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`);
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      setForm(formFromProduct(data));
    } catch {
      setError('Failed to load product.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function toggleCategory(catId) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(catId)
        ? f.categories.filter(c => c !== catId)
        : [...f.categories, catId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const res = isNew
        ? await adminFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
        : await adminFetch(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed.'); return; }
      if (isNew) {
        navigate(`/admin/products/${data.id}`, { replace: true });
      } else {
        setSuccess('Product saved.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) navigate('/admin/products', { replace: true });
      else setError('Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  }

  // Build hierarchical category tree for display
  const topCats  = categories.filter(c => c.parent === 0);
  const childMap = categories.reduce((acc, c) => {
    if (c.parent !== 0) { (acc[c.parent] = acc[c.parent] || []).push(c); }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="af-page" data-admin-theme={theme}>
        <AdminHeader theme={theme} onToggleTheme={toggleTheme} />
        <main className="af-main"><div className="af-loading">Loading…</div></main>
      </div>
    );
  }

  return (
    <div className="af-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      <main className="af-main">
        <div className="af-breadcrumb">
          <Link to="/admin/products" className="af-back">
            <ArrowLeft size={14} /> Products
          </Link>
          <span className="af-breadcrumb-sep">/</span>
          <span>{isNew ? 'New Product' : form.name || `Product #${id}`}</span>
        </div>

        <form className="af-form" onSubmit={handleSubmit}>
          <div className="af-form-layout">
            {/* ── Main column ── */}
            <div className="af-col-main">
              {error   && <div className="af-alert af-alert--error">{error}</div>}
              {success && <div className="af-alert af-alert--success">{success}</div>}

              <div className="af-card">
                <h2 className="af-card-title">Product Details</h2>
                <div className="af-field">
                  <label className="af-label">Product Name <span className="af-required">*</span></label>
                  <input className="af-input" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="af-row">
                  <div className="af-field">
                    <label className="af-label">Brand</label>
                    <input className="af-input" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Skunk2" />
                  </div>
                  <div className="af-field">
                    <label className="af-label">SKU</label>
                    <input className="af-input" name="sku" value={form.sku} onChange={handleChange} placeholder="e.g. SK2-306-05-0260" />
                  </div>
                </div>
                <div className="af-field">
                  <label className="af-label">Short Description</label>
                  <textarea className="af-textarea" name="short_description" value={form.short_description} onChange={handleChange} rows={4} placeholder="Brief product description…" />
                </div>
                <div className="af-field">
                  <label className="af-label">Tags <span className="af-hint">(comma separated)</span></label>
                  <input className="af-input" name="tags" value={form.tags} onChange={handleChange} placeholder="e.g. k-series, civic, intake" />
                </div>
              </div>

              <div className="af-card">
                <h2 className="af-card-title">Categories</h2>
                {categories.length === 0 ? (
                  <p className="af-muted">Loading categories…</p>
                ) : (
                  <div className="af-cat-grid">
                    {topCats.map(top => (
                      <div key={top.id} className="af-cat-group">
                        <label className="af-cat-check af-cat-check--top">
                          <input
                            type="checkbox"
                            checked={form.categories.includes(top.id)}
                            onChange={() => toggleCategory(top.id)}
                          />
                          {top.name}
                        </label>
                        {(childMap[top.id] || []).map(child => (
                          <label key={child.id} className="af-cat-check af-cat-check--child">
                            <input
                              type="checkbox"
                              checked={form.categories.includes(child.id)}
                              onChange={() => toggleCategory(child.id)}
                            />
                            {child.name}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Side column ── */}
            <div className="af-col-side">
              <div className="af-card">
                <h2 className="af-card-title">Publish</h2>
                <div className="af-field">
                  <label className="af-label">Status</label>
                  <select className="af-select" name="status" value={form.status} onChange={handleChange}>
                    <option value="publish">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="af-field">
                  <label className="af-label">Stock Status</label>
                  <select className="af-select" name="stock_status" value={form.stock_status} onChange={handleChange}>
                    <option value="instock">In Stock</option>
                    <option value="outofstock">Out of Stock</option>
                    <option value="onbackorder">On Backorder</option>
                  </select>
                </div>
                <div className="af-save-actions">
                  <button className="af-btn-save" type="submit" disabled={saving}>
                    <Save size={14} /> {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
                  </button>
                  {!isNew && (
                    <button
                      className="af-btn-delete"
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Product'}
                    </button>
                  )}
                </div>
              </div>

              <div className="af-card">
                <h2 className="af-card-title">Pricing</h2>
                <div className="af-field">
                  <label className="af-label">Regular Price ($)</label>
                  <input
                    className="af-input"
                    type="number"
                    name="regular_price"
                    value={form.regular_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="af-field">
                  <label className="af-label">Sale Price ($) <span className="af-hint">optional</span></label>
                  <input
                    className="af-input"
                    type="number"
                    name="sale_price"
                    value={form.sale_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
