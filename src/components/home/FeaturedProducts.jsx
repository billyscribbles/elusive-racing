import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { getFeaturedProducts, prefetchProduct } from '../../lib/woocommerce';
import './FeaturedProducts.css';

function mapProduct(p) {
  const price = parseFloat(p.priceRange.minVariantPrice.amount) || 0;
  const compareAt = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount) || 0;
  const originalPrice = compareAt > price ? compareAt : null;
  const variants = p.variants ?? [];
  const isDefaultOnly = variants.length === 1 && variants[0].title === 'Default';
  const hasVariants = variants.length > 1 || (variants.length === 1 && !isDefaultOnly);
  return {
    id: p.id,
    name: p.title,
    brand: p.vendor || '',
    price,
    originalPrice,
    image: p.featuredImage?.url ?? null,
    slug: p.handle,
    href: `/products/${p.handle}`,
    badge: originalPrice ? 'Sale' : p.stockStatus === 'onbackorder' ? 'Backorder' : null,
    badgeType: originalPrice ? 'sale' : p.stockStatus === 'onbackorder' ? 'backorder' : null,
    variantId: isDefaultOnly ? variants[0]?.id : null,
    hasVariants,
    stockQuantity: p.stockQuantity != null ? p.stockQuantity : (p.stock_quantity != null ? parseInt(p.stock_quantity, 10) : null),
  };
}

function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <Link to={product.href} className="product-card" onMouseEnter={() => prefetchProduct(product.slug)}>
      <div className="product-image-wrap">
        {product.image
          ? <img src={product.image} alt={product.name} loading="lazy" className="product-image" />
          : <div className="product-image-placeholder" />
        }
        {product.badge && (
          <span className={`product-badge product-badge--${product.badgeType}`}>{product.badge}</span>
        )}
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-pricing">
          <span className="product-price">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <>
              <span className="product-original-price">${product.originalPrice.toFixed(2)}</span>
              <span className="product-discount">-{discount}%</span>
            </>
          )}
        </div>
        {product.stockQuantity != null && (
          <span className={`product-stock${product.stockQuantity <= 3 ? ' product-stock--low' : ''}`}>
            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
          </span>
        )}
      </div>
      <div className="product-actions">
        {product.hasVariants ? (
          <span className="product-quick-add product-quick-add--variants">
            Select Variant
          </span>
        ) : (
          <button
            className="product-quick-add"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); openCart(); }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </Link>
  );
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    getFeaturedProducts(10)
      .then((data) => setProducts(data.map(mapProduct)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function scroll(dir) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  }

  if (loading) return null;
  if (!products.length) return null;

  return (
    <section className="featured-products-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Featured Products</h2>
          <p className="section-subtitle">Hand-picked performance parts from top brands</p>
        </div>
        <div className="carousel-wrapper">
          <button className="carousel-arrow carousel-arrow--left" onClick={() => scroll(-1)} aria-label="Scroll left">&#8249;</button>
          <div className="products-carousel" ref={carouselRef}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <button className="carousel-arrow carousel-arrow--right" onClick={() => scroll(1)} aria-label="Scroll right">&#8250;</button>
        </div>
        <div className="products-cta">
          <a href="/shop" className="btn-primary">View All Products</a>
        </div>
      </div>
    </section>
  );
}
