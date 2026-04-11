import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { queryWholesaleProducts } from '../lib/meilisearch';
import { getProductVariants } from '../lib/woocommerce';
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

  // Brands + categories extracted from results for filter dropdowns
  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const brandsLoaded = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Load brand/category lists on first mount (empty query, no filters, large batch)
  useEffect(() => {
    if (brandsLoaded.current) return;
    brandsLoaded.current = true;
    queryWholesaleProducts({ perPage: 1000 }).then((res) => {
      const brands = [...new Set(res.hits.map((h) => h.vendor).filter(Boolean))].sort();
      const cats = [...new Set(res.hits.flatMap((h) => h.categories || []).filter(Boolean))].sort();
      setAllBrands(brands);
      setAllCategories(cats);
    }).catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await queryWholesaleProducts({
        query: debouncedQuery,
        page,
        perPage: PER_PAGE,
        brands: brand ? [brand] : [],
        categories: category ? [category] : [],
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
    if (product.hasVariants) {
      const variantId = selectedVariants[product.id];
      const variant = variantCache[product.id]?.find((v) => v.id === variantId);
      if (variant) {
        const ws = variant.wholesalePrices?.[tierKey] ?? variant.wholesalePrice;
        return {
          wholesale: ws,
          retail: variant.regularPrice || variant.price,
          price: ws || variant.price,
        };
      }
    }
    const ws = product.wholesalePrices?.[tierKey] ?? product.wholesalePrice;
    return {
      wholesale: ws,
      retail: product.regularPrice || product.price,
      price: ws || product.price,
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

      let price, stockQuantity, title, image;
      if (variantId) {
        const variant = variantCache[productId]?.find((v) => v.id === variantId);
        price = variant?.wholesalePrice || variant?.price || product.wholesalePrice || product.price;
        stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
        title = `${product.title} - ${variant?.title || ''}`;
        image = product.imageUrl;
      } else {
        price = product.wholesalePrice || product.price;
        stockQuantity = product.stockQuantity;
        title = product.title;
        image = product.imageUrl;
      }

      items.push({
        id: productId,
        variantId: variantId || productId,
        title,
        price,
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

    let price, stockQuantity, title, image;
    if (variantId && variantId !== productId) {
      const variant = variantCache[productId]?.find((v) => v.id === variantId);
      const { price: displayPrice } = getDisplayPrice(product);
      price = displayPrice;
      stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
      title = `${product.title} - ${variant?.title || ''}`;
      image = product.imageUrl;
    } else {
      const { price: displayPrice } = getDisplayPrice(product);
      price = displayPrice;
      stockQuantity = product.stockQuantity;
      title = product.title;
      image = product.imageUrl;
    }

    addItems([{
      id: productId,
      variantId: variantId || productId,
      title,
      price,
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
    if (isOutOfStock(product)) {
      return <span className="wholesale-stock stock-out">Out</span>;
    }
    const stock = product.hasVariants
      ? variantCache[product.id]?.find((v) => v.id === selectedVariants[product.id])?.stockQuantity ?? product.stockQuantity
      : product.stockQuantity;
    if (stock === null || stock === undefined) {
      return <span className="wholesale-stock stock-high">In Stock</span>;
    }
    if (stock <= 5) return <span className="wholesale-stock stock-low">{stock}</span>;
    return <span className="wholesale-stock stock-high">{stock}</span>;
  };

  // ── Price render ───────────────────────────────────────────────────────────

  const renderPrice = (product) => {
    const { wholesale, retail, price } = getDisplayPrice(product);
    if (wholesale && wholesale !== retail) {
      const pct = Math.round(((retail - wholesale) / retail) * 100);
      return (
        <div className="wholesale-price-cell">
          <span className="wholesale-price-ws">${wholesale.toFixed(2)}</span>
          <span className="wholesale-price-retail">${retail.toFixed(2)}</span>
          {pct > 0 && <span className="wholesale-price-savings">{pct}% off</span>}
        </div>
      );
    }
    return (
      <div className="wholesale-price-cell">
        <span className="wholesale-price-same">${(price || 0).toFixed(2)}</span>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="wholesale-page">
      <div className="wholesale-container">
        {/* Header */}
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

          <select
            className="wholesale-filter-select"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">All Brands</option>
            {allBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="wholesale-filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
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
          <div className="wholesale-table-wrapper">
            <table className="wholesale-table">
              <thead>
                <tr>
                  <th className="col-img"></th>
                  <th className="col-sku">SKU</th>
                  <th className="col-name">Product</th>
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

                      {/* Product name + variant selector */}
                      <td className="cell-name">
                        <div className="wholesale-product-name">
                          <Link to={`/products/${product.handle}`}>{product.title}</Link>
                        </div>
                        {/* Mobile meta */}
                        <div className="wholesale-mobile-meta">
                          <span>{product.sku || '—'}</span>
                          {product.vendor && <span>{product.vendor}</span>}
                        </div>
                        {/* Variant selector */}
                        {product.hasVariants && (
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
                                    {v.wholesalePrice ? ` — $${v.wholesalePrice.toFixed(2)}` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        )}
                      </td>

                      {/* Brand */}
                      <td className="cell-brand">
                        <span className="wholesale-brand">{product.vendor || '—'}</span>
                      </td>

                      {/* Stock */}
                      <td className="cell-stock">
                        {/* Mobile: price + stock inline */}
                        <div className="wholesale-mobile-row">
                          {renderStock(product)}
                          <span className="wholesale-mobile-price">{renderPrice(product)}</span>
                        </div>
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
