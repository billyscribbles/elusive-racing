import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { getWholesalePrice } from '../../hooks/useWholesalePrice';
import { getProducts, getProductVariants } from '../../lib/woocommerce';
import { formatPrice } from '../../lib/formatPrice';
import './CheckoutExtras.css';

const MERCH_CATEGORY_ID = '22';

// Curated rotation — these four products are the upsell strip, in order.
// Variant products (tee, hoodie) show an inline size picker.
const PINNED_MERCH = [
  { id: '37837', label: 'Lanyard' },  // elusive-racing-lanyard
  { id: '6515',  label: 'T-Shirt' },  // elusive-racing-tee
  { id: '6516',  label: 'Hoodie' },   // elusive-racing-hoodie
  { id: '39990', label: 'Hat' },      // elusive-racing-cap
];

function mapProduct(p) {
  const price = parseFloat(p.priceRange?.minVariantPrice?.amount) || 0;
  const compareAt = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount) || 0;
  const originalPrice = compareAt > price ? compareAt : null;
  const variants = p.variants ?? [];
  const isDefaultOnly = variants.length === 1 && variants[0].title === 'Default';
  const hasVariants = variants.length > 1 || (variants.length === 1 && !isDefaultOnly);
  return {
    id: String(p.id),
    name: p.title,
    brand: p.vendor || '',
    price,
    originalPrice,
    image: p.featuredImage?.url ?? null,
    slug: p.handle,
    href: `/products/${p.handle}`,
    variantId: isDefaultOnly ? variants[0]?.id : null,
    hasVariants,
    stockStatus: p.stockStatus ?? null,
    stockQuantity: p.stockQuantity != null ? p.stockQuantity : null,
    wholesalePrices: p.wholesalePrices || null,
  };
}

function ExtraCard({ product, added, onAdd }) {
  const isWholesale = useAuthStore(s => s.isWholesale);
  const tierKey = useAuthStore(s => s.getWholesaleTierKey);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const selectedVariant = product.hasVariants
    ? (product.variants ?? []).find(v => v.id === selectedVariantId) || null
    : null;

  // Variant price overrides base price once a size is picked.
  const basePrice = selectedVariant?.price || product.price;
  const variantWsPrices = selectedVariant?.wholesalePrices || product.wholesalePrices;

  const { effectivePrice, isWholesalePrice } = getWholesalePrice(
    basePrice, variantWsPrices, isWholesale() ? tierKey() : null
  );
  const comparePrice = isWholesalePrice ? basePrice : product.originalPrice;

  const allOos = product.hasVariants && (product.variants ?? []).every(v => !v.availableForSale);
  const unavailable = product.hasVariants
    ? allOos
    : product.stockStatus === 'outofstock';
  const needsSize = product.hasVariants && !selectedVariantId && !allOos;

  return (
    <div className="co-extras-card">
      <Link to={product.href} className="co-extras-card-link" tabIndex={-1}>
        <div className="co-extras-image">
          {product.image
            ? <img src={product.image} alt={product.name} loading="lazy" width={120} height={120} />
            : <div className="co-extras-image-placeholder" />
          }
        </div>
      </Link>
      <div className="co-extras-info">
        {product.brand && <span className="co-extras-brand">{product.brand}</span>}
        <p className="co-extras-name">{product.name}</p>
        <div className="co-extras-pricing">
          <span className="co-extras-price">{formatPrice(effectivePrice)}</span>
          {comparePrice && comparePrice > effectivePrice && (
            <span className="co-extras-compare">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>

      {product.hasVariants && (
        <div className="co-extras-sizes" role="radiogroup" aria-label={`${product.name} size`}>
          {(product.variants ?? []).map(v => {
            const oos = !v.availableForSale;
            const active = v.id === selectedVariantId;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Size ${v.title}${oos ? ' (sold out)' : ''}`}
                className={`co-extras-size${active ? ' co-extras-size--active' : ''}${oos ? ' co-extras-size--oos' : ''}`}
                onClick={() => !oos && setSelectedVariantId(v.id)}
                disabled={oos}
              >
                {v.title}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={`co-extras-add${added ? ' co-extras-add--added' : ''}`}
        onClick={() => onAdd(product, effectivePrice, selectedVariant)}
        disabled={added || unavailable || needsSize}
        aria-label={added ? `${product.name} added to cart` : `Add ${product.name} to cart`}
      >
        {unavailable
          ? 'Sold out'
          : added
            ? (<><Check size={14} /> Added</>)
            : needsSize
              ? 'Select size'
              : (<><Plus size={14} /> Add</>)}
      </button>
    </div>
  );
}

export default function CheckoutExtras() {
  const addItem = useCartStore(s => s.addItem);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getProducts({ category: MERCH_CATEGORY_ID, count: 100, sort: 'best-selling' });
        if (cancelled) return;

        const byId = new Map(
          (result?.edges ?? []).map(e => [String(e.node.id), mapProduct(e.node)])
        );

        const picked = PINNED_MERCH
          .map(cfg => byId.get(cfg.id))
          .filter(Boolean);

        // For variant products, fetch sizes so the user can pick one.
        const enriched = await Promise.all(picked.map(async (p) => {
          if (!p.hasVariants) return p;
          try {
            const variants = await getProductVariants(p.id);
            return { ...p, variants };
          } catch {
            return { ...p, variants: [] };
          }
        }));

        if (!cancelled) setProducts(enriched);
      } catch {
        // Silent fail — don't break checkout if merch fetch fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleAdd(product, effectivePrice, selectedVariant) {
    if (!(effectivePrice > 0)) return;
    const variantId = product.hasVariants ? selectedVariant?.id : product.variantId;
    const variantTitle = product.hasVariants ? selectedVariant?.title : null;
    const stockQuantity = product.hasVariants
      ? selectedVariant?.stockQuantity ?? null
      : product.stockQuantity;
    addItem({
      ...product,
      variants: undefined, // don't leak the variant list into cart state
      price: effectivePrice,
      retailPrice: selectedVariant?.price || product.price,
      variantId: variantId ?? null,
      variantTitle: variantTitle ?? null,
      stockQuantity,
      wholesalePrices: selectedVariant?.wholesalePrices || product.wholesalePrices,
    });
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAdded(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }, 1500);
  }

  if (loading) {
    return (
      <div className="co-extras">
        <div className="co-extras-header">
          <p className="co-extras-title">Add to your order</p>
          <p className="co-extras-sub">Elusive Racing merch — one tap to add</p>
        </div>
        <div className="co-extras-row">
          {PINNED_MERCH.map((_, i) => (
            <div key={i} className="co-extras-card co-extras-card--skeleton">
              <div className="co-extras-image co-extras-shimmer" />
              <div className="co-extras-info">
                <div className="co-extras-shimmer" style={{ height: 10, width: '40%', marginBottom: 6 }} />
                <div className="co-extras-shimmer" style={{ height: 14, width: '85%', marginBottom: 6 }} />
                <div className="co-extras-shimmer" style={{ height: 12, width: '30%' }} />
              </div>
              <div className="co-extras-shimmer" style={{ height: 32, width: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="co-extras">
      <div className="co-extras-header">
        <p className="co-extras-title">Add to your order</p>
        <p className="co-extras-sub">Elusive Racing merch — one tap to add</p>
      </div>
      <div className="co-extras-row">
        {products.map(product => (
          <ExtraCard
            key={product.id}
            product={product}
            added={!!added[product.id]}
            onAdd={handleAdd}
          />
        ))}
      </div>
    </div>
  );
}
