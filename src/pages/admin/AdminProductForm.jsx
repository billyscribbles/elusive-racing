import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Upload, X, Image } from "lucide-react";
import { adminFetch, clearAdminAuth, useAdminTheme } from "../../lib/adminAuth";
import AdminHeader from "../../components/admin/AdminHeader";
import RichTextEditor from "../../components/admin/RichTextEditor";
import { getBrands } from "../../lib/woocommerce";
import { vehicleData } from "../../data/navigation";
import "./AdminProductForm.css";

// Attribute names that represent vehicle fitment (match src/lib/woocommerce.js)
const FITMENT_NAMES = [
  "vehicle",
  "vehicles",
  "fitment",
  "compatible",
  "application",
  "fits",
  "make",
  "model",
  "year",
];

const FITMENT_SLOTS = ["Make", "Model", "Year"];

function isBrandAttr(a) {
  return ["brand", "pa_brand"].includes((a.name || "").toLowerCase());
}

function isFitmentSlotAttr(a) {
  const n = (a.name || "").toLowerCase();
  return FITMENT_SLOTS.some((s) => s.toLowerCase() === n);
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  sku: "",
  brand: "",
  regular_price: "",
  sale_price: "",
  description: "",
  short_description: "",
  manage_stock: false,
  stock_quantity: "",
  low_stock_amount: "",
  stock_status: "instock",
  backorders: "no",
  status: "publish",
  weight: "",
  length: "",
  width: "",
  height: "",
  categories: [],
  tags: [],
  images: [],
  fitment: { Make: [], Model: [], Year: [] },
  otherAttributes: [],
};

