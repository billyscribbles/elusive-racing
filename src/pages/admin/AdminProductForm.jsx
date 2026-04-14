import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Upload, X, Image } from "lucide-react";
import { adminFetch, clearAdminAuth, useAdminTheme } from "../../lib/adminAuth";
import AdminHeader from "../../components/admin/AdminHeader";
import RichTextEditor from "../../components/admin/RichTextEditor";
import "./AdminProductForm.css";

const EMPTY_FORM = {
  name: "",
  sku: "",
  brand: "",
  regular_price: "",
  sale_price: "",
  description: "",
  short_description: "",
  manage_stock: false,
  stock_quantity: "",
  stock_status: "instock",
  status: "publish",
  categories: [],
  tags: [],
  images: [],
};

function formFromProduct(p) {
  const brand =
    p.brands?.[0]?.name ??
    p.attributes?.find((a) => ["brand", "pa_brand", "Brand"].includes(a.name))
      ?.options?.[0] ??
    "";
  return {
    name: p.name || "",
    sku: p.sku || "",
    brand,
    regular_price: p.regular_price || "",
    sale_price: p.sale_price || "",
    description: p.description || "",
    short_description: p.short_description || "",
    manage_stock: p.manage_stock || false,
    stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : "",
    stock_status: p.stock_status || "instock",
    status: p.status || "publish",
    categories: (p.categories || []).map((c) => c.id),
    tags: (p.tags || []).map((t) => t.name),
    images: (p.images || []).map((img) => ({
      id: img.id,
      src: img.src,
      alt: img.alt || "",
    })),
  };
}

