/**
 * src/lib/seo.js
 * Shared SEO constants and JSON-LD schema builders.
 */

export const SITE_URL  = 'https://elusiveracing.com.au';
export const SITE_NAME = 'Elusive Racing';
export const DEFAULT_TITLE = 'Elusive Racing | Honda Performance Parts & Tuning Melbourne';
export const DEFAULT_DESC  = "Melbourne's premier Honda performance parts specialist. 10,000+ genuine & aftermarket parts from 150+ brands. Expert tuning, dyno & workshop in Clayton South VIC.";
export const DEFAULT_IMAGE = `${SITE_URL}/hnats1.jpg`;
export const PHONE    = '+61395741710';
export const ADDRESS  = { street: '1/32 Graham Road', suburb: 'Clayton South', state: 'VIC', postcode: '3169', country: 'AU' };

/** Full page title with site suffix */
export function pageTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
}

/** Organisation + AutoPartsStore (used on homepage & contact) */
export function schemaLocalBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': ['AutoPartsStore', 'LocalBusiness'],
    name:  SITE_NAME,
    url:   SITE_URL,
    logo:  `${SITE_URL}/logo-main.svg`,
    image: DEFAULT_IMAGE,
    telephone: PHONE,
    email: 'sales@elusiveracing.com.au',
    priceRange: '$$',
    address: {
      '@type':           'PostalAddress',
      streetAddress:     ADDRESS.street,
      addressLocality:   ADDRESS.suburb,
      addressRegion:     ADDRESS.state,
      postalCode:        ADDRESS.postcode,
      addressCountry:    ADDRESS.country,
    },
    geo: {
      '@type':    'GeoCoordinates',
      latitude:   -37.9434,
      longitude:  145.1073,
    },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '09:00', closes: '17:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '14:00' },
    ],
    sameAs: [
      'https://www.facebook.com/ElusiveRacin',
      'https://www.instagram.com/elusive_racing',
    ],
  };
}

/** WebSite with Sitelinks Searchbox */
export function schemaWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url:  SITE_URL,
    potentialAction: {
      '@type':  'SearchAction',
      target: {
        '@type':      'EntryPoint',
        urlTemplate:  `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Product schema for a product detail page.
 * @param {object} product - mapped product object
 */
export function schemaProduct(product) {
  const availability = product.backorder
    ? 'https://schema.org/BackOrder'
    : product.inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name:  product.name,
    image: product.image ? [product.image] : [],
    description: product.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '',
    sku:   product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type':          'Offer',
      url:              `${SITE_URL}/products/${product.slug ?? product.handle}`,
      priceCurrency:    'AUD',
      price:            product.price?.toFixed(2),
      availability,
      seller: { '@type': 'Organization', name: SITE_NAME },
      ...(product.originalPrice ? { priceValidUntil: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] } : {}),
    },
  };
}

/**
 * BreadcrumbList schema.
 * @param {Array<{name: string, url: string}>} crumbs
 */
export function schemaBreadcrumb(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type':  'ListItem',
      position: i + 1,
      name:     c.name,
      item:     c.url,
    })),
  };
}