function formFromProduct(p) {
  const attributes = p.attributes || [];
  const brand =
    p.brands?.[0]?.name ??
    attributes.find(isBrandAttr)?.options?.[0] ??
    "";

  const fitment = { Make: [], Model: [], Year: [] };
  attributes.forEach((a) => {
    const match = FITMENT_SLOTS.find(
      (s) => s.toLowerCase() === (a.name || "").toLowerCase(),
    );
    if (match) fitment[match] = [...(a.options || [])];
  });

  // Anything else (variant taxonomies, other fitment taxonomies, etc.) is
  // preserved verbatim so saving doesn't wipe them.
  const otherAttributes = attributes
    .filter((a) => !isBrandAttr(a) && !isFitmentSlotAttr(a))
    .map((a) => ({
      id: a.id,
      name: a.name,
      position: a.position,
      visible: a.visible,
      variation: a.variation,
      options: a.options || [],
    }));

  return {
    name: p.name || "",
    slug: p.slug || "",
    sku: p.sku || "",
    brand,
    regular_price: p.regular_price || "",
    sale_price: p.sale_price || "",
    description: p.description || "",
    short_description: p.short_description || "",
    manage_stock: p.manage_stock || false,
    stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : "",
    low_stock_amount: p.low_stock_amount != null ? String(p.low_stock_amount) : "",
    stock_status: p.stock_status || "instock",
    backorders: p.backorders || "no",
    status: p.status || "publish",
    weight: p.weight || "",
    length: p.dimensions?.length || "",
    width: p.dimensions?.width || "",
    height: p.dimensions?.height || "",
    categories: (p.categories || []).map((c) => c.id),
    tags: (p.tags || []).map((t) => t.name),
    images: (p.images || []).map((img) => ({
      id: img.id,
      src: img.src,
      alt: img.alt || "",
    })),
    fitment,
    otherAttributes,
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
    backorders: form.backorders || "no",
    status: form.status,
    categories: form.categories.map((id) => ({ id })),
    tags: form.tags.map((name) => ({ name })),
    images: form.images.map((img) =>
      img.id ? { id: img.id } : { src: img.src, alt: img.alt },
    ),
  };
  if (form.manage_stock) {
    if (form.stock_quantity !== "") {
      payload.stock_quantity = parseInt(form.stock_quantity, 10) || 0;
    }
    payload.low_stock_amount =
      form.low_stock_amount === "" ? null : parseInt(form.low_stock_amount, 10) || 0;
  } else {
    payload.stock_status = form.stock_status;
  }
  if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();

  payload.weight = String(form.weight || "").trim();
  payload.dimensions = {
    length: String(form.length || "").trim(),
    width: String(form.width || "").trim(),
    height: String(form.height || "").trim(),
  };

  const attributes = [...(form.otherAttributes || [])];
  if (form.brand) {
    attributes.push({ name: "Brand", visible: true, options: [form.brand] });
  }
  FITMENT_SLOTS.forEach((slot) => {
    const options = (form.fitment?.[slot] || [])
      .map((v) => String(v).trim())
      .filter(Boolean);
    if (options.length) {
      attributes.push({ name: slot, visible: true, options });
    }
  });
  if (attributes.length) payload.attributes = attributes;

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
  const [brands, setBrands] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const fileInputRef = useRef(null);
  const tagInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    getBrands()
      .then((names) => setBrands(names.filter(Boolean).sort()))
      .catch(() => {});
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

  function addFitmentValue(slot, value) {
    const v = value.trim();
    if (!v) return;
    setForm((f) => {
      const current = f.fitment[slot] || [];
      if (current.includes(v)) return f;
      return { ...f, fitment: { ...f.fitment, [slot]: [...current, v] } };
    });
  }

  function removeFitmentValue(slot, value) {
    setForm((f) => ({
      ...f,
      fitment: {
        ...f.fitment,
        [slot]: (f.fitment[slot] || []).filter((o) => o !== value),
      },
    }));
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
        setForm(formFromProduct(data));
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

  // Fitment options — sourced from src/data/navigation.js so the admin picks
  // from the same list the customer-facing vehicle finder uses. Model options
  // cascade from selected Makes; if no Make is selected, all models are shown.
  const selectedMakes = form.fitment.Make || [];
  const modelOptions = (() => {
    const fromMakes = selectedMakes.length
      ? selectedMakes.flatMap(
          (m) => vehicleData.models[String(m).toUpperCase()] || [],
        )
      : Object.values(vehicleData.models).flat();
    return Array.from(new Set(fromMakes));
  })();
  const fitmentOptions = {
    Make: vehicleData.makes,
    Model: modelOptions,
    Year: vehicleData.years,
  };

  // Build hierarchical category tree for display
  const topCats = categories.filter((c) => c.parent === 0);
  const childMap = categories.reduce((acc, c) => {
    if (c.parent !== 0) {
      (acc[c.parent] = acc[c.parent] || []).push(c);
    }
    return acc;
  }, {});

  // Filter categories by search. A top group is visible if its own name
  // matches OR any of its children match. When only children match, the
  // parent stays as context but we hide non-matching siblings.
  const catSearchLower = categorySearch.trim().toLowerCase();
  const catMatches = (name) => name.toLowerCase().includes(catSearchLower);
  const visibleTopCats = catSearchLower
    ? topCats.filter(
        (top) =>
          catMatches(top.name) ||
          (childMap[top.id] || []).some((c) => catMatches(c.name)),
      )
    : topCats;
  const visibleChildren = (top) => {
    const children = childMap[top.id] || [];
    if (!catSearchLower || catMatches(top.name)) return children;
    return children.filter((c) => catMatches(c.name));
  };

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
                <div className="af-field">
                  <label className="af-label">Permalink</label>
                  <div className="af-permalink-preview">
                    https://elusiveracing.com.au/product/
                    <strong>{form.slug || "<auto>"}</strong>
                  </div>
                  <input
                    className="af-input"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="auto-generated from name if left blank"
                  />
                  <div className="af-help">
                    Lowercase, hyphens, no spaces. Changing this breaks any
                    old links to the previous URL — no redirect is set up.
                  </div>
                </div>
                <div className="af-row">
                  <div className="af-field">
                    <label className="af-label">Brand</label>
                    <select
                      className="af-select"
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                    >
                      <option value="">— Select brand —</option>
                      {form.brand && !brands.includes(form.brand) && (
                        <option value={form.brand}>{form.brand}</option>
                      )}
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
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

              {/* Vehicle Fitment */}
              <div className="af-card">
                <h2 className="af-card-title">Vehicle Fitment</h2>
                <p className="af-muted af-fitment-intro">
                  Set which vehicles this product fits. Values show as chips on
                  the product page.
                </p>
                {FITMENT_SLOTS.map((slot) => (
                  <FitmentField
                    key={slot}
                    label={slot}
                    values={form.fitment[slot] || []}
                    options={fitmentOptions[slot]}
                    onAdd={(v) => addFitmentValue(slot, v)}
                    onRemove={(v) => removeFitmentValue(slot, v)}
                  />
                ))}
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
                  <>
                    <div className="af-cat-search-wrap">
                      <input
                        type="search"
                        className="af-input af-cat-search"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search categories…"
                        autoComplete="off"
                      />
                      {categorySearch && (
                        <button
                          type="button"
                          className="af-cat-search-clear"
                          onClick={() => setCategorySearch("")}
                          title="Clear search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <div className="af-cat-grid">
                      {visibleTopCats.length === 0 ? (
                        <p className="af-muted" style={{ padding: "8px 4px" }}>
                          No matches.
                        </p>
                      ) : (
                        visibleTopCats.map((top) => (
                          <div key={top.id} className="af-cat-group">
                            <label className="af-cat-check af-cat-check--top">
                              <input
                                type="checkbox"
                                checked={form.categories.includes(top.id)}
                                onChange={() => toggleCategory(top.id)}
                              />
                              {top.name}
                            </label>
                            {visibleChildren(top).map((child) => (
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
                        ))
                      )}
                    </div>
                  </>
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
                {form.manage_stock ? (
                  <>
                    <div className="af-field">
                      <label className="af-label">Quantity</label>
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
                    <div className="af-field">
                      <label className="af-label">Allow backorders?</label>
                      <div className="af-radio-group">
                        {[
                          { value: "no", label: "Do not allow" },
                          { value: "notify", label: "Allow, but notify customer" },
                          { value: "yes", label: "Allow" },
                        ].map((opt) => (
                          <label key={opt.value} className="af-radio-label">
                            <input
                              type="radio"
                              name="backorders"
                              value={opt.value}
                              checked={form.backorders === opt.value}
                              onChange={handleChange}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="af-field">
                      <label className="af-label">Low stock threshold</label>
                      <input
                        className="af-input"
                        type="number"
                        name="low_stock_amount"
                        value={form.low_stock_amount}
                        onChange={handleChange}
                        min="0"
                        step="1"
                        placeholder="Store-wide threshold"
                      />
                    </div>
                  </>
                ) : (
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
                )}
              </div>

              <div className="af-card">
                <h2 className="af-card-title">Shipping</h2>
                <div className="af-field">
                  <label className="af-label">Weight (kg)</label>
                  <input
                    className="af-input"
                    type="number"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="af-help">
                    Used for freight calculation. Australia Post rates depend on this.
                  </div>
                </div>
                <div className="af-row">
                  <div className="af-field">
                    <label className="af-label">Length (cm)</label>
                    <input
                      className="af-input"
                      type="number"
                      name="length"
                      value={form.length}
                      onChange={handleChange}
                      min="0"
                      step="0.1"
                      placeholder="0"
                    />
                  </div>
                  <div className="af-field">
                    <label className="af-label">Width (cm)</label>
                    <input
                      className="af-input"
                      type="number"
                      name="width"
                      value={form.width}
                      onChange={handleChange}
                      min="0"
                      step="0.1"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="af-field">
                  <label className="af-label">Height (cm)</label>
                  <input
                    className="af-input"
                    type="number"
                    name="height"
                    value={form.height}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    placeholder="0"
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

function FitmentField({ label, values, options, onAdd, onRemove }) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const selected = new Set(values.map((v) => String(v).toLowerCase()));
  const searchLower = search.trim().toLowerCase();
  const dropItems = options
    .filter((o) => !selected.has(String(o).toLowerCase()))
    .filter((o) => !searchLower || String(o).toLowerCase().includes(searchLower))
    .slice(0, 12);

  return (
    <div className="af-field">
      <label className="af-label">
        {label} <span className="af-hint">Select from list</span>
      </label>
      <div className="af-tag-search-wrap">
        <input
          className="af-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Search ${label.toLowerCase()}…`}
          autoComplete="off"
        />
        {focused && (
          <div className="af-tag-dropdown">
            {dropItems.length > 0 ? (
              dropItems.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="af-tag-drop-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAdd(o);
                    setSearch("");
                  }}
                >
                  {o}
                </button>
              ))
            ) : (
              <div className="af-tag-drop-empty">No matches</div>
            )}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div className="af-tag-chips af-fitment-chips">
          {values.map((v) => (
            <span key={v} className="af-tag-chip">
              {v}
              <button type="button" onClick={() => onRemove(v)}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