function buildPayload(form) {
  const payload = {
    name: form.name,
    sku: form.sku,
    regular_price: form.regular_price,
    sale_price: form.sale_price || "",
    description: form.description,
    short_description: form.short_description,
    manage_stock: form.manage_stock,
    stock_status: form.stock_status,
    status: form.status,
    categories: form.categories.map((id) => ({ id })),
    tags: form.tags.map((name) => ({ name })),
    images: form.images.map((img) =>
      img.id ? { id: img.id } : { src: img.src, alt: img.alt },
    ),
  };
  if (form.manage_stock && form.stock_quantity !== "") {
    payload.stock_quantity = parseInt(form.stock_quantity, 10) || 0;
  }
  if (form.brand) {
    payload.attributes = [
      {
        name: "Brand",
        visible: true,
        options: [form.brand],
      },
    ];
  }
  return payload;
}

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const fileInputRef = useRef(null);
  const tagInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    if (!isNew) fetchProduct();
  }, [id]);

  async function fetchTags() {
    try {
      const res = await adminFetch("/api/admin/tags");
      if (res.ok) setAllTags(await res.json());
    } catch {
      /* non-fatal */
    }
  }

  async function fetchCategories() {
    try {
      const res = await adminFetch("/api/admin/categories");
      if (res.status === 401) {
        clearAdminAuth();
        navigate("/admin");
        return;
      }
      const data = await res.json();
      setCategories(data);
    } catch {
      /* non-fatal */
    }
  }

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`);
      if (res.status === 401) {
        clearAdminAuth();
        navigate("/admin");
        return;
      }
      const data = await res.json();
      setForm(formFromProduct(data));
    } catch {
      setError("Failed to load product.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleCategory(catId) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(catId)
        ? f.categories.filter((c) => c !== catId)
        : [...f.categories, catId],
    }));
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImgError("");
    setImgUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await adminFetch("/api/admin/products/upload-image", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImgError(data.error || "Upload failed.");
        return;
      }
      const src = `${window.location.origin}${data.url}`;
      setForm((f) => ({
        ...f,
        images: [...f.images, { src, alt: file.name.replace(/\.[^.]+$/, "") }],
      }));
    } catch {
      setImgError("Upload failed. Check connection.");
    } finally {
      setImgUploading(false);
    }
  }

  function handleRemoveImage(idx) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }));
    setTagSearch("");
  }

  function removeTag(name) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== name) }));
  }

  function toggleTag(name) {
    form.tags.includes(name) ? removeTag(name) : addTag(name);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const res = isNew
        ? await adminFetch("/api/admin/products", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await adminFetch(`/api/admin/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      if (isNew) {
        navigate(`/admin/products/${data.id}`, { replace: true });
      } else {
        setSuccess("Product saved.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${form.name}"? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) navigate("/admin/products", { replace: true });
      else setError("Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  // Tag picker derived state
  const popularTags = allTags.slice(0, 12);
  const tagSearchLower = tagSearch.trim().toLowerCase();
  const tagDropItems = tagSearchLower
    ? allTags
        .filter(
          (t) =>
            t.name.toLowerCase().includes(tagSearchLower) &&
            !form.tags.includes(t.name),
        )
        .slice(0, 8)
    : [];
  const tagSearchIsNew =
    tagSearchLower &&
    !allTags.some((t) => t.name.toLowerCase() === tagSearchLower);

  // Build hierarchical category tree for display
  const topCats = categories.filter((c) => c.parent === 0);
  const childMap = categories.reduce((acc, c) => {
    if (c.parent !== 0) {
      (acc[c.parent] = acc[c.parent] || []).push(c);
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="af-page" data-admin-theme={theme}>
        <AdminHeader theme={theme} onToggleTheme={toggleTheme} />
        <main className="af-main">
          <div className="af-loading">Loading…</div>
        </main>
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
          <span>{isNew ? "New Product" : form.name || `Product #${id}`}</span>
        </div>

        <form className="af-form" onSubmit={handleSubmit}>
          <div className="af-form-layout">
            {/* ── Main column ── */}
            <div className="af-col-main">
              {error && <div className="af-alert af-alert--error">{error}</div>}
              {success && (
                <div className="af-alert af-alert--success">{success}</div>
              )}

              <div className="af-card">
                <h2 className="af-card-title">Product Details</h2>
                <div className="af-field">
                  <label className="af-label">
                    Product Name <span className="af-required">*</span>
                  </label>
                  <input
                    className="af-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="af-row">
                  <div className="af-field">
                    <label className="af-label">Brand</label>
                    <input
                      className="af-input"
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                      placeholder="e.g. Skunk2"
                    />
                  </div>
                  <div className="af-field">
                    <label className="af-label">SKU</label>
                    <input
                      className="af-input"
                      name="sku"
                      value={form.sku}
                      onChange={handleChange}
                      placeholder="e.g. SK2-306-05-0260"
                    />
                  </div>
                </div>
                <div className="af-field">
                  <label className="af-label">Description</label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) =>
                      setForm((f) => ({ ...f, description: html }))
                    }
                    placeholder="Full product description…"
                    height={360}
                    theme={theme}
                  />
                </div>
                <div className="af-field">
                  <label className="af-label">Short Description</label>
                  <RichTextEditor
                    value={form.short_description}
                    onChange={(html) =>
                      setForm((f) => ({ ...f, short_description: html }))
                    }
                    placeholder="Brief summary shown in listings…"
                    height={200}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="af-card">
                <h2 className="af-card-title">Tags</h2>

                <div className="af-field">
                  <label className="af-toggle-label">
                    <input
                      type="checkbox"
                      checked={form.tags.includes("featured")}
                      onChange={() => toggleTag("featured")}
                    />
                    <span>Featured product </span>
                  </label>
                </div>

                {popularTags.length > 0 && (
                  <div className="af-field">
                    <label className="af-label">
                      Popular Tags <span className="af-hint">tick to add</span>
                    </label>
                    <div className="af-tag-pills">
                      {popularTags.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`af-tag-pill${form.tags.includes(t.name) ? " af-tag-pill--on" : ""}`}
                          onClick={() => toggleTag(t.name)}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="af-field">
                  <label className="af-label">Search or Add</label>
                  <div className="af-tag-search-wrap">
                    <input
                      ref={tagInputRef}
                      className="af-input"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(tagSearch);
                        }
                      }}
                      placeholder="Search existing or type a new tag…"
                      autoComplete="off"
                    />
                    {(tagDropItems.length > 0 || tagSearchIsNew) && (
                      <div className="af-tag-dropdown">
                        {tagDropItems.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="af-tag-drop-item"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addTag(t.name)}
                          >
                            {t.name}
                            <span className="af-tag-drop-count">{t.count}</span>
                          </button>
                        ))}
                        {tagSearchIsNew && (
                          <button
                            type="button"
                            className="af-tag-drop-item af-tag-drop-item--new"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addTag(tagSearch)}
                          >
                            + Create "{tagSearch.trim()}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {form.tags.length > 0 && (
                  <div className="af-field">
                    <label className="af-label">Selected</label>
                    <div className="af-tag-chips">
                      {form.tags.map((name) => (
                        <span key={name} className="af-tag-chip">
                          {name}
                          <button type="button" onClick={() => removeTag(name)}>
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="af-card">
                <h2 className="af-card-title">Product Images</h2>
                <div className="af-images-grid">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="af-image-thumb">
                      <img src={img.src} alt={img.alt} />
                      <button
                        type="button"
                        className="af-image-remove"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="af-image-add"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imgUploading}
                  >
                    {imgUploading ? (
                      <span className="af-img-uploading">Uploading…</span>
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Upload Image</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageSelect}
                  />
                </div>
                {imgError && <p className="af-img-error">{imgError}</p>}
                <p className="af-muted" style={{ marginTop: 10 }}>
                  Images are uploaded to your server and synced to WooCommerce
                  when the product is saved.
                </p>
              </div>

              <div className="af-card">
                <h2 className="af-card-title">Categories</h2>
                {categories.length === 0 ? (
                  <p className="af-muted">Loading categories…</p>
                ) : (
                  <div className="af-cat-grid">
                    {topCats.map((top) => (
                      <div key={top.id} className="af-cat-group">
                        <label className="af-cat-check af-cat-check--top">
                          <input
                            type="checkbox"
                            checked={form.categories.includes(top.id)}
                            onChange={() => toggleCategory(top.id)}
                          />
                          {top.name}
                        </label>
                        {(childMap[top.id] || []).map((child) => (
                          <label
                            key={child.id}
                            className="af-cat-check af-cat-check--child"
                          >
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
                  <select
                    className="af-select"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="publish">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="af-save-actions">
                  <button
                    className="af-btn-save"
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={14} />{" "}
                    {saving
                      ? "Saving…"
                      : isNew
                        ? "Create Product"
                        : "Save Changes"}
                  </button>
                  {!isNew && (
                    <button
                      className="af-btn-delete"
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 size={14} />{" "}
                      {deleting ? "Deleting…" : "Delete Product"}
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
                  <label className="af-label">
                    Sale Price ($) <span className="af-hint">optional</span>
                  </label>
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

              <div className="af-card">
                <h2 className="af-card-title">Inventory</h2>
                <div className="af-field">
                  <label className="af-label">Stock Status</label>
                  <select
                    className="af-select"
                    name="stock_status"
                    value={form.stock_status}
                    onChange={handleChange}
                  >
                    <option value="instock">In Stock</option>
                    <option value="outofstock">Out of Stock</option>
                    <option value="onbackorder">On Backorder</option>
                  </select>
                </div>
                <div className="af-field">
                  <label className="af-toggle-label">
                    <input
                      type="checkbox"
                      checked={form.manage_stock}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          manage_stock: e.target.checked,
                        }))
                      }
                    />
                    <span>Track stock quantity</span>
                  </label>
                </div>
                {form.manage_stock && (
                  <div className="af-field">
                    <label className="af-label">Stock Quantity</label>
                    <input
                      className="af-input"
                      type="number"
                      name="stock_quantity"
                      value={form.stock_quantity}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
