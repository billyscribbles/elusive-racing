// Shopify Storefront API client
// Add these to a .env file at the project root:
//   VITE_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
//   VITE_SHOPIFY_STOREFRONT_TOKEN=your-public-storefront-access-token

const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = '2025-01';

async function shopifyFetch({ query, variables = {} }) {
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);

  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts({ query = '', sortKey = 'BEST_SELLING', reverse = false, count = 24, cursor = null } = {}) {
  const data = await shopifyFetch({
    query: `
      query GetProducts($count: Int!, $query: String!, $sortKey: ProductSortKeys!, $reverse: Boolean!, $cursor: String) {
        products(first: $count, query: $query, sortKey: $sortKey, reverse: $reverse, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
              vendor
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              compareAtPriceRange {
                minVariantPrice { amount currencyCode }
              }
              featuredImage { url altText }
              tags
            }
          }
        }
      }
    `,
    variables: { count, query, sortKey, reverse, cursor },
  });
  return data.products;
}

export async function getVendors() {
  const data = await shopifyFetch({
    query: `
      query GetVendors {
        shop {
          productVendors(first: 250) {
            edges { node }
          }
        }
      }
    `,
  });
  return data.shop.productVendors.edges.map((e) => e.node);
}

export async function getFeaturedProducts(count = 8) {
  const data = await shopifyFetch({
    query: `
      query FeaturedProducts($count: Int!) {
        products(first: $count, sortKey: BEST_SELLING) {
          edges {
            node {
              id
              title
              handle
              vendor
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              compareAtPriceRange {
                minVariantPrice { amount currencyCode }
              }
              featuredImage { url altText }
              tags
            }
          }
        }
      }
    `,
    variables: { count },
  });
  return data.products.edges.map((e) => e.node);
}

export async function getProductByHandle(handle) {
  const data = await shopifyFetch({
    query: `
      query ProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          handle
          descriptionHtml
          vendor
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            minVariantPrice { amount currencyCode }
          }
          images(first: 10) {
            edges { node { url altText } }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                availableForSale
                selectedOptions { name value }
              }
            }
          }
        }
      }
    `,
    variables: { handle },
  });
  return data.productByHandle;
}

export async function searchProducts(query, count = 24) {
  const data = await shopifyFetch({
    query: `
      query SearchProducts($query: String!, $count: Int!) {
        products(first: $count, query: $query) {
          edges {
            node {
              id
              title
              handle
              vendor
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              compareAtPriceRange {
                minVariantPrice { amount currencyCode }
              }
              featuredImage { url altText }
            }
          }
        }
      }
    `,
    variables: { query, count },
  });
  return data.products.edges.map((e) => e.node);
}

// ── Collections ───────────────────────────────────────────────────────────────

export async function getCollectionByHandle(handle, productCount = 24) {
  const data = await shopifyFetch({
    query: `
      query CollectionByHandle($handle: String!, $productCount: Int!) {
        collectionByHandle(handle: $handle) {
          id
          title
          handle
          description
          image { url altText }
          products(first: $productCount, sortKey: BEST_SELLING) {
            edges {
              node {
                id
                title
                handle
                vendor
                priceRange {
                  minVariantPrice { amount currencyCode }
                }
                compareAtPriceRange {
                  minVariantPrice { amount currencyCode }
                }
                featuredImage { url altText }
              }
            }
          }
        }
      }
    `,
    variables: { handle, productCount },
  });
  return data.collectionByHandle;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function createCart() {
  const data = await shopifyFetch({
    query: `
      mutation CartCreate {
        cartCreate {
          cart {
            id
            checkoutUrl
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      product { title handle featuredImage { url } }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount { amount currencyCode }
            }
          }
        }
      }
    `,
  });
  return data.cartCreate.cart;
}

export async function addToCart(cartId, variantId, quantity = 1) {
  const data = await shopifyFetch({
    query: `
      mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      product { title handle featuredImage { url } }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount { amount currencyCode }
            }
          }
        }
      }
    `,
    variables: {
      cartId,
      lines: [{ merchandiseId: variantId, quantity }],
    },
  });
  return data.cartLinesAdd.cart;
}

export async function removeFromCart(cartId, lineIds) {
  const data = await shopifyFetch({
    query: `
      mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      product { title handle featuredImage { url } }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount { amount currencyCode }
            }
          }
        }
      }
    `,
    variables: { cartId, lineIds },
  });
  return data.cartLinesRemove.cart;
}

export async function updateCartLine(cartId, lineId, quantity) {
  const data = await shopifyFetch({
    query: `
      mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      product { title handle featuredImage { url } }
                    }
                  }
                }
              }
            }
            cost {
              totalAmount { amount currencyCode }
            }
          }
        }
      }
    `,
    variables: {
      cartId,
      lines: [{ id: lineId, quantity }],
    },
  });
  return data.cartLinesUpdate.cart;
}
