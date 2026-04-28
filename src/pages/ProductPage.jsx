import { useParams, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Package, Tag, X, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { getProductByHandle, getProducts, prefetchProduct } from '../lib/woocommerce';
import { getProductByHandle as getMeiliProduct } from '../lib/meilisearch';
import useCartStore from '../store/cartStore';
import { brands as BRAND_LIST } from '../data/navigation';
import { pageTitle, SITE_URL, schemaProduct, schemaBreadcrumb } from '../lib/seo';
import { formatPrice } from '../lib/formatPrice';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import useAuthStore from '../store/authStore';
import { getWholesalePrice } from '../hooks/useWholesalePrice';
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
    images: p.images ?? [],
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
    stockQuantity: p.stockQuantity ?? null,
    wholesalePrices: p.wholesalePrices || null,
    backorder: p.stockStatus === 'onbackorder',
    inStock: p.stockStatus === 'instock',
    outOfStock: p.stockStatus === 'outofstock',
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
    images: h.imageUrl ? [{ url: h.imageUrl, altText: h.imageAlt || h.title }] : [],
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
    stockQuantity: null,
    wholesalePrices: h.wholesalePrices || null,
    backorder: h.stockStatus === 'onbackorder',
    inStock: h.stockStatus === 'instock',
    outOfStock: h.stockStatus === 'outofstock',
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
    images: p.image ? [{ url: p.image, altText: p.name }] : [],
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
    stockQuantity: p.stockQuantity ?? null,
    wholesalePrices: p.wholesalePrices || null,
    backorder: p.backorder ?? false,
    inStock: !p.backorder && !p.outOfStock,
    outOfStock: p.outOfStock ?? false,
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

function Lightbox({ images, current, onSelect, onClose }) {
  const idx = images.findIndex(img => img.url === current);
  const activeIdx = idx === -1 ? 0 : idx;

  const prev = useCallback(() => {
    const i = (activeIdx - 1 + images.length) % images.length;
    onSelect(images[i].url);
  }, [activeIdx, images, onSelect]);

  const next = useCallback(() => {
    const i = (activeIdx + 1) % images.length;
    onSelect(images[i].url);
  }, [activeIdx, images, onSelect]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
      {images.length > 1 && (
        <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous"><ChevronLeft size={28} /></button>
      )}
      <div className="lightbox-img-wrap" onClick={e => e.stopPropagation()}>
        <img src={images[activeIdx].url} alt={images[activeIdx].altText} />
      </div>
      {images.length > 1 && (
        <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next"><ChevronRightIcon size={28} /></button>
      )}
      {images.length > 1 && (
        <div className="lightbox-thumbs" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              className={`lightbox-thumb${i === activeIdx ? ' lightbox-thumb--active' : ''}`}
              onClick={() => onSelect(img.url)}
            >
              <img src={img.url} alt={img.altText} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [related, setRelated] = useState([]);
  // If nav state provided prefill, start with loading=false immediately
  const [loading, setLoading] = useState(!location.state?.prefill);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const isWholesale = useAuthStore(s => s.isWholesale);
  const tierKey = useAuthStore(s => s.getWholesaleTierKey);

  // Reset state and scroll to top when navigating to a different product
  useEffect(() => {
    setSelectedVariant(null);
    setSelectedImage(null);
    setLightboxOpen(false);
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
  const displayImages = Array.from(
    new Map((display.images ?? []).map(img => [img.url, img])).values()
  );

  const retailPrice = activeVariant?.price?.amount
    ? parseFloat(activeVariant.price.amount)
    : display.price ?? 0;
  const variantWsPrices = activeVariant?.wholesalePrices ?? display.wholesalePrices;
  const { effectivePrice: displayPrice, isWholesalePrice } = getWholesalePrice(
    retailPrice, variantWsPrices, isWholesale() ? tierKey() : null
  );
  const displayOriginalPrice = activeVariant?.compareAtPrice?.amount
    ? parseFloat(activeVariant.compareAtPrice.amount)
    : display.originalPrice ?? null;
  // Show original/compare-at price, or retail price when wholesale is active
  const effectiveOriginal = isWholesalePrice
    ? retailPrice
    : (displayOriginalPrice > displayPrice ? displayOriginalPrice : null);
  const discount = effectiveOriginal
    ? Math.round(((effectiveOriginal - displayPrice) / effectiveOriginal) * 100)
    : null;
  // Stock cap: use variant-level quantity if a variant is selected, otherwise product-level
  const maxQty = display.hasVariants
    ? (selectedVariant?.quantityAvailable ?? null)
    : (display.stockQuantity ?? null);
  // null means unlimited / unknown (e.g. backorder or prefill-only data)
  const effectiveMax = maxQty !== null && maxQty > 0 ? maxQty : null;
  const lowStock = effectiveMax !== null && effectiveMax <= 5;

  const canAddToCart = !effectiveVariantsLoading && !display.outOfStock && (!display.hasVariants || !!selectedVariant) && displayPrice > 0 && (effectiveMax === null || effectiveMax > 0);

  function handleAddToCart() {
    if (!canAddToCart) return;
    const variantId = selectedVariant?.id ?? display.variantId;
    addItem({
      id: display.id,
      name: display.name,
      brand: display.brand,
      price: displayPrice,
      retailPrice: retailPrice,
      wholesalePrices: variantWsPrices,
      image: display.image,
      variantId: variantId ?? null,
      variantTitle: selectedVariant?.title ?? null,
      stockQuantity: effectiveMax,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const canonicalUrl = `${SITE_URL}/products/${display.slug ?? display.handle ?? handle}`;
  const metaDesc = display.description
    ? display.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    : `Buy ${display.name} from ${display.brand} at Elusive Racing. Honda performance parts specialist in Melbourne.`;

  return (
    <>
    <div className="product-page">
      <Helmet>
        <title>{pageTitle(`${display.name}${display.brand ? ` – ${display.brand}` : ''}`)}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type"              content="product" />
        <meta property="og:url"               content={canonicalUrl} />
        <meta property="og:title"             content={pageTitle(display.name)} />
        <meta property="og:description"       content={metaDesc} />
        {display.image && <meta property="og:image" content={display.image} />}
        <meta property="product:price:amount"   content={display.price?.toFixed(2)} />
        <meta property="product:price:currency" content="AUD" />

        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={pageTitle(display.name)} />
        <meta name="twitter:description" content={metaDesc} />
        {display.image && <meta name="twitter:image" content={display.image} />}

        <script type="application/ld+json">{JSON.stringify(schemaProduct({ ...display, slug: display.slug ?? handle }))}</script>
        <script type="application/ld+json">{JSON.stringify(schemaBreadcrumb([
          { name: 'Home', url: SITE_URL },
          { name: 'Shop', url: `${SITE_URL}/shop` },
          { name: display.name, url: canonicalUrl },
        ]))}</script>
      </Helmet>

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
            <div
              className="product-image-main product-image-main--clickable"
              onClick={() => display.image && setLightboxOpen(true)}
            >
              {display.image
                ? <img src={selectedImage ?? display.image} alt={display.name} fetchpriority="high" />
                : <div className="product-image-placeholder" />
              }
            </div>
            {displayImages.length > 1 && (
              <div className="product-image-thumbs">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    className={`product-image-thumb${(selectedImage ?? display.image) === img.url ? ' product-image-thumb--active' : ''}`}
                    onClick={() => setSelectedImage(img.url)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={img.url} alt={img.altText || display.name} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
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
              <span className="product-page-price">{formatPrice(displayPrice)}</span>
              {effectiveOriginal && (
                <>
                  <span className="product-page-original">{formatPrice(effectiveOriginal)}</span>
                  <span className="product-page-discount">-{discount}%</span>
                </>
              )}
            </div>

            <div className={`product-page-stock ${display.outOfStock ? 'product-page-stock--outofstock' : display.backorder ? 'product-page-stock--backorder' : 'product-page-stock--instock'}`}>
              <Package size={14} />
              {display.outOfStock
                ? 'Out of Stock'
                : display.backorder
                  ? 'Available on Backorder'
                  : 'In Stock'}
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
                      onClick={() => { setSelectedVariant(v.id === selectedVariant?.id ? null : v); setQty(1); }}
                      disabled={!v.availableForSale}
                      title={!v.availableForSale ? 'Out of stock' : ''}
                    >
                      {v.title}
                      {v.price?.amount && parseFloat(v.price.amount) !== display.price && (
                        <span className="product-page-variant-price">
                          {formatPrice(parseFloat(v.price.amount))}
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

            {lowStock && (
              <p className="product-page-low-stock">Only {effectiveMax} left in stock</p>
            )}
            <div className={`product-page-qty-row${display.hasVariants && !selectedVariant ? ' product-page-qty-row--locked' : ''}`}>
              <div className="product-page-qty">
                <button className="product-page-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={display.hasVariants && !selectedVariant}>−</button>
                <span className="product-page-qty-val">{qty}</span>
                <button
                  className="product-page-qty-btn"
                  onClick={() => setQty(q => effectiveMax !== null ? Math.min(effectiveMax, q + 1) : q + 1)}
                  aria-label="Increase quantity"
                  disabled={(display.hasVariants && !selectedVariant) || (effectiveMax !== null && qty >= effectiveMax)}
                >+</button>
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
            <div className="product-details-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(display.description) }} />
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
                      <span className="product-related-price">{formatPrice(p.price)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Lightbox */}
    {lightboxOpen && displayImages.length > 0 && createPortal(
      <Lightbox
        images={displayImages}
        current={selectedImage ?? display.image}
        onSelect={setSelectedImage}
        onClose={() => setLightboxOpen(false)}
      />,
      document.body
    )}
    </>
  );
}
