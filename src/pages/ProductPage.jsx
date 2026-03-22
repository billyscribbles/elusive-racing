import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Package, Tag } from 'lucide-react';
import { useState } from 'react';
import DUMMY_PRODUCTS from '../lib/dummyProducts';
import useCartStore from '../store/cartStore';
import './ProductPage.css';

export default function ProductPage() {
  const { handle } = useParams();
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const product = DUMMY_PRODUCTS.find((p) => p.href === `/products/${handle}`);

  if (!product) {
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

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      variantId: product.variantId ?? null,
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
          <span>{product.name}</span>
        </nav>

        {/* Main layout */}
        <div className="product-layout">

          {/* Image */}
          <div className="product-image-col">
            <div className="product-image-main">
              {product.image
                ? <img src={product.image} alt={product.name} />
                : <div className="product-image-placeholder" />
              }
            </div>
          </div>

          {/* Info */}
          <div className="product-info-col">
            <span className="product-page-brand">{product.brand}</span>
            <h1 className="product-page-name">{product.name}</h1>

            {product.sku && (
              <p className="product-page-sku">SKU: {product.sku}</p>
            )}

            <div className="product-page-pricing">
              <span className="product-page-price">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <>
                  <span className="product-page-original">${product.originalPrice.toFixed(2)}</span>
                  <span className="product-page-discount">-{discount}%</span>
                </>
              )}
            </div>

            <div className={`product-page-stock ${product.backorder ? 'product-page-stock--backorder' : 'product-page-stock--instock'}`}>
              <Package size={14} />
              {product.backorder ? 'Available on Backorder' : 'In Stock'}
            </div>

            <button
              className={`product-page-atc${added ? ' product-page-atc--added' : ''}`}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={18} />
              {added ? 'Added to Cart' : 'Add to Cart'}
            </button>

            {/* Description */}
            {product.description && (
              <div className="product-page-section">
                <h3 className="product-page-section-title">Description</h3>
                <p className="product-page-description">{product.description}</p>
              </div>
            )}

            {/* Vehicle Fitment */}
            {product.vehicles?.length > 0 && (
              <div className="product-page-section">
                <h3 className="product-page-section-title">Vehicle Fitment</h3>
                <div className="product-page-chips">
                  {product.vehicles.map((v) => (
                    <Link key={v} to={`/shop?vehicles=${encodeURIComponent(v)}`} className="product-page-chip product-page-chip--vehicle">
                      {v}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            {(product.category || product.subcategory) && (
              <div className="product-page-section">
                <h3 className="product-page-section-title">Category</h3>
                <div className="product-page-chips">
                  {product.category && (
                    <Link to={`/shop`} className="product-page-chip">{product.category}</Link>
                  )}
                  {product.subcategory && (
                    <Link to={`/shop?sub=${encodeURIComponent(product.subcategory)}`} className="product-page-chip">{product.subcategory}</Link>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="product-page-section">
                <h3 className="product-page-section-title"><Tag size={13} /> Tags</h3>
                <div className="product-page-chips">
                  {product.tags.map((t) => (
                    <Link key={t} to={`/shop?q=${encodeURIComponent(t)}`} className="product-page-chip product-page-chip--tag">
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        <div className="product-related">
          <h2 className="product-related-title">More from {product.brand}</h2>
          <div className="product-related-grid">
            {DUMMY_PRODUCTS
              .filter((p) => p.brand === product.brand && p.id !== product.id)
              .slice(0, 4)
              .map((p) => {
                const rel_discount = p.originalPrice
                  ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                  : null;
                return (
                  <Link key={p.id} to={p.href} className="product-related-card">
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

      </div>
    </div>
  );
}
