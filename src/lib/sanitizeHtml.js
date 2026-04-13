import DOMPurify from 'dompurify';

// WooCommerce product descriptions come from WP admin — a compromised admin account
// could inject <script> or onerror handlers. Chat bot replies are safer (source is our
// own Claude API) but markdown-rendered HTML is still worth passing through this.
//
// Allowlist reflects tags WooCommerce / marked actually emit for descriptions.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'code', 'pre',
    'span', 'div', 'hr',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

// Force-add rel="noopener noreferrer" + target="_blank" on links so customer clicks
// never leave a tab.opener handle back to our origin.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(String(dirty), PURIFY_CONFIG);
}
