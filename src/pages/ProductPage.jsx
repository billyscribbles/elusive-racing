import { useParams, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Package, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProductByHandle, getProducts, prefetchProduct } from '../lib/woocommerce';
import { getProductByHandle as getMeiliProduct } from '../lib/meilisearch';
import useCartStore from '../store/cartStore';
import { brands as BRAND_LIST } from '../data/navigation';
import './ProductPage.css';

function mapProduct(p) {
  const price = parseFloat(p.priceRange.minVariantPrice.amount) || 0;
  const compareAt = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount) || 0;
  const variants = p.variants ?? [];
  const isDefaultOnly = variants.length === 1 && variants[0].title === 'Default';
  const hasVariants = variants.length > 1 || (variants.length === 1 && !isDefaultOnly);
  return {
    id: p.id,
    name: p.title,
    brand: p.vendor || '',
    sku: p.sku || '',
    price,
    originalPrice: compareAt > price ? compareAt : null,
    image: p.featuredImage?.url ?? null,
    href: `/products/${p.handle}`,
    description: p.descriptionHtml || p.description || '',
    weight: p.weight || null,
    dimensions: p.dimensions || null,
    vehicleAttributes: p.vehicleAttributes ?? [],
    tags: p.tags ?? [],
    categories: p.categories ?? [],
    // auto-select the only variant when there's no real choice
    variantId: isDefaultOnly ? variants[0].id : null,
    variants,
    hasVariants,
    backorder: p.stockStatus === 'onbackorder',
    inStock: p.stockStatus === 'instock',
    _isVariable: p._isVariable ?? false,
  };
}

// Map a Meilisearch hit into the same shape mapProduct returns.
// Only fields available in Meilisearch — variants/weight/fitment will be null.
function mapMeiliProduct(h) {
  const price = h.price || 0;
  const compareAt = h.regularPrice || 0;
  return {
    id: String(h.id),
    name: h.title,
    brand: h.vendor || '',
    sku: h.sku || '',
    price,
    originalPrice: compareAt > price ? compareAt : null,
    image: h.imageUrl || null,
    href: `/products/${h.handle}`,
    description: h.description || '',
    weight: null,
    dimensions: null,
    vehicleAttributes: [],
    tags: h.tags ?? [],
    categories: (h.categories ?? []).map((name, i) => ({
      id: String(i),
      title: name,
      handle: (h.categoryHandles ?? [])[i] || name.toLowerCase().replace(/\s+/g, '-'),
    })),
    variantId: null,
    variants: [],
    hasVariants: h.hasVariants ?? false,
    _isVariable: h.hasVariants ?? false,
    backorder: h.stockStatus === 'onbackorder',
    inStock: h.stockStatus === 'instock',
  };
}

// Normalize the product shape passed from ShopPage via router state.
// Categories there are strings; map them to {id, title, handle} objects.
function mapNavProduct(p) {
  return {
    id: String(p.id),
    name: p.name,
    brand: p.brand || '',
    sku: p.sku || '',
    price: p.price || 0,
    originalPrice: p.originalPrice || null,
    image: p.image || null,
    href: p.href,
    description: p.description || '',
    weight: null,
    dimensions: null,
    vehicleAttributes: [],
    tags: p.tags ?? [],
    categories: (p.categories ?? []).map((name, i) => ({
      id: String(i),
      title: name,
      handle: (p.categoryHandles ?? [])[i] || name.toLowerCase().replace(/\s+/g, '-'),
    })),
    variantId: p.variantId ?? null,
    variants: [],
    hasVariants: p.hasVariants ?? false,
    _isVariable: p.hasVariants ?? false,
    backorder: p.backorder ?? false,
    inStock: !p.backorder,
  };
}

