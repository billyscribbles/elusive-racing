import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { getWholesalePrice } from '../hooks/useWholesalePrice';
import { CATEGORIES, getCategoryDescendantSlugs } from '../data/categories';
import { queryWholesaleProducts, getAllBrands } from '../lib/meilisearch';
import { getProductVariants } from '../lib/woocommerce';
import { formatPrice } from '../lib/formatPrice';
import './WholesaleOrderPage.css';

const PER_PAGE = 50;

export default function WholesaleOrderPage() {
  const user = useAuthStore((s) => s.user);
  const { addItems, openCart } = useCartStore();

  // Search + filters
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('a-z');
  const [page, setPage] = useState(1);

  // Data
  const [hits, setHits] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Quantities: { [productId]: number } or { [productId__variantId]: number }
  const [quantities, setQuantities] = useState({});

  // Variant data cache: { [productId]: variant[] }
  const [variantCache, setVariantCache] = useState({});
  const [variantLoading, setVariantLoading] = useState({});

  // Selected variant per product: { [productId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState({});

  // Toast
  const [toast, setToast] = useState(null);

  // Brands extracted from results for filter dropdown
  const [allBrands, setAllBrands] = useState([]);
  const brandsLoaded = useRef(false);

  // Brand combobox (searchable dropdown)
  const [brandSearch, setBrandSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandHighlight, setBrandHighlight] = useState(0);
  const brandComboRef = useRef(null);

  // Keep input text synced with the committed brand filter
  useEffect(() => {
    setBrandSearch(brand);
  }, [brand]);

  // Close the brand dropdown when clicking outside
  useEffect(() => {
    if (!brandOpen) return;
    const handler = (e) => {
      if (brandComboRef.current && !brandComboRef.current.contains(e.target)) {
        setBrandOpen(false);
        setBrandSearch(brand);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [brandOpen, brand]);

  const filteredBrands = allBrands.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const commitBrand = (value) => {
    setBrand(value);
    setBrandSearch(value);
    setBrandOpen(false);
  };

  // Sticky thead: measure sticky-top height and pass as CSS var
  const stickyTopRef = useRef(null);
  const tableWrapperRef = useRef(null);

  useEffect(() => {
    const el = stickyTopRef.current;
    const wrapper = tableWrapperRef.current;
    if (!el || !wrapper) return;
    const update = () => wrapper.style.setProperty('--sticky-top-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Load the full brand list on first mount (paginated across the whole index)
  useEffect(() => {
    if (brandsLoaded.current) return;
    brandsLoaded.current = true;
    getAllBrands().then((brands) => {
      setAllBrands(brands);
    }).catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const catSlugs = category ? getCategoryDescendantSlugs(category) : [];
      const res = await queryWholesaleProducts({
        query: debouncedQuery,
        page,
        perPage: PER_PAGE,
        brands: brand ? [brand] : [],
        categories: catSlugs,
        inStock: inStockOnly,
        sort,
      });
      setHits(res.hits);
      setTotalHits(res.totalHits);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Wholesale fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, brand, category, inStockOnly, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [brand, category, inStockOnly, sort]);

  // ── Variant loading ────────────────────────────────────────────────────────

  const loadVariants = useCallback(async (productId) => {
    if (variantCache[productId] || variantLoading[productId]) return;
    setVariantLoading((prev) => ({ ...prev, [productId]: true }));
    try {
      const variants = await getProductVariants(productId);
      setVariantCache((prev) => ({ ...prev, [productId]: variants }));
      // Auto-select first available variant
      const first = variants.find((v) => v.availableForSale) || variants[0];
      if (first) {
        setSelectedVariants((prev) => ({ ...prev, [productId]: first.id }));
      }
    } catch (err) {
      console.error('Failed to load variants for', productId, err);
    } finally {
      setVariantLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }, [variantCache, variantLoading]);

  // ── Quantity helpers ───────────────────────────────────────────────────────

  const getQtyKey = (product) => {
    if (product.hasVariants) {
      const variantId = selectedVariants[product.id];
      return variantId ? `${product.id}__${variantId}` : null;
    }
    return product.id;
  };

  const getQty = (product) => {
    const key = getQtyKey(product);
    return key ? quantities[key] || 0 : 0;
  };

  const getMaxStock = (product) => {
    if (product.hasVariants) {
      const variantId = selectedVariants[product.id];
      const variant = variantCache[product.id]?.find((v) => v.id === variantId);
      return variant?.stockQuantity ?? null;
    }
    return product.stockQuantity ?? null;
  };

  const tierKey = user?.wholesaleTier?.role || 'wholesale_customer';

  const getDisplayPrice = (product) => {
    let retail, wsPrices;
    if (product.hasVariants) {
      const variantId = selectedVariants[product.id];
      const variant = variantCache[product.id]?.find((v) => v.id === variantId);
      if (variant) {
        retail = variant.regularPrice || variant.price;
        wsPrices = variant.wholesalePrices;
      }
    }
    if (!retail) {
      retail = product.regularPrice || product.price;
      wsPrices = product.wholesalePrices;
    }
    const { effectivePrice, isWholesalePrice } = getWholesalePrice(retail, wsPrices, tierKey);
    return {
      wholesale: isWholesalePrice ? effectivePrice : null,
      retail,
      price: effectivePrice,
    };
  };

  const isOutOfStock = (product) => {
    if (product.hasVariants) {
      const variantId = selectedVariants[product.id];
      const variant = variantCache[product.id]?.find((v) => v.id === variantId);
      if (variant) return !variant.availableForSale;
      // If no variants loaded yet, check product-level
    }
    return product.stockStatus === 'outofstock';
  };

  const setQty = (product, value) => {
    const key = getQtyKey(product);
    if (!key) return;
    const max = getMaxStock(product);
    const clamped = max !== null ? Math.min(Math.max(0, value), max) : Math.max(0, value);
    setQuantities((prev) => ({ ...prev, [key]: clamped }));
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const getSelectedItems = () => {
    const items = [];
    for (const [key, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      const [productId, variantId] = key.split('__');
      const product = hits.find((h) => h.id === productId);
      if (!product) continue;

      const { price: displayPrice } = getDisplayPrice(product);
      let stockQuantity, title, image, retail;
      if (variantId) {
        const variant = variantCache[productId]?.find((v) => v.id === variantId);
        stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
        title = `${product.title} - ${variant?.title || ''}`;
        retail = variant?.regularPrice || variant?.price || product.regularPrice || product.price;
        image = product.imageUrl;
      } else {
        stockQuantity = product.stockQuantity;
        title = product.title;
        retail = product.regularPrice || product.price;
        image = product.imageUrl;
      }

      items.push({
        id: productId,
        variantId: variantId || productId,
        title,
        price: displayPrice,
        retailPrice: retail,
        wholesalePrices: product.wholesalePrices,
        quantity: qty,
        sku: product.sku,
        stockQuantity,
        image,
        href: `/products/${product.handle}`,
      });
    }
    return items;
  };

  const totalItems = Object.values(quantities).filter((q) => q > 0).length;
  const totalUnits = Object.values(quantities).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);

  const handleAddToCart = () => {
    const items = getSelectedItems();
    if (!items.length) return;
    addItems(items);
    setQuantities({});
    openCart();
    setToast(`${items.length} item${items.length > 1 ? 's' : ''} added to cart`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleClearAll = () => setQuantities({});

  // Per-row quick add to cart
  const [rowAdded, setRowAdded] = useState({});

  const handleRowAddToCart = (product) => {
    const qty = getQty(product);
    if (qty <= 0) return;
    const key = getQtyKey(product);
    const [productId, variantId] = key.split('__');

    const { price: displayPrice } = getDisplayPrice(product);
    let stockQuantity, title, image, retail;
    if (variantId && variantId !== productId) {
      const variant = variantCache[productId]?.find((v) => v.id === variantId);
      stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
      title = `${product.title} - ${variant?.title || ''}`;
      retail = variant?.regularPrice || variant?.price || product.regularPrice || product.price;
      image = product.imageUrl;
    } else {
      stockQuantity = product.stockQuantity;
      title = product.title;
      retail = product.regularPrice || product.price;
      image = product.imageUrl;
    }

    addItems([{
      id: productId,
      variantId: variantId || productId,
      title,
      price: displayPrice,
      retailPrice: retail,
      wholesalePrices: product.wholesalePrices,
      quantity: qty,
      sku: product.sku,
      stockQuantity,
      image,
      href: `/products/${product.handle}`,
    }]);

    // Clear qty for this row
    setQuantities((prev) => ({ ...prev, [key]: 0 }));
    setRowAdded((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => setRowAdded((prev) => ({ ...prev, [product.id]: false })), 1500);
  };

  // ── Stock badge helper ─────────────────────────────────────────────────────

  const renderStock = (product) => {
    const stock = product.hasVariants
      ? variantCache[product.id]?.find((v) => v.id === selectedVariants[product.id])?.stockQuantity ?? product.stockQuantity
      : product.stockQuantity;
    if (isOutOfStock(product) || stock === 0) {
      return <span className="wholesale-stock stock-out">Not Available</span>;
    }
    if (stock === null || stock === undefined) {
      return <span className="wholesale-stock stock-high">In Stock</span>;
    }
    if (stock <= 5) return <span className="wholesale-stock stock-low">{stock} In Stock</span>;
    return <span className="wholesale-stock stock-high">{stock} In Stock</span>;
  };

  // ── Price render ───────────────────────────────────────────────────────────

  const renderPrice = (product) => {
    const { wholesale, retail, price } = getDisplayPrice(product);
    if (wholesale && wholesale !== retail) {
      return (
        <div className="wholesale-price-cell">
          <div className="wholesale-price-row">
            <span className="wholesale-price-ws">{formatPrice(wholesale)}</span>
            <span className="wholesale-price-retail">{formatPrice(retail)}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="wholesale-price-cell">
        <span className="wholesale-price-same">{formatPrice(price || 0)}</span>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="wholesale-page">
      <div className="wholesale-container">
        {/* Sticky top section: header + search/filters */}
        <div className="wholesale-sticky-top" ref={stickyTopRef}>
          <div className="wholesale-header">
            <h1>Wholesale Orders</h1>
            <p className="wholesale-greeting">
              Welcome back, {user?.firstName || 'Wholesale Customer'}
            </p>
          </div>

          {/* Search + Filters */}
          <div className="wholesale-controls">
          <div className="wholesale-search">
            <Search className="wholesale-search-icon" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="wholesale-brand-combo" ref={brandComboRef}>
            <input
              type="text"
              className="wholesale-filter-select wholesale-brand-combo-input"
              placeholder="All Brands"
              value={brandSearch}
              onFocus={(e) => {
                setBrandOpen(true);
                setBrandHighlight(0);
                e.target.select();
              }}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                setBrandOpen(true);
                setBrandHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setBrandOpen(true);
                  setBrandHighlight((h) => Math.min(h + 1, filteredBrands.length));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setBrandHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (brandHighlight === 0) {
                    commitBrand('');
                  } else {
                    const pick = filteredBrands[brandHighlight - 1];
                    if (pick) commitBrand(pick);
                  }
                } else if (e.key === 'Escape') {
                  setBrandOpen(false);
                  setBrandSearch(brand);
                }
              }}
              role="combobox"
              aria-expanded={brandOpen}
              aria-autocomplete="list"
              aria-controls="wholesale-brand-listbox"
            />
            {brandSearch && (
              <button
                type="button"
                className="wholesale-brand-combo-clear"
                onClick={() => commitBrand('')}
                aria-label="Clear brand filter"
              >
                ×
              </button>
            )}
            {brandOpen && (
              <ul
                className="wholesale-brand-combo-list"
                id="wholesale-brand-listbox"
                role="listbox"
              >
                <li
                  role="option"
                  aria-selected={brand === ''}
                  className={`wholesale-brand-combo-option ${brand === '' ? 'is-selected' : ''} ${brandHighlight === 0 ? 'is-highlight' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); commitBrand(''); }}
                  onMouseEnter={() => setBrandHighlight(0)}
                >
                  All Brands
                </li>
                {filteredBrands.map((b, i) => (
                  <li
                    key={b}
                    role="option"
                    aria-selected={brand === b}
                    className={`wholesale-brand-combo-option ${brand === b ? 'is-selected' : ''} ${brandHighlight === i + 1 ? 'is-highlight' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); commitBrand(b); }}
                    onMouseEnter={() => setBrandHighlight(i + 1)}
                  >
                    {b}
                  </li>
                ))}
                {filteredBrands.length === 0 && (
                  <li className="wholesale-brand-combo-empty">No brands match</li>
                )}
              </ul>
            )}
          </div>

          <select
            className="wholesale-filter-select wholesale-filter-select--category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((top) => (
              <optgroup key={top.slug} label={top.name}>
                <option value={top.slug}>{top.name} (All)</option>
                {(top.children ?? []).map((mid) => (
                  <option key={mid.slug} value={mid.slug}>{mid.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <label className={`wholesale-stock-toggle ${inStockOnly ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            In Stock Only
          </label>

          <select
            className="wholesale-filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ minWidth: 130 }}
          >
            <option value="a-z">Name A-Z</option>
            <option value="z-a">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="wholesale-loading">
            <div className="spinner" />
            <div>Loading products...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && hits.length === 0 && (
          <div className="wholesale-empty">
            No products found{debouncedQuery ? ` for "${debouncedQuery}"` : ''}.
          </div>
        )}

        {/* Product Table */}
        {!loading && hits.length > 0 && (
          <div className="wholesale-table-wrapper" ref={tableWrapperRef}>
            <table className="wholesale-table">
              <thead>
                <tr>
                  <th className="col-img"></th>
                  <th className="col-sku">SKU</th>
                  <th className="col-name">Product</th>
                  <th className="col-variant">Variant</th>
                  <th className="col-brand">Brand</th>
                  <th className="col-stock">Stock</th>
                  <th className="col-price">Price</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-action"></th>
                </tr>
              </thead>
              <tbody>
                {hits.map((product) => {
                  const qty = getQty(product);
                  const oos = isOutOfStock(product);
                  const variants = variantCache[product.id];
                  const isLoadingVariants = variantLoading[product.id];

                  return (
                    <tr
                      key={product.id}
                      className={`${qty > 0 ? 'row-active' : ''} ${oos ? 'row-out-of-stock' : ''}`}
                    >
                      {/* Image */}
                      <td className="cell-img">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.imageAlt || product.title}
                            className="wholesale-thumb"
                            loading="lazy"
                            width={36}
                            height={36}
                          />
                        ) : (
                          <div className="wholesale-thumb" />
                        )}
                      </td>

                      {/* SKU */}
                      <td className="cell-sku">
                        <span className="wholesale-sku">{product.sku || '—'}</span>
                      </td>

                      {/* Product name */}
                      <td className="cell-name">
                        <div className="wholesale-product-name">
                          <Link to={`/products/${product.handle}`}>{product.title}</Link>
                        </div>
                        {product.description && (
                          <div className="wholesale-product-desc">{product.description}</div>
                        )}
                        {/* Mobile meta */}
                        <div className="wholesale-mobile-meta">
                          <span>{product.sku || '—'}</span>
                          {product.vendor && <span>{product.vendor}</span>}
                        </div>
                      </td>

                      {/* Variant */}
                      <td className="cell-variant">
                        {product.hasVariants ? (
                          <>
                            {!variants && !isLoadingVariants && (
                              <button
                                className="wholesale-load-variants-btn"
                                onClick={() => loadVariants(product.id)}
                              >
                                Select variant ▾
                              </button>
                            )}
                            {isLoadingVariants && (
                              <div className="wholesale-variant-loading">Loading variants...</div>
                            )}
                            {variants && (
                              <select
                                className="wholesale-variant-select"
                                value={selectedVariants[product.id] || ''}
                                onChange={(e) => {
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }));
                                }}
                              >
                                {variants.map((v) => (
                                  <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                                    {v.title}
                                    {v.stockQuantity !== null ? ` (${v.stockQuantity})` : ''}
                                    {!v.availableForSale ? ' — Out of stock' : ''}
                                    {v.wholesalePrice ? ` — ${formatPrice(v.wholesalePrice)}` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Brand */}
                      <td className="cell-brand">
                        <span className="wholesale-brand">{product.vendor || '—'}</span>
                      </td>

                      {/* Stock */}
                      <td className="cell-stock">
                        {renderStock(product)}
                      </td>

                      {/* Price */}
                      <td className="cell-price">
                        {renderPrice(product)}
                      </td>

                      {/* Quantity */}
                      <td className="cell-qty">
                        <div className="wholesale-qty-cell">
                          <div className="wholesale-qty-controls">
                            <button
                              className="wholesale-qty-btn"
                              onClick={() => setQty(product, qty - 1)}
                              disabled={oos || qty <= 0 || (product.hasVariants && !selectedVariants[product.id])}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className="wholesale-qty-input"
                              value={qty}
                              onChange={(e) => setQty(product, parseInt(e.target.value) || 0)}
                              disabled={oos || (product.hasVariants && !selectedVariants[product.id])}
                              min={0}
                              aria-label={`Quantity for ${product.title}`}
                            />
                            <button
                              className="wholesale-qty-btn"
                              onClick={() => setQty(product, qty + 1)}
                              disabled={oos || (product.hasVariants && !selectedVariants[product.id])}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Quick Add to Cart */}
                      <td className="cell-action">
                        <button
                          className={`wholesale-row-cart-btn${rowAdded[product.id] ? ' wholesale-row-cart-btn--added' : ''}`}
                          onClick={() => handleRowAddToCart(product)}
                          disabled={oos || qty <= 0}
                        >
                          {rowAdded[product.id] ? 'Added!' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="wholesale-pagination">
            <button
              className="wholesale-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`wholesale-page-btn ${pageNum === page ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="wholesale-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
            <span className="wholesale-page-info">
              {totalHits} product{totalHits !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {totalItems > 0 && (
        <div className="wholesale-bulk-bar">
          <div className="wholesale-bulk-summary">
            <strong>{totalItems}</strong> item{totalItems !== 1 ? 's' : ''},{' '}
            <strong>{totalUnits}</strong> unit{totalUnits !== 1 ? 's' : ''} total
          </div>
          <div className="wholesale-bulk-actions">
            <button className="wholesale-btn-clear" onClick={handleClearAll}>
              Clear
            </button>
            <button className="wholesale-btn-add-cart" onClick={handleAddToCart}>
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="wholesale-toast">{toast}</div>}
    </div>
  );
}