function CopySkuButton({ sku }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(sku).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className="sku-copy-btn" onClick={handleCopy} title="Copy SKU">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function ProductPage() {
  const { handle } = useParams();
  const location = useLocation();
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  // prefill: fast data from nav state or Meilisearch (name, price, image, etc.)
  // product: full data from WooCommerce API (variants, weight, fitment, etc.)
  const [prefill, setPrefill] = useState(() =>
    location.state?.prefill ? mapNavProduct(location.state.prefill) : null
  );
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [related, setRelated] = useState([]);
  // If nav state provided prefill, start with loading=false immediately
  const [loading, setLoading] = useState(!location.state?.prefill);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Reset state and scroll to top when navigating to a different product
  useEffect(() => {
    setSelectedVariant(null);
    setQty(1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [handle]);

  useEffect(() => {
    // If we navigated here from the shop, nav state has instant prefill data
    const navPrefill = location.state?.prefill ? mapNavProduct(location.state.prefill) : null;
    setPrefill(navPrefill);
    setProduct(null);
    setRelated([]);
    setVariantsLoading(false);
    setLoading(!navPrefill); // skip skeleton entirely if we already have data

    let cancelled = false;
    let baseWasVariable = false;

    // Only fetch Meilisearch if we don't already have nav state data
    if (!navPrefill) {
      getMeiliProduct(handle).then((hit) => {
        if (cancelled) return;
        if (hit) {
          setPrefill(mapMeiliProduct(hit));
          setLoading(false);
        }
      }).catch(() => {});
    }

    // Fire WooCommerce API fetch in parallel
    getProductByHandle(handle, (baseData) => {
      if (cancelled) return;
      setProduct(mapProduct(baseData));
      setLoading(false); // also clears skeleton if meilisearch was slow/unavailable
      if (baseData._isVariable) {
        baseWasVariable = true;
        setVariantsLoading(true);
      }
      // Start fetching related immediately — runs in parallel with any variants fetch
      const catId = baseData.categories?.[0]?.id;
      getProducts({ count: 5, ...(catId && { category: catId }) })
        .then((data) => {
          if (cancelled) return;
          const mapped = (data.edges ?? [])
            .map(({ node }) => mapProduct(node))
            .filter((p) => p.href !== `/products/${handle}`)
            .slice(0, 4);
          setRelated(mapped);
        })
        .catch(() => {});
    })
      .then((fullData) => {
        if (cancelled) return;
        if (baseWasVariable) {
          setProduct(mapProduct(fullData));
          setVariantsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [handle, location.state]);

  if (loading) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="product-skeleton-breadcrumb">
            <div className="skel skel--line" style={{ width: 180 }} />
          </div>
          <div className="product-layout">
            <div className="product-image-col">
              <div className="product-image-main">
                <div className="skel skel--block" style={{ width: '100%', aspectRatio: '1 / 1' }} />
              </div>
            </div>
            <div className="product-info-col">
              <div className="skel skel--line" style={{ width: 80, height: 14, marginBottom: 10 }} />
              <div className="skel skel--line" style={{ width: '80%', height: 28, marginBottom: 6 }} />
              <div className="skel skel--line" style={{ width: '60%', height: 28, marginBottom: 18 }} />
              <div className="skel skel--line" style={{ width: 100, height: 13, marginBottom: 24 }} />
              <div className="skel skel--line" style={{ width: 120, height: 36, marginBottom: 16 }} />
              <div className="skel skel--line" style={{ width: 140, height: 18, marginBottom: 24 }} />
              <div className="skel skel--block" style={{ width: '100%', height: 52, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use full WC data if available, otherwise fall back to meilisearch prefill
  const display = product ?? prefill;

  if (!display) {
    return (
      <div className="product-not-found">
        <div className="container">
          <h1>Product not found</h1>
          <p>This product doesn't exist or may have been removed.</p>
          <Link to="/shop" className="product-back-btn">Back to Shop</Link>
        </div>
      </div>
    );
  }

  // True while we have prefill but WC variants haven't loaded yet
  const apiLoading = !product;
  const effectiveVariantsLoading = variantsLoading || (apiLoading && display.hasVariants);

  const activeVariant = selectedVariant ?? (display.hasVariants ? null : display.variants?.[0]);
  const displayPrice = activeVariant?.price?.amount
    ? parseFloat(activeVariant.price.amount)
    : display.price ?? 0;
  const displayOriginalPrice = activeVariant?.compareAtPrice?.amount
    ? parseFloat(activeVariant.compareAtPrice.amount)
    : display.originalPrice ?? null;
  const effectiveOriginal = displayOriginalPrice > displayPrice ? displayOriginalPrice : null;
  const discount = effectiveOriginal
    ? Math.round(((effectiveOriginal - displayPrice) / effectiveOriginal) * 100)
    : null;
  const canAddToCart = !effectiveVariantsLoading && (!display.hasVariants || !!selectedVariant) && displayPrice > 0;

  function handleAddToCart() {
    if (!canAddToCart) return;
    const variantId = selectedVariant?.id ?? display.variantId;
    addItem({
      id: display.id,
      name: display.name,
      brand: display.brand,
      price: displayPrice,
      image: display.image,
      variantId: variantId ?? null,
      variantTitle: selectedVariant?.title ?? null,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="product-page">
      <div className="container">

        {/* Breadcrumb */}
        <nav className="product-breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={13} />
          <Link to="/shop">Shop</Link>
          <ChevronRight size={13} />
          <span>{display.name}</span>
        </nav>

        {/* Main layout */}
        <div className="product-layout">

          {/* Image */}
          <div className="product-image-col">
            {(() => {
              const brandEntry = BRAND_LIST.find(b => b.name.toLowerCase() === display.brand.toLowerCase());
              return brandEntry?.logo ? (
                <div className="product-page-brand-above-image">
                  <Link to={brandEntry.href} className="product-page-brand-logo-link">
                    <img
                      src={brandEntry.logo}
                      alt={display.brand}
                      className="product-page-brand-logo"
                      onError={e => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </Link>
                </div>
              ) : null;
            })()}
            <div className="product-image-main">
              {display.image
                ? <img src={display.image} alt={display.name} fetchpriority="high" />
                : <div className="product-image-placeholder" />
              }
            </div>
          </div>

          {/* Info */}
          <div className="product-info-col">
            {(() => {
              const brandEntry = BRAND_LIST.find(b => b.name.toLowerCase() === display.brand.toLowerCase());
              return (
                <Link
                  to={brandEntry?.href ?? `/shop?brands=${encodeURIComponent(display.brand)}`}
                  className="product-page-brand"
                >
                  {display.brand}
                </Link>
              );
            })()}
            <h1 className="product-page-name">{display.name}</h1>

            {display.sku && (
              <p className="product-page-sku">
                SKU: {display.sku}
                <CopySkuButton sku={display.sku} />
              </p>
            )}

            <div className="product-page-pricing">
              <span className="product-page-price">${displayPrice.toFixed(2)}</span>
              {effectiveOriginal && (
                <>
                  <span className="product-page-original">${effectiveOriginal.toFixed(2)}</span>
                  <span className="product-page-discount">-{discount}%</span>
                </>
              )}
            </div>

            <div className={`product-page-stock ${display.backorder ? 'product-page-stock--backorder' : 'product-page-stock--instock'}`}>
              <Package size={14} />
              {display.backorder ? 'Available on Backorder' : 'In Stock'}
            </div>

            {/* Variant selector — skeleton while API data loads for variable products */}
            {display._isVariable && effectiveVariantsLoading ? (
              <div className="product-page-variants">
                <div className="skel skel--line" style={{ width: 120, height: 14, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skel skel--block" style={{ width: 80, height: 38, borderRadius: 6 }} />
                  ))}
                </div>
              </div>
            ) : display.hasVariants && display.variants?.length > 0 ? (
              <div className="product-page-variants">
                <div className="product-page-section-title">
                  {display.variants[0]?.selectedOptions?.[0]?.name || 'Variant'}
                  {selectedVariant && (
                    <span className="product-page-variant-selected-label">
                      — {selectedVariant.title}
                    </span>
                  )}
                </div>
                <div className="product-page-variant-options">
                  {display.variants.map((v) => (
                    <button
                      key={v.id}
                      className={`product-page-variant-btn${selectedVariant?.id === v.id ? ' product-page-variant-btn--active' : ''}${!v.availableForSale ? ' product-page-variant-btn--unavailable' : ''}`}
                      onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? null : v)}
                      disabled={!v.availableForSale}
                      title={!v.availableForSale ? 'Out of stock' : ''}
                    >
                      {v.title}
                      {v.price?.amount && parseFloat(v.price.amount) !== display.price && (
                        <span className="product-page-variant-price">
                          ${parseFloat(v.price.amount).toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {!selectedVariant && (
                  <p className="product-page-variant-hint">Please select an option above</p>
                )}
              </div>
            ) : null}

            <div className="product-page-qty-row">
              <div className="product-page-qty">
                <button className="product-page-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span className="product-page-qty-val">{qty}</span>
                <button className="product-page-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
              </div>
              <button
                className={`product-page-atc${added ? ' product-page-atc--added' : ''}${!canAddToCart ? ' product-page-atc--disabled' : ''}`}
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                <ShoppingBag size={18} />
                {added ? 'Added to Cart' : 'Add to Cart'}
              </button>
            </div>

            {/* Categories */}
            {display.categories?.length > 0 && (
              <div className="product-page-section">
                <h3 className="product-page-section-title">Category</h3>
                <div className="product-page-chips">
                  {display.categories.map((c) => (
                    <Link key={c.id} to={`/shop?category=${c.handle}`} className="product-page-chip">{c.title}</Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {display.tags?.length > 0 && (
              <div className="product-page-section">
                <h3 className="product-page-section-title"><Tag size={13} /> Tags</h3>
                <div className="product-page-chips">
                  {display.tags.map((t) => (
                    <Link key={t} to={`/shop?q=${encodeURIComponent(t)}`} className="product-page-chip product-page-chip--tag">
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description — full width, available from Meilisearch prefill */}
        {display.description && (
          <div className="product-details-description">
            <h3 className="product-details-heading">Description</h3>
            <div className="product-details-body" dangerouslySetInnerHTML={{ __html: display.description }} />
          </div>
        )}

        {/* Weight, dimensions, vehicle fitment — only available after WC API responds */}
        {(display.weight || display.dimensions || display.vehicleAttributes?.length > 0) && (
          <div className="product-details-strip">

            {(display.weight || display.dimensions) && (
              <div className="product-details-block">
                <h3 className="product-details-heading">Shipping & Dimensions</h3>
                <table className="product-details-table">
                  <tbody>
                    {display.weight && (
                      <tr><td>Weight</td><td>{display.weight} kg</td></tr>
                    )}
                    {display.dimensions?.length && (
                      <tr><td>Length</td><td>{display.dimensions.length} cm</td></tr>
                    )}
                    {display.dimensions?.width && (
                      <tr><td>Width</td><td>{display.dimensions.width} cm</td></tr>
                    )}
                    {display.dimensions?.height && (
                      <tr><td>Height</td><td>{display.dimensions.height} cm</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {display.vehicleAttributes?.length > 0 && (
              <div className="product-details-block">
                <h3 className="product-details-heading">Vehicle Fitment</h3>
                {display.vehicleAttributes.map(attr => (
                  <div key={attr.name} className="product-details-fitment">
                    <span className="product-details-fitment-label">{attr.name}</span>
                    <div className="product-details-fitment-values">
                      {attr.values.map(v => (
                        <span key={v} className="product-page-chip">{v}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div className="product-related">
            <h2 className="product-related-title">Related Products</h2>
            <div className="product-related-grid">
              {related.map((p) => {
                const rel_discount = p.originalPrice
                  ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                  : null;
                return (
                  <Link key={p.id} to={p.href} className="product-related-card" onMouseEnter={() => prefetchProduct(p.href.split('/products/')[1])}>
                    <div className="product-related-img">
                      {p.image
                        ? <img src={p.image} alt={p.name} loading="lazy" />
                        : <div className="product-image-placeholder" />
                      }
                      {p.originalPrice && <span className="product-related-badge">-{rel_discount}%</span>}
                    </div>
                    <div className="product-related-info">
                      <span className="product-related-name">{p.name}</span>
                      <span className="product-related-price">${p.price.toFixed(2)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
