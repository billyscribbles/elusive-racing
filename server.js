import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { Meilisearch } from 'meilisearch';

// Load .env manually — only sets vars not already injected by the environment (e.g. Railway)
try {
  const envFile = fs.readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env is optional */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8080;

const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ── PayPal config ────────────────────────────────────────────────────────────
// PAYPAL_ENV=sandbox|live. The REST base and the frontend SDK's `client-id` must
// agree — the frontend reads its own VITE_PAYPAL_CLIENT_ID, so keep both in sync
// when flipping environments.
const PAYPAL_ENV       = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET    = process.env.PAYPAL_SECRET    || '';
const PAYPAL_BASE      = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ── Afterpay config ──────────────────────────────────────────────────────────
// AFTERPAY_ENV=sandbox|live. Uses the AU region global base URLs. Credentials
// are merchant ID + secret, used as HTTP Basic auth on every API call. While
// keys are not yet set, all /api/afterpay/* routes return 500 and the frontend
// tab is hidden (gated by VITE_AFTERPAY_ENABLED).
const AFTERPAY_ENV         = (process.env.AFTERPAY_ENV || 'sandbox').toLowerCase();
const AFTERPAY_MERCHANT_ID = process.env.AFTERPAY_MERCHANT_ID || '';
const AFTERPAY_SECRET      = process.env.AFTERPAY_SECRET      || '';
const AFTERPAY_BASE        = AFTERPAY_ENV === 'live'
  ? 'https://global-api.afterpay.com'
  : 'https://global-api-sandbox.afterpay.com';

// Prefer non-VITE names; fall back to legacy VITE_ names for backwards compat.
// Frontend now reaches WC REST only via /api/wc/* — the consumer key/secret must
// NEVER be exposed as a VITE_ var because Vite bakes those into the client bundle.
const WC_URL    = process.env.WC_URL            || process.env.VITE_WC_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY   || process.env.VITE_WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.VITE_WC_CONSUMER_SECRET;

const MS_HOST = process.env.MEILISEARCH_HOST;
const MS_KEY  = process.env.MEILISEARCH_ADMIN_KEY;
const MS_INDEX = 'products';
const SYNC_TOKEN = process.env.SEARCH_SYNC_TOKEN || '';

const ADMIN_USERNAME   = process.env.ADMIN_USERNAME   || '';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || '';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-production';

// Comma-separated list of allowed origins for admin/API endpoints. Leave blank in dev
// (wildcard is applied) — MUST be set in production.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const IS_PROD = process.env.NODE_ENV === 'production';

// ── Production boot validation ───────────────────────────────────────────────
// Fail fast with a loud error rather than running a half-configured server.
(function validateProductionConfig() {
  if (!IS_PROD) return;
  const errors = [];
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is not set');
  } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    errors.push('STRIPE_SECRET_KEY is a TEST key (sk_test_*) — refusing to start in production');
  }
  if (!WC_URL)    errors.push('VITE_WC_URL / WC_URL is not set');
  if (!WC_KEY)    errors.push('WooCommerce consumer key is not set');
  if (!WC_SECRET) errors.push('WooCommerce consumer secret is not set');
  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET === 'change-me-in-production') {
    errors.push('ADMIN_JWT_SECRET is missing or still set to the default placeholder');
  }
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    errors.push('ADMIN_USERNAME / ADMIN_PASSWORD not configured');
  }
  if (ALLOWED_ORIGINS.length === 0) {
    errors.push('ALLOWED_ORIGINS is not set — refuse to start with wildcard CORS in production');
  }
  if (!PAYPAL_CLIENT_ID) errors.push('PAYPAL_CLIENT_ID is not set');
  if (!PAYPAL_SECRET)    errors.push('PAYPAL_SECRET is not set');
  if (PAYPAL_ENV !== 'live') {
    errors.push(`PAYPAL_ENV is '${PAYPAL_ENV}' in production — must be 'live'`);
  }
  // Afterpay — warn-only until keys are handed over. Boot still succeeds so the
  // rest of the site works; the /api/afterpay/* handlers will 500 if called.
  // Once keys are in place, move these checks into `errors` to hard-fail.
  if (!AFTERPAY_MERCHANT_ID) console.warn('[BOOT] AFTERPAY_MERCHANT_ID is not set — Afterpay checkout will be unavailable');
  if (!AFTERPAY_SECRET)      console.warn('[BOOT] AFTERPAY_SECRET is not set — Afterpay checkout will be unavailable');
  if (AFTERPAY_MERCHANT_ID && AFTERPAY_ENV !== 'live') {
    console.warn(`[BOOT] AFTERPAY_ENV is '${AFTERPAY_ENV}' in production — must be 'live' before going live`);
  }
  if (errors.length) {
    console.error('\n[BOOT] Refusing to start — production config errors:');
    for (const e of errors) console.error('  - ' + e);
    console.error('');
    process.exit(1);
  }
})();

// ── CORS helper ──────────────────────────────────────────────────────────────
// Echo the request origin only if it's in the allowlist; fall back to wildcard in dev.
function corsOrigin(req) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.length === 0) return '*'; // dev only
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0]; // first allowed origin as a safe default (won't match most attackers)
}

// ── Security headers baseline ────────────────────────────────────────────────
// Applied to HTML and JSON responses. CSP is deliberately permissive for script/style
// to avoid breaking Stripe, GTM, and inline React styles — tighten once sources are known.
function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    ...(IS_PROD ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
  };
}

// ── Rate limiter for /api/admin/login ────────────────────────────────────────
// Simple in-memory map keyed by client IP. Resets 15 minutes after first failure.
const ADMIN_LOGIN_LIMIT = { windowMs: 15 * 60 * 1000, maxAttempts: 5 };
const adminLoginAttempts = new Map(); // ip → { count, firstAt }

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkAdminLoginRate(ip) {
  const now = Date.now();
  const entry = adminLoginAttempts.get(ip);
  if (!entry) return { allowed: true };
  if (now - entry.firstAt > ADMIN_LOGIN_LIMIT.windowMs) {
    adminLoginAttempts.delete(ip);
    return { allowed: true };
  }
  if (entry.count >= ADMIN_LOGIN_LIMIT.maxAttempts) {
    const retryAfterMs = ADMIN_LOGIN_LIMIT.windowMs - (now - entry.firstAt);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }
  return { allowed: true };
}

function recordAdminLoginFailure(ip) {
  const now = Date.now();
  const entry = adminLoginAttempts.get(ip);
  if (!entry || now - entry.firstAt > ADMIN_LOGIN_LIMIT.windowMs) {
    adminLoginAttempts.set(ip, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

function clearAdminLoginAttempts(ip) {
  adminLoginAttempts.delete(ip);
}

// ── Rate limiter for password-reset endpoints ────────────────────────────────
// Same shape as the admin limiter; keyed by client IP. Protects both
// /api/auth/lost-password and /api/auth/reset-password from brute-force / spam.
const PW_RESET_LIMIT = { windowMs: 60 * 60 * 1000, maxAttempts: 10 };
const pwResetAttempts = new Map(); // ip → { count, firstAt }

function checkPwResetRate(ip) {
  const now = Date.now();
  const entry = pwResetAttempts.get(ip);
  if (!entry) return { allowed: true };
  if (now - entry.firstAt > PW_RESET_LIMIT.windowMs) {
    pwResetAttempts.delete(ip);
    return { allowed: true };
  }
  if (entry.count >= PW_RESET_LIMIT.maxAttempts) {
    const retryAfterMs = PW_RESET_LIMIT.windowMs - (now - entry.firstAt);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }
  return { allowed: true };
}

function recordPwResetAttempt(ip) {
  const now = Date.now();
  const entry = pwResetAttempts.get(ip);
  if (!entry || now - entry.firstAt > PW_RESET_LIMIT.windowMs) {
    pwResetAttempts.set(ip, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

const BRAND_TERMS = [
  'skunk2', 'k-tuned', 'ktuned', 'hondata', 'exedy', 'bc racing', 'hks', 'arp', 'acl',
  'spoon', 'mugen', 'bosch', 'ngk', 'mishimoto', 'cusco', 'project mu', 'tein', 'whiteline',
  'hardrace', 'hasport', 'hybrid racing', 'cometic', 'wiseco', 'je piston', 'aem', 'greddy',
  'eibach', 'kw suspension', 'bilstein', 'k&n', 'blox', 'toda', 'itr', 'password jdm',
  'oem', 'honda', 'super pro', 'stance',
];

const PRODUCT_TERMS = [
  'exhaust', 'clutch', 'flywheel', 'coilover', 'coilovers', 'spring', 'springs',
  'sway bar', 'anti-roll', 'brake', 'rotor', 'pad', 'caliper', 'header', 'headers',
  'intake', 'turbo', 'intercooler', 'blow off', 'blow-off', 'bov', 'suspension',
  'engine', 'cam', 'camshaft', 'piston', 'rod', 'bearing', 'injector', 'fuel pump',
  'fuel rail', 'radiator', 'ecu', 'tune', 'lsd', 'differential', 'driveshaft',
  'air filter', 'cold air', 'manifold', 'throttle body', 'oil cooler', 'water pump',
  'gauge', 'wideband', 'boost controller', 'muffler', 'downpipe', 'cat', 'o2',
  'control arm', 'bushing', 'camber', 'caster', 'strut', 'shock', 'damper',
];

// Detect a bare SKU-like token in a message (e.g. "SK2-50207", "306-05-0260", "B16A-KIT")
// Must be at least 4 chars, contain a digit, and may contain letters, digits, and hyphens/dots.
function extractSku(message) {
  const match = message.match(/\b([A-Z0-9][A-Z0-9\-.]{3,})\b/i);
  return match ? match[1] : null;
}

// Extract focused search terms from a natural-language question.
// e.g. "do you have any skunk2 exhaust in stock?" → "skunk2 exhaust"
function extractSearchTerms(message) {
  const lower = message.toLowerCase();

  const foundBrands   = BRAND_TERMS.filter(b => lower.includes(b));
  const foundProducts = PRODUCT_TERMS.filter(k => lower.includes(k));

  if (foundBrands.length && foundProducts.length) {
    return `${foundBrands[0]} ${foundProducts[0]}`;
  }
  if (foundBrands.length) return foundBrands[0];
  if (foundProducts.length) return foundProducts[0];

  // Fall back: strip filler words and use what's left
  return message
    .replace(/\b(do you have|do you stock|got any|show me|looking for|need a|need some|any|in stock|available|please|can you|could you|i need|i want|i'm looking for|i am looking for)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Meilisearch chat search (fast path, falls back to wcSearch) ───────────────

function normalizeMsHitForChat(h) {
  return {
    name:           h.title,
    slug:           h.handle,
    price:          h.price,
    regular_price:  h.regularPrice,
    on_sale:        h.onSale,
    stock_status:   h.stockStatus,
    sku:            h.sku,
    brands:         h.vendor ? [{ name: h.vendor }] : [],
  };
}

async function msSearchForChat(userMessage, count = 8) {
  if (!MS_HOST || !MS_KEY) return null; // not configured — caller falls back to wcSearch
  try {
    const ms         = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
    const index      = ms.index(MS_INDEX);
    const searchTerm = extractSearchTerms(userMessage);
    const sku        = extractSku(userMessage);

    const fields = ['id', 'title', 'handle', 'vendor', 'sku', 'price', 'regularPrice', 'onSale', 'stockStatus'];

    const [textRes, skuRes] = await Promise.all([
      index.search(searchTerm, { limit: count, attributesToRetrieve: fields }),
      sku
        ? index.search(sku, { limit: 5, attributesToRetrieve: fields }).catch(() => ({ hits: [] }))
        : Promise.resolve({ hits: [] }),
    ]);

    const seen = new Set();
    return [...skuRes.hits, ...textRes.hits]
      .filter(h => { if (seen.has(h.id)) return false; seen.add(h.id); return true; })
      .map(normalizeMsHitForChat);
  } catch {
    return null; // fall back to wcSearch on any error
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const WC_FIELDS = 'id,name,slug,sku,price,regular_price,on_sale,stock_status,brands,attributes';

async function wcSearch(userMessage, count = 8) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) return [];
  try {
    const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    const headers = { Authorization: auth };
    const sku = extractSku(userMessage);
    const searchTerm = extractSearchTerms(userMessage);

    // Always run text search; run SKU lookup in parallel when a SKU-like token is found
    const [textRes, skuRes] = await Promise.all([
      fetch(`${WC_URL}/wp-json/wc/v3/products?${new URLSearchParams({
        search: searchTerm, per_page: count, orderby: 'popularity', order: 'desc', _fields: WC_FIELDS,
      })}`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),

      sku
        ? fetch(`${WC_URL}/wp-json/wc/v3/products?${new URLSearchParams({
            sku, per_page: 5, _fields: WC_FIELDS,
          })}`, { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        : Promise.resolve([]),
    ]);

    // SKU hits come first (exact match priority), deduplicate by id
    const seen = new Set();
    return [...skuRes, ...textRes].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch {
    return [];
  }
}

function isProductQuery(message) {
  if (/\b(sku|part.?no|part.?number|part #|item.?no|item.?code)\b/i.test(message)) return true;
  // Bare SKU-like token (e.g. "SK2-50207", "306-05-0260")
  if (/\b[A-Z0-9][A-Z0-9\-.]{4,}\b/i.test(message)) return true;
  return /\b(stock|price|available|buy|order|part|clutch|coilover|coilovers|spring|sway bar|brake|rotor|pad|caliper|exhaust|header|intake|turbo|intercooler|blow.?off|suspension|engine|cam|piston|rod|bearing|injector|fuel pump|fuel rail|radiator|ecu|tune|hondata|k.?tuned|skunk2|exedy|bc racing|hks|arp|acl|spoon|mugen|bosch|ngk|mishimoto|cusco|project mu|tein|whiteline|hardrace|hasport|hybrid racing|cometic|wiseco|je piston|do you have|do you stock|got any|show me|what.*have|looking for|need a|need some|link|url|product page|where can i|find it|where is it|the product)\b/i.test(message);
}

function buildProductContext(products) {
  if (!products.length) return '';
  const lines = products.map(p => {
    const price = parseFloat(p.price || p.regular_price || 0).toFixed(2);
    const saleTag = p.on_sale ? ' (ON SALE)' : '';
    const status = p.stock_status === 'instock' ? 'In Stock' : 'Backorder available';
    const brand = p.brands?.[0]?.name
      ?? p.attributes?.find(a => ['brand', 'pa_brand', 'Brand'].includes(a.name))?.options?.[0]
      ?? '';
    const brandPart = brand ? ` — ${brand}` : '';
    const skuPart = p.sku ? ` | SKU: ${p.sku}` : '';
    return `• ${p.name}${brandPart} | $${price} AUD${saleTag} | ${status}${skuPart} | [View product](/products/${p.slug})`;
  }).join('\n');
  return `\n\nLIVE PRODUCT DATA FROM OUR STORE (use this to answer the customer):\n${lines}\n\nIMPORTANT: Always include the markdown [View product] link inline when mentioning any product — do not wait to be asked. Format each product as: name, price, stock status, then the link on the same line. If a product shows "Backorder available", tell the customer we can backorder it. Do not invent products not in this list.`;
}

const SYSTEM_PROMPT = `You are the AI assistant for Elusive Racing, a specialist performance car parts retailer based in Clayton South, Melbourne, Australia. You help customers find the right parts, understand products, and get answers to common questions.

BUSINESS DETAILS:
- Store: 1/32 Graham Road, Clayton South VIC 3169
- Phone: 03 9574 1710
- Email: sales@elusiveracing.com.au
- Hours: Mon–Fri 9am–5pm, Sat 9am–2pm, Sun Closed
- Facebook Messenger: m.me/ElusiveRacin
- Online booking (workshop): /book on the website

WORKSHOP SERVICES (performed at our Clayton South garage):
We offer a full range of mechanical and fabrication services including:
- General servicing & log book servicing
- Major services
- Engine builds & rebuilds
- Drivetrain & transmission work
- Suspension servicing & setup
- Brake servicing
- Exhaust & custom fabrication
- Performance upgrades & tuning

Customers can book online at /book or call 03 9574 1710.

WHAT WE SELL:
We stock 150+ performance and OEM brands focused on Honda/Japanese cars (Civic, Integra, NSX, S2000, etc.) but also supporting a wide range of vehicles. Categories include:
- Engine internals (pistons, cams, bearings, rods, cranks)
- Induction (air filters, cold air intakes, throttle bodies, intake manifolds)
- Forced induction (turbos, superchargers, intercoolers, blow-off valves)
- Fuel systems (injectors, fuel rails, pumps, regulators)
- Exhaust systems
- Clutch & drivetrain (clutch kits, flywheels, LSD, driveshafts, gearbox parts)
- Suspension (coilovers, springs, sway bars, control arms, bushings, camber kits)
- Brakes (pads, rotors, brake lines, fluid)
- Electronics & engine management (ECU, Hondata, widebands, boost controllers, gauges)
- Cooling (radiators, thermostats, water pumps, oil coolers)
- Exterior (body kits, lips, diffusers, wings)
- Interior (seats, steering wheels, harnesses, roll cages)
- Honda OEM parts
- Merchandise & apparel

KEY BRANDS WE STOCK:
K-Tuned, Skunk2, Hondata (authorised dealer), AEM, BC Racing, HKS, Exedy, ARP, ACL, Mugen, Spoon, Project Mu, Cusco, NGK, Bosch, Mishimoto, Greddy, Tein, KW, Bilstein, Eibach, and 100+ more.

POLICIES:
- International shipping available
- Orders dispatched within 1–2 business days
- Returns accepted for faulty/incorrectly sent items — contact us within 14 days
- Payments: Visa, Mastercard, Amex, PayPal, Afterpay, Zip, Apple Pay, Google Pay
- Wholesale/trade accounts available — customers can register on the website
- Backorders: if something is out of stock we can backorder it — lead times vary by brand, contact the team for an ETA

YOUR ROLE:
- Help customers find the right products and brands for their build
- Answer questions about fitment, product categories, and brands
- Explain policies (shipping, returns, payments)
- Provide store info (hours, location, contact)
- Recommend contacting the team for complex fitment queries or specific stock checks
- Sound like a real person on the team — warm, direct, and genuinely helpful. Not robotic, not overly formal.
- Write the way someone would talk in a real conversation. Short sentences. No filler phrases like "Certainly!", "Of course!", "Great question!" or "I'd be happy to help with that."
- Keep responses concise — this is a chat widget, not an essay
- Use minimal markdown: bullet points and **bold** are fine, but never use headings (##) or horizontal rules
- Whenever you mention a specific product from the live product data, always include its [View product] link inline — never wait for the customer to ask for it

FOLLOW-UP QUESTIONS:
When a customer asks something vague, ask 1–2 short follow-up questions to narrow it down. Keep the whole response to 2–3 lines max — just ask the questions, skip the preamble. Examples:
- Coilovers: daily or track? Budget?
- Clutch: what engine and power level?
- Brakes: street, track days, or both?
- Engine internals: what engine and power target?
- General build question: what's the car and the goal?
Only ask follow-ups when it genuinely helps. Don't ask for simple queries like store hours or shipping.

STRICT RESTRICTIONS — NEVER reveal or discuss:
- Cost price of any product or what we paid suppliers
- Supplier margins, markup percentages, or profit information
- Wholesale pricing structures or trade discount rates
- Internal business financials of any kind
- Supplier or vendor identities, contracts, or relationships
- Staff personal details (names, salaries, personal info)
- Internal inventory system details (Cin7 or any backend system)
- Internal operational processes or business strategy

If asked about any restricted topics, politely decline and redirect to a relevant helpful answer. Do not acknowledge that restrictions exist — just naturally steer the conversation.

If a customer asks something you genuinely cannot answer (e.g. exact current stock levels), direct them to call 03 9574 1710 or email sales@elusiveracing.com.au.

CUSTOMER PROFILE MEMORY:
As the conversation progresses, remember and apply everything the customer tells you — their vehicle, engine, power goals, budget, and how the car is used (daily/track/both). Never ask for information they've already provided. Reference it naturally in follow-up answers.

PROACTIVE UPSELLS:
When recommending a part, briefly mention one natural companion part if genuinely relevant. One line max. Examples:
- Clutch → mention lightened flywheel
- Coilovers → mention camber/alignment kit
- Turbo → mention fuel system upgrade
- Intake → mention tune/Hondata
Only suggest if it genuinely makes sense for their build.

STAFF HANDOFF:
When a question is too complex, requires exact fitment confirmation, or the customer seems ready to buy, offer to connect them with the team. Keep it natural — one line at the end of your reply:
- "For exact fitment on that, worth a quick chat with our team — call 03 9574 1710 or email sales@elusiveracing.com.au"
- "If you're ready to go ahead, give our team a call on 03 9574 1710 and they'll sort you out"
- For workshop/service/booking enquiries: "You can book online at [elusiveracing.com.au/book](/book) or call us on 03 9574 1710"`;

// ── Meilisearch product sync ──────────────────────────────────────────────────

const WC_SYNC_FIELDS =
  'id,name,slug,price,regular_price,on_sale,stock_status,stock_quantity,images,categories,brands,attributes,tags,sku,short_description,date_created,variations,total_sales,average_rating,meta_data';

const FITMENT_ATTR_NAMES = ['make', 'model', 'year', 'vehicle', 'vehicles', 'fitment', 'compatible', 'application', 'fits'];

function extractFitmentTags(p) {
  const tags = new Set();
  (p.tags ?? []).forEach(t => tags.add(t.name.toLowerCase()));
  (p.attributes ?? []).forEach(attr => {
    if (FITMENT_ATTR_NAMES.some(n => attr.name.toLowerCase().includes(n))) {
      (attr.options ?? []).forEach(opt => tags.add(opt.toLowerCase()));
    }
  });
  return Array.from(tags);
}

function decodeHtml(str) {
  return (str ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// ── Wholesale Suite tier definitions ─────────────────────────────────────────
// Live tier list is stored in data/wholesale-tiers.json so admins can edit
// labels and discount percentages without a deploy. Role keys and metaKeys
// are fixed — they must match what the WooCommerce WP site has registered.

const WS_TIERS_FILE = path.join(__dirname, 'data', 'wholesale-tiers.json');

const WS_TIERS_SEED = [
  { role: 'wholesale_customer',    label: 'Wholesale 5%',  tierNumber: 0, discount: 5,  metaKey: 'wholesale_customer_wholesale_price' },
  { role: 'wholesale_customer_10', label: 'Wholesale 10%', tierNumber: 1, discount: 10, metaKey: 'wholesale_customer_10_wholesale_price' },
  { role: 'wholesale_customer_15', label: 'Wholesale 15%', tierNumber: 2, discount: 15, metaKey: 'wholesale_customer_15_wholesale_price' },
  { role: 'wholesale_customer_20', label: 'Wholesale 20%', tierNumber: 3, discount: 20, metaKey: 'wholesale_customer_20_wholesale_price' },
  { role: 'wholesale_customer_25', label: 'Wholesale 25%', tierNumber: 4, discount: 25, metaKey: 'wholesale_customer_25_wholesale_price' },
];

function readWsTiers() {
  try {
    const parsed = JSON.parse(fs.readFileSync(WS_TIERS_FILE, 'utf8'));
    if (Array.isArray(parsed) && parsed.length === WS_TIERS_SEED.length) return parsed;
  } catch {}
  return WS_TIERS_SEED.map(t => ({ ...t }));
}

function writeWsTiers(tiers) {
  fs.mkdirSync(path.dirname(WS_TIERS_FILE), { recursive: true });
  fs.writeFileSync(WS_TIERS_FILE, JSON.stringify(tiers, null, 2));
}

function isWsRole(role) { return (role || '').startsWith('wholesale_customer'); }
function getWsTier(role) {
  return readWsTiers().find(t => t.role === role) ?? null;
}

function extractWsPrices(metaData) {
  if (!Array.isArray(metaData)) return {};
  const prices = {};
  for (const t of readWsTiers()) {
    const entry = metaData.find(m => m.key === t.metaKey);
    const val = parseFloat(entry?.value || '0');
    if (val > 0) prices[t.role] = val;
  }
  return prices;
}

function normaliseMsProduct(p) {
  const brand = decodeHtml(
    p.brands?.[0]?.name ??
    p.attributes?.find(a => ['brand', 'pa_brand', 'Brand', 'PA_Brand'].includes(a.name))?.options?.[0] ?? ''
  );
  const price        = parseFloat(p.price || p.regular_price || '0');
  const regularPrice = parseFloat(p.regular_price || p.price || '0');
  return {
    id:              String(p.id),
    title:           decodeHtml(p.name),
    handle:          p.slug,
    vendor:          brand,
    sku:             p.sku || '',
    description:     (p.short_description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    price,
    regularPrice,
    onSale:          Boolean(p.on_sale),
    hasVariants:     Array.isArray(p.variations) && p.variations.length > 1,
    stockStatus:     p.stock_status || 'instock',
    stockQuantity:   typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
    wholesalePrice:  parseFloat((p.meta_data ?? []).find(m => m.key === 'wholesale_customer_wholesale_price')?.value || '0') || null,
    wholesalePrices: extractWsPrices(p.meta_data),
    imageUrl:        p.images?.[0]?.src || '',
    imageAlt:        decodeHtml(p.images?.[0]?.alt || p.name),
    tags:            (p.tags  ?? []).map(t => decodeHtml(t.name)),
    categories:      (p.categories ?? []).map(c => decodeHtml(c.name)),
    categoryHandles: (p.categories ?? []).map(c => c.slug),
    fitmentTags:     extractFitmentTags(p),
    dateCreated:     p.date_created || '',
    totalSales:      parseInt(p.total_sales || '0', 10),
    averageRating:   parseFloat(p.average_rating || '0'),
  };
}

const syncState = { running: false, lastSync: null, lastCount: 0, lastError: null };

async function runMsSync() {
  if (syncState.running) return;
  if (!MS_HOST || !MS_KEY) { console.log('[sync] Meilisearch not configured, skipping.'); return; }

  syncState.running = true;
  syncState.lastError = null;
  console.log('[sync] Starting product sync…');

  try {
    const ms    = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
    const index = ms.index(MS_INDEX);

    await index.updateSettings({
      searchableAttributes: ['title', 'vendor', 'sku', 'tags', 'fitmentTags', 'categories', 'description'],
      filterableAttributes: ['vendor', 'categories', 'categoryHandles', 'onSale', 'stockStatus', 'price', 'fitmentTags', 'handle'],
      sortableAttributes:   ['price', 'regularPrice', 'dateCreated', 'totalSales', 'averageRating', 'title'],
      pagination:           { maxTotalHits: 10000 },
    });

    const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    const perPage = 100;
    const firstRes = await fetch(
      `${WC_URL}/wp-json/wc/v3/products?status=publish&per_page=${perPage}&page=1&_fields=${WC_SYNC_FIELDS}`,
      { headers: { Authorization: auth } }
    );
    if (!firstRes.ok) throw new Error(`WC API ${firstRes.status}: ${await firstRes.text().then(t => t.slice(0, 200))}`);

    const totalPages = parseInt(firstRes.headers.get('X-WP-TotalPages') || '1', 10);
    const firstPage  = await firstRes.json();
    const all = firstPage.map(normaliseMsProduct);

    for (let page = 2; page <= totalPages; page++) {
      const r = await fetch(
        `${WC_URL}/wp-json/wc/v3/products?status=publish&per_page=${perPage}&page=${page}&_fields=${WC_SYNC_FIELDS}`,
        { headers: { Authorization: auth } }
      );
      if (!r.ok) break;
      const data = await r.json();
      all.push(...data.map(normaliseMsProduct));
      await new Promise(res => setTimeout(res, 150));
    }

    await index.addDocuments(all, { primaryKey: 'id' });
    syncState.lastSync  = new Date().toISOString();
    syncState.lastCount = all.length;
    console.log(`[sync] Done — ${all.length} products synced`);
  } catch (err) {
    syncState.lastError = err.message;
    console.error('[sync] Failed:', err.message);
  } finally {
    syncState.running = false;
  }
}

// Re-sync specific products to Meilisearch (e.g. after order reduces stock)
async function handleSyncProducts(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (!MS_HOST || !MS_KEY) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, skipped: true }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { productIds } = JSON.parse(body);
      if (!Array.isArray(productIds) || productIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'productIds array required' }));
        return;
      }

      const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
      const ms    = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      const index = ms.index(MS_INDEX);
      const docs  = [];

      for (const id of productIds.slice(0, 50)) {
        try {
          const r = await fetch(
            `${WC_URL}/wp-json/wc/v3/products/${id}?_fields=${WC_SYNC_FIELDS}`,
            { headers: { Authorization: auth } }
          );
          if (r.ok) {
            const product = await r.json();
            docs.push(normaliseMsProduct(product));
          }
        } catch (err) {
          console.error(`[sync-products] Failed to fetch product ${id}:`, err.message);
        }
      }

      if (docs.length > 0) {
        await index.addDocuments(docs, { primaryKey: 'id' });
        console.log(`[sync-products] Upserted ${docs.length} products: ${docs.map(d => d.id).join(', ')}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, synced: docs.length }));
    } catch (err) {
      console.error('[sync-products] error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

// ── WooCommerce REST proxy ────────────────────────────────────────────────────
// Forwards whitelisted GET requests to ${WC_URL}/wp-json/wc/v3/* with server-side
// Basic auth. This replaces the old frontend pattern where VITE_WC_CONSUMER_KEY/
// SECRET were read via import.meta.env and baked into the client bundle — any
// visitor could extract them and hit WC with full read/write.
//
// Whitelist is intentionally narrow: only read-only product/category/brand paths.
// Sensitive endpoints (/customers, /orders, /reports, /settings) are NOT exposed.
const WC_PROXY_ALLOWED_PREFIXES = [
  'products',           // includes /products, /products/{id}, /products/{id}/variations
  'products/categories',
  'products/tags',
  'products/attributes',
  'brands',
];

function isWcPathAllowed(pathWithoutQuery) {
  // Strip leading slash, normalise, and match against the whitelist.
  const clean = pathWithoutQuery.replace(/^\/+/, '').replace(/\.\./g, '');
  // Reject path traversal and empty paths.
  if (!clean || clean.includes('..')) return false;
  return WC_PROXY_ALLOWED_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(prefix + '/') || clean.startsWith(prefix + '?')
  );
}

// Public read-only proxy for the vehicle_fitment taxonomy exposed by our
// elusive-auth-api WP plugin. Browser hits /api/elusive-vehicles/<sub> and we
// forward to /wp-json/elusive/v1/vehicles/<sub>. No auth — these endpoints
// are public; this proxy exists to keep all WP traffic same-origin (avoids
// CORS) and consistent with the rest of the app.
//   /api/elusive-vehicles/makes
//   /api/elusive-vehicles/models?make_id=N
//   /api/elusive-vehicles/submodels?model_id=N
//   /api/elusive-vehicles/term/N
const ELUSIVE_VEHICLE_ALLOWED = /^(makes|models|submodels|term\/\d+)$/;

async function handleElusiveVehicleProxy(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  if (!WC_URL) {
    res.writeHead(503, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'WC URL not configured' }));
    return;
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const afterPrefix = urlObj.pathname.replace(/^\/api\/elusive-vehicles\/?/, '');
  if (!ELUSIVE_VEHICLE_ALLOWED.test(afterPrefix)) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const target = `${WC_URL}/wp-json/elusive/v1/vehicles/${afterPrefix}${urlObj.search}`;
  try {
    const r = await fetch(target);
    const text = await r.text();
    res.writeHead(r.status, {
      'Content-Type': r.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=600',
      ...securityHeaders(),
    });
    res.end(text);
  } catch (err) {
    console.error('[elusive-vehicles] error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'Upstream error' }));
  }
}

async function handleWcProxy(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    res.writeHead(503, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'WC proxy not configured' }));
    return;
  }

  // Extract the path after /api/wc/ plus query string.
  const urlObj = new URL(req.url, 'http://localhost');
  const afterPrefix = urlObj.pathname.replace(/^\/api\/wc\/?/, '');
  if (!isWcPathAllowed(afterPrefix)) {
    console.warn(`[wc-proxy] blocked path: ${afterPrefix}`);
    res.writeHead(403, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'Endpoint not allowed' }));
    return;
  }

  const target = `${WC_URL}/wp-json/wc/v3/${afterPrefix}${urlObj.search}`;
  try {
    const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    const r = await fetch(target, { headers: { Authorization: auth } });
    const text = await r.text();
    // Forward status, content-type, and the two WP pagination headers the frontend relies on.
    const headers = {
      'Content-Type': r.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...securityHeaders(),
    };
    const total      = r.headers.get('x-wp-total');
    const totalPages = r.headers.get('x-wp-totalpages');
    if (total !== null)      headers['X-WP-Total'] = total;
    if (totalPages !== null) headers['X-WP-TotalPages'] = totalPages;
    res.writeHead(r.status, headers);
    res.end(text);
  } catch (err) {
    console.error('[wc-proxy] error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json', ...securityHeaders() });
    res.end(JSON.stringify({ error: 'WC upstream error' }));
  }
}

// Check live stock for a list of cart items against the WC REST API. Called immediately
// before Stripe confirmation so we don't take payment for items that went out of stock
// between add-to-cart and checkout.
//
// Body: { items: [{ id, quantity }] }
// Response: { ok, issues: [{ id, name, requested, available, reason }] }
//   - issues is empty when everything is fine
//   - reason ∈ 'out_of_stock' | 'insufficient_stock' | 'not_found'
async function handleCheckStock(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { items } = JSON.parse(body || '{}');
      if (!Array.isArray(items) || items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'items array required' }));
        return;
      }
      const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
      const issues = [];
      for (const item of items.slice(0, 100)) {
        const id = parseInt(item.id, 10);
        const requested = Math.max(1, parseInt(item.quantity, 10) || 1);
        if (!id) continue;
        try {
          const r = await fetch(
            `${WC_URL}/wp-json/wc/v3/products/${id}?_fields=id,name,stock_status,stock_quantity,manage_stock`,
            { headers: { Authorization: auth } }
          );
          if (!r.ok) {
            issues.push({ id, name: item.name || `Product ${id}`, requested, available: 0, reason: 'not_found' });
            continue;
          }
          const p = await r.json();
          if (p.stock_status === 'outofstock') {
            issues.push({ id, name: p.name, requested, available: 0, reason: 'out_of_stock' });
          } else if (p.manage_stock && typeof p.stock_quantity === 'number' && p.stock_quantity < requested) {
            issues.push({ id, name: p.name, requested, available: p.stock_quantity, reason: 'insufficient_stock' });
          }
        } catch (err) {
          console.error(`[check-stock] Failed to fetch product ${id}:`, err.message);
          // Fail open on network errors — better to let payment through than block customers
          // on a transient WC outage. Stock mismatch will be caught by WC at order creation.
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...securityHeaders() });
      res.end(JSON.stringify({ ok: issues.length === 0, issues }));
    } catch (err) {
      console.error('[check-stock] error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

async function handleSync(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (SYNC_TOKEN) {
    const header = req.headers['authorization'] || '';
    if (header !== `Bearer ${SYNC_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
  }
  if (syncState.running) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Sync already in progress' }));
    return;
  }
  res.writeHead(202, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ message: 'Sync started' }));
  runMsSync();
}

async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { messages, vehicle } = JSON.parse(body);

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid messages' }));
        return;
      }

      // Search for live product data — Meilisearch first (fast), fall back to WC API
      const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      let productContext = '';
      if (isProductQuery(latestUserMessage)) {
        const msResults = await msSearchForChat(latestUserMessage);
        const products  = msResults ?? await wcSearch(latestUserMessage);
        productContext  = buildProductContext(products);
      }

      const vehicleContext = vehicle?.make
        ? `\n\nCUSTOMER'S VEHICLE: ${[vehicle.make, vehicle.model, vehicle.submodel || vehicle.year].filter(Boolean).join(' ')}. Keep this in mind when recommending parts or answering fitment questions.`
        : '';

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT + vehicleContext + productContext,
        messages: messages.slice(-10),
      });

      const reply = response.content[0]?.text || "Sorry, I couldn't process that. Please try again or call us on 03 9574 1710.";

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error('Chat API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Something went wrong. Please try again.' }));
    }
  });
}

// ── Admin auth helpers ────────────────────────────────────────────────────────

function signAdminToken(username) {
  const payload = { sub: username, exp: Date.now() + 8 * 60 * 60 * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function requireAdminAuth(req, res) {
  const auth = req.headers['authorization'] || '';
  if (!verifyAdminToken(auth.startsWith('Bearer ') ? auth.slice(7) : null)) {
    res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Unauthorised' }));
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
}

function adminJson(res, status, data, req = null) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': req ? corsOrigin(req) : '*',
    'Vary': 'Origin',
    ...securityHeaders(),
  });
  res.end(JSON.stringify(data));
}

// ── Admin route handlers ──────────────────────────────────────────────────────

async function handleAdminLogin(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  const ip = getClientIp(req);
  const gate = checkAdminLoginRate(ip);
  if (!gate.allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(gate.retryAfterSec),
      'Access-Control-Allow-Origin': corsOrigin(req),
      'Vary': 'Origin',
      ...securityHeaders(),
    });
    res.end(JSON.stringify({ error: `Too many login attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).` }));
    return;
  }
  try {
    const { username, password } = await readBody(req);
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return adminJson(res, 503, { error: 'Admin credentials not configured on server.' }, req);
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      recordAdminLoginFailure(ip);
      console.warn(`[admin-login] failed attempt from ${ip} (user="${username}")`);
      return adminJson(res, 401, { error: 'Invalid username or password.' }, req);
    }
    clearAdminLoginAttempts(ip);
    adminJson(res, 200, { token: signAdminToken(username), username }, req);
  } catch {
    res.writeHead(400); res.end();
  }
}

async function handleAdminListProducts(req, res) {
  if (!requireAdminAuth(req, res)) return;
  const url     = new URL(req.url, 'http://localhost');
  const page    = url.searchParams.get('page')     || '1';
  const perPage = url.searchParams.get('per_page') || '20';
  const search  = url.searchParams.get('search')   || '';
  const status  = url.searchParams.get('status')   || 'any';
  try {
    const params = new URLSearchParams({
      page, per_page: perPage, status,
      _fields: 'id,name,slug,sku,price,regular_price,sale_price,stock_status,status,images,categories,attributes,brands,short_description,date_created,total_sales',
    });
    if (search) params.set('search', search);
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/products?${params}`, { headers: { Authorization: wcAuth() } });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    const products   = await r.json();
    const total      = parseInt(r.headers.get('X-WP-Total')      || '0', 10);
    const totalPages = parseInt(r.headers.get('X-WP-TotalPages') || '1', 10);
    adminJson(res, 200, { products, total, totalPages });
  } catch (err) {
    console.error('[admin] list products:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch products.' });
  }
}

async function handleAdminGetProduct(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/products/${id}`, { headers: { Authorization: wcAuth() } });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, await r.json());
  } catch (err) {
    console.error('[admin] get product:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch product.' });
  }
}

async function handleAdminProductImageUpload(req, res) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  try {
    const { imageBase64, mimeType } = await readBody(req);
    const ext = (mimeType || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(__dirname, 'dist', 'uploads', 'products');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, safeName), Buffer.from(imageBase64, 'base64'));
    adminJson(res, 200, { url: `/uploads/products/${safeName}` });
  } catch (err) {
    console.error('[admin] product image upload:', err.message);
    adminJson(res, 500, { error: 'Failed to upload image.' });
  }
}

async function handleAdminCreateProduct(req, res) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const data = await readBody(req);
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify(data),
    });
    const product = await r.json();
    if (!r.ok) return adminJson(res, 400, { error: product.message || 'Failed to create product.' });
    // Sync new product to Meilisearch immediately
    if (MS_HOST && MS_KEY) {
      const ms = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      await ms.index(MS_INDEX).addDocuments([normaliseMsProduct(product)], { primaryKey: 'id' });
    }
    adminJson(res, 201, product);
  } catch (err) {
    console.error('[admin] create product:', err.message);
    adminJson(res, 500, { error: 'Failed to create product.' });
  }
}

async function handleAdminUpdateProduct(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const data = await readBody(req);
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify(data),
    });
    const product = await r.json();
    if (!r.ok) return adminJson(res, 400, { error: product.message || 'Failed to update product.' });
    // Upsert in Meilisearch
    if (MS_HOST && MS_KEY) {
      const ms = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      await ms.index(MS_INDEX).addDocuments([normaliseMsProduct(product)], { primaryKey: 'id' });
    }
    adminJson(res, 200, product);
  } catch (err) {
    console.error('[admin] update product:', err.message);
    adminJson(res, 500, { error: 'Failed to update product.' });
  }
}

async function handleAdminDeleteProduct(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/products/${id}?force=true`, {
      method: 'DELETE',
      headers: { Authorization: wcAuth() },
    });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    // Remove from Meilisearch
    if (MS_HOST && MS_KEY) {
      const ms = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      await ms.index(MS_INDEX).deleteDocument(String(id));
    }
    adminJson(res, 200, { success: true });
  } catch (err) {
    console.error('[admin] delete product:', err.message);
    adminJson(res, 500, { error: 'Failed to delete product.' });
  }
}

// ── Promo Banner ─────────────────────────────────────────────────────────────

const PROMO_FILE = path.join(__dirname, 'data', 'promo-banner.json');

const PROMO_DEFAULTS = {
  visible: true,
  title: 'Performance Parts',
  subtitle: '10% off all in stock products',
  subtext: "Don't miss out on our best deals of the season!",
  image: '/promo-banner.jpg',
  ctaLabel: 'Shop Sale Now',
  ctaUrl: '/shop?sale=1',
};

function readPromoBanner() {
  try {
    return JSON.parse(fs.readFileSync(PROMO_FILE, 'utf8'));
  } catch {
    return { ...PROMO_DEFAULTS };
  }
}

function writePromoBanner(data) {
  fs.mkdirSync(path.dirname(PROMO_FILE), { recursive: true });
  fs.writeFileSync(PROMO_FILE, JSON.stringify(data, null, 2));
}

async function handleAdminGetPromoBanner(req, res) {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  adminJson(res, 200, readPromoBanner());
}

async function handleAdminSavePromoBanner(req, res) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'PUT') { res.writeHead(405); res.end(); return; }
  try {
    const body = await readBody(req);
    const current = readPromoBanner();
    const updated = { ...current, ...body };
    writePromoBanner(updated);
    adminJson(res, 200, updated);
  } catch (err) {
    console.error('[admin] save promo banner:', err.message);
    adminJson(res, 500, { error: 'Failed to save.' });
  }
}

async function handleAdminPromoBannerImage(req, res) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  try {
    const { imageBase64, mimeType } = await readBody(req);
    const ext = (mimeType || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
    const filename = `promo-banner.${ext}`;
    const dest = path.join(__dirname, 'public', filename);
    fs.writeFileSync(dest, Buffer.from(imageBase64, 'base64'));
    adminJson(res, 200, { url: `/${filename}` });
  } catch (err) {
    console.error('[admin] promo banner image upload:', err.message);
    adminJson(res, 500, { error: 'Failed to upload image.' });
  }
}

async function handleAdminTags(req, res) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const r = await fetch(
      `${WC_URL}/wp-json/wc/v3/products/tags?per_page=100&orderby=count&order=desc`,
      { headers: { Authorization: wcAuth() } }
    );
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, await r.json());
  } catch (err) {
    console.error('[admin] tags:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch tags.' });
  }
}

async function handleAdminCategories(req, res) {
  if (!requireAdminAuth(req, res)) return;
  try {
    const r = await fetch(
      `${WC_URL}/wp-json/wc/v3/products/categories?per_page=100&orderby=name&order=asc&_fields=id,name,slug,parent`,
      { headers: { Authorization: wcAuth() } }
    );
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, await r.json());
  } catch (err) {
    console.error('[admin] categories:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch categories.' });
  }
}

// ── Admin: Users / Customers ─────────────────────────────────────────────────
// Wraps WC customers API. The "pending" role filter is synthetic — it maps
// to role=customer + meta_data wholesale_status=pending.

function summariseCustomer(c) {
  const meta = Array.isArray(c.meta_data) ? c.meta_data : [];
  const readMeta = key => meta.find(m => m.key === key)?.value || '';

  // Pending detection supports both the legacy Wholesale Suite (WWLC) plugin
  // (role=wwlc_unapproved + wwlc_is_user_active=no) and the new native flow
  // (role=customer + wholesale_status=pending).
  const wwlcActive    = readMeta('wwlc_is_user_active'); // 'yes' | 'no' | ''
  const wwlcRequested = readMeta('wwlc_role');           // requested tier
  let wholesaleStatus = readMeta('wholesale_status') || null;
  if (!wholesaleStatus) {
    if (c.role === 'wwlc_unapproved' || wwlcActive === 'no') wholesaleStatus = 'pending';
    else if (wwlcActive === 'yes' && (c.role || '').startsWith('wholesale_customer')) wholesaleStatus = 'approved';
  }

  return {
    id:              c.id,
    email:           c.email,
    firstName:       c.first_name || '',
    lastName:        c.last_name  || '',
    username:        c.username || '',
    role:            c.role || 'customer',
    avatarUrl:       c.avatar_url || '',
    dateCreated:     c.date_created || '',
    billing:         c.billing  || null,
    shipping:        c.shipping || null,
    storeCredit:     parseFloat(c?.store_credit?.balances?.[0]?.available_balance ?? 0) || 0,
    wholesaleStatus: wholesaleStatus,
    wholesaleRequestedTier: wwlcRequested || null,
    wholesale: {
      abn:          readMeta('wholesale_abn')           || readMeta('wwlc_cf_abn'),
      businessType: readMeta('wholesale_business_type'),
      website:      readMeta('wholesale_website'),
      hearAbout:    readMeta('wholesale_hear_about'),
      notes:        readMeta('wholesale_notes'),
      appliedAt:    readMeta('wholesale_applied_at')    || readMeta('wwlc_approval_date'),
      companyName:  readMeta('wwlc_company_name')       || c.billing?.company || '',
      phone:        readMeta('wwlc_phone')              || c.billing?.phone   || '',
    },
  };
}

async function handleAdminListUsers(req, res) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const url     = new URL(req.url, 'http://localhost');
  const page    = url.searchParams.get('page')     || '1';
  const perPage = url.searchParams.get('per_page') || '20';
  const search  = url.searchParams.get('search')   || '';
  const role    = url.searchParams.get('role')     || 'all';

  try {
    // Pending wholesale applications live under WC role `wwlc_unapproved`
    // (from the Wholesale Suite plugin). Filtering by that role is fast
    // because WC handles the paging for us.
    const wcRole = role === 'pending' ? 'wwlc_unapproved'
                 : (role && role !== 'all') ? role
                 : 'all';

    const params = new URLSearchParams({
      page, per_page: perPage,
      role: wcRole,
      orderby: 'registered_date',
      order:   'desc',
    });
    if (search) params.set('search', search);

    const r = await fetch(`${WC_URL}/wp-json/wc/v3/customers?${params}`, {
      headers: { Authorization: wcAuth() },
    });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    const raw        = await r.json();
    const total      = parseInt(r.headers.get('X-WP-Total')      || String(raw.length), 10);
    const totalPages = parseInt(r.headers.get('X-WP-TotalPages') || '1', 10);

    adminJson(res, 200, {
      users: raw.map(summariseCustomer),
      total,
      totalPages,
    });
  } catch (err) {
    console.error('[admin] list users:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch users.' });
  }
}

async function handleAdminGetUser(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  try {
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${id}`, {
      headers: { Authorization: wcAuth() },
    });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    const c = await r.json();
    adminJson(res, 200, summariseCustomer(c));
  } catch (err) {
    console.error('[admin] get user:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch user.' });
  }
}

function isValidUserRole(role) {
  if (role === 'customer') return true;
  return readWsTiers().some(t => t.role === role);
}

async function updateCustomerRoleAndMeta(id, role, extraMeta = []) {
  const payload = { role };
  if (extraMeta.length) payload.meta_data = extraMeta;
  const r = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify(payload),
  });
  return r;
}

// Meta payload that also syncs the Wholesale Suite plugin's approval state.
function wsApprovedMeta(role) {
  return [
    { key: 'wholesale_status',     value: '' },
    { key: 'wwlc_is_user_active',  value: 'yes' },
    { key: 'wwlc_role',            value: role },
    { key: 'wwlc_custom_set_role', value: role },
  ];
}

function wsRejectedMeta() {
  return [
    { key: 'wholesale_status',    value: 'rejected' },
    { key: 'wwlc_is_user_active', value: 'no' },
  ];
}

async function handleAdminUpdateUserRole(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'PUT') { res.writeHead(405); res.end(); return; }
  try {
    const { role } = await readBody(req);
    if (!isValidUserRole(role)) return adminJson(res, 400, { error: 'Invalid role.' });
    // Promoting to a wholesale tier clears any pending/rejected flag AND
    // syncs the Wholesale Suite plugin so it recognises the user.
    const extraMeta = isWsRole(role) ? wsApprovedMeta(role) : [];
    const r = await updateCustomerRoleAndMeta(id, role, extraMeta);
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, summariseCustomer(await r.json()));
  } catch (err) {
    console.error('[admin] update user role:', err.message);
    adminJson(res, 500, { error: 'Failed to update role.' });
  }
}

async function handleAdminApproveUser(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  try {
    const { role } = await readBody(req);
    if (!isWsRole(role) || !isValidUserRole(role)) {
      return adminJson(res, 400, { error: 'Approve requires a wholesale tier role.' });
    }
    const r = await updateCustomerRoleAndMeta(id, role, wsApprovedMeta(role));
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, summariseCustomer(await r.json()));
  } catch (err) {
    console.error('[admin] approve user:', err.message);
    adminJson(res, 500, { error: 'Failed to approve user.' });
  }
}

async function handleAdminRejectUser(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  try {
    const r = await updateCustomerRoleAndMeta(id, 'customer', wsRejectedMeta());
    if (!r.ok) throw new Error(`WC ${r.status}`);
    adminJson(res, 200, summariseCustomer(await r.json()));
  } catch (err) {
    console.error('[admin] reject user:', err.message);
    adminJson(res, 500, { error: 'Failed to reject user.' });
  }
}

// Public read-only echo of the tier list so the frontend can refresh
// labels/discounts at runtime without exposing admin endpoints.
async function handlePublicWsTiers(req, res) {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  });
  res.end(JSON.stringify({ tiers: readWsTiers() }));
}

// ── WooCommerce product webhooks ──────────────────────────────────────────────
// Register these in WC: WooCommerce → Settings → Advanced → Webhooks
// Delivery URL: https://your-domain/api/webhook/product-updated  (etc.)

async function handleProductWebhook(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const p = JSON.parse(body);
      if (!MS_HOST || !MS_KEY) { res.writeHead(200); res.end(); return; }
      const ms    = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      const index = ms.index(MS_INDEX);
      const doc   = normaliseMsProduct(p);
      await index.addDocuments([doc], { primaryKey: 'id' });
      console.log(`[webhook] Upserted product ${doc.id} (${doc.title})`);
      res.writeHead(200); res.end();
    } catch (err) {
      console.error('[webhook] upsert error:', err.message);
      res.writeHead(500); res.end();
    }
  });
}

async function handleProductDeleteWebhook(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const p = JSON.parse(body);
      if (!MS_HOST || !MS_KEY) { res.writeHead(200); res.end(); return; }
      const ms    = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      const index = ms.index(MS_INDEX);
      await index.deleteDocument(String(p.id));
      console.log(`[webhook] Deleted product ${p.id}`);
      res.writeHead(200); res.end();
    } catch (err) {
      console.error('[webhook] delete error:', err.message);
      res.writeHead(500); res.end();
    }
  });
}

// ── Shipping rates proxy ──────────────────────────────────────────────────────
// Calls WooCommerce Store API server-side to avoid CORS/credential issues.
// Each call manages its own ephemeral WC session (cookie + nonce).
//
// WC Store API requires:
//   - Session cookie (from first GET /cart response)
//   - Nonce header on all write (POST/PUT) requests
//     → WC returns this as X-WC-Store-API-Nonce on GET responses
async function getShippingRatesServer(items, address) {
  const storeBase = `${WC_URL}/wp-json/wc/store/v1`;
  let sessionCookie = '';
  let nonce = '';

  function captureHeaders(res) {
    // Node 18+ native fetch returns Set-Cookie headers via getSetCookie() as a proper
    // array, avoiding comma-split bugs where session values contain commas.
    const cookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') || '').split(/,(?=[^ ])/).map(c => c.trim()).filter(Boolean);

    if (cookies.length) {
      // Merge into existing cookie jar — WC only returns changed cookies per response
      // (e.g. add-item only returns cart_hash, not the session cookie). If we replace
      // entirely we lose the session cookie and all subsequent requests start fresh.
      const jar = new Map(
        sessionCookie.split('; ').filter(Boolean).map(kv => [kv.split('=')[0], kv])
      );
      for (const c of cookies) {
        const kv = c.split(';')[0].trim();
        if (kv) jar.set(kv.split('=')[0], kv);
      }
      sessionCookie = [...jar.values()].join('; ');
    }
    // Capture nonce — WC returns it on GET /cart responses so writes can use it
    const n = res.headers.get('X-WC-Store-API-Nonce')
           || res.headers.get('Nonce')
           || res.headers.get('X-WooCommerce-StoreApiNonce');
    if (n) nonce = n;
  }

  async function storeReq(path, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };
    if (sessionCookie) headers['Cookie']  = sessionCookie;
    if (nonce && method !== 'GET') headers['Nonce'] = nonce;

    const res = await fetch(`${storeBase}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    captureHeaders(res);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log(`[shipping] ${method} ${path} → ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }
    return res.json().catch(() => null);
  }

  // 1. GET /cart — establishes session cookie AND returns the nonce we need for writes
  const existingCart = await storeReq(`/cart?_=${Date.now()}`);
  console.log(`[shipping] GET /cart ok=${!!existingCart} nonce=${nonce ? 'yes' : 'no'} cookie=${sessionCookie ? 'yes' : 'no'}`);

  // 2. Clear any existing items from this session
  if (existingCart?.items?.length) {
    for (const item of existingCart.items) {
      await storeReq('/cart/remove-item', 'POST', { key: item.key });
    }
  }

  // 3. Add the customer's current cart items
  for (const item of items) {
    const productId = parseInt(item.id, 10);
    const variantId = item.variantId && item.variantId !== item.id ? parseInt(item.variantId, 10) : null;
    const added = await storeReq('/cart/add-item', 'POST', { id: variantId ?? productId, quantity: item.quantity });
    console.log(`[shipping] add-item ${variantId ?? productId} → ok=${!!added}`);
  }

  // 4. Set the shipping address — the update-customer RESPONSE is the recalculated cart.
  //    WC recalculates shipping rates as part of processing the address update and
  //    returns the updated cart inline, so we use that response directly rather than
  //    a subsequent GET /cart (which returns the pre-update cached snapshot).
  //    Pass the full address — UPS/FX plugins need state + postcode to calculate
  //    live rates. If WC rejects an invalid postcode/state the call returns null,
  //    rates stay empty, and the frontend shows the "contact us" card.
  const cartData = await storeReq('/cart/update-customer', 'POST', {
    shipping_address: {
      first_name: '', last_name: '',
      address_1: address.address1 || '',
      address_2: address.address2 || '',
      city:      address.city     || '',
      state:     address.state    || '',
      postcode:  address.postcode || '',
      country:   address.country  || 'AU',
    },
  });

  // WC Store API prices are in minor units (cents)
  const scale = 100;
  const rawRates = cartData?.shipping_rates?.[0]?.shipping_rates ?? [];
  const rates = rawRates.map(r => ({
    id:       r.rate_id,
    label:    r.name + (r.description ? ` — ${r.description}` : ''),
    price:    parseInt(r.price || '0', 10) / scale,
    methodId: r.method_id,
  }));

  const taxAmount = cartData?.totals ? parseInt(cartData.totals.total_tax || '0', 10) / scale : 0;
  console.log(`[shipping] result → ${rates.length} rates, tax=${taxAmount}`);

  return { rates, taxAmount };
}

async function handleShippingRates(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { items, address } = JSON.parse(body);
      const result = await getShippingRatesServer(items || [], address || {});
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Shipping rates error:', err);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ rates: [], taxAmount: 0 }));
    }
  });
}

// ── Auth: login + register (proxied to avoid CORS, keeps WC keys server-side) ─
// Requires "JWT Authentication for WP REST API" plugin on the WordPress site.
async function handleAuthLogin(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { email, password } = JSON.parse(body);
      const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

      // 1. Authenticate via custom Elusive Auth plugin
      const authRes = await fetch(`${WC_URL}/wp-json/elusive/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Invalid email or password.' }));
        return;
      }

      const authData = await authRes.json();

      // 2. Fetch WC customer record by email for name + saved addresses
      //    role=all is required because WC defaults to role=customer and
      //    would miss wholesale_customer_1 etc.
      const custRes = await fetch(
        `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&per_page=1&role=all`,
        { headers: { Authorization: auth } }
      );
      let customer = null;
      if (custRes.ok) {
        const list = await custRes.json();
        customer = list[0] ?? null;
        console.log(`[login] WC customer lookup for ${email}: found=${!!customer}, role=${customer?.role ?? 'N/A'}, id=${customer?.id ?? 'N/A'}`);
      } else {
        console.log(`[login] WC customer lookup failed for ${email}: ${custRes.status}`);
      }

      const displayName = authData.user_display_name || '';
      const wholesaleStatus = (customer?.meta_data || []).find(m => m.key === 'wholesale_status')?.value || null;
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        token: authData.token,
        user: {
          id:              customer?.id   ?? null,
          email:           authData.user_email,
          firstName:       customer?.first_name || displayName.split(' ')[0] || '',
          lastName:        customer?.last_name  || displayName.split(' ').slice(1).join(' ') || '',
          phone:           customer?.billing?.phone || '',
          avatarUrl:       customer?.avatar_url ?? null,
          memberSince:     customer?.date_created ?? null,
          storeCredit:     customer?.store_credit?.balances?.[0]?.available_balance ?? 0,
          role:            customer?.role ?? 'customer',
          wholesaleStatus: wholesaleStatus,
          wholesaleTier: isWsRole(customer?.role) ? {
            role:       customer.role,
            tierNumber: getWsTier(customer.role)?.tierNumber ?? 0,
            label:      getWsTier(customer.role)?.label ?? 'Wholesale',
            discount:   getWsTier(customer.role)?.discount ?? 0,
            metaKey:    getWsTier(customer.role)?.metaKey ?? null,
          } : null,
          billing:         customer?.billing  ?? null,
          shipping:        customer?.shipping ?? null,
        },
      }));
    } catch (err) {
      console.error('Login error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Login failed. Please try again.' }));
    }
  });
}

async function handleAuthRegister(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { email, password, firstName, lastName } = JSON.parse(body);
      const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

      // 1. Create customer via WC REST API
      const createRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ email, first_name: firstName, last_name: lastName, username: email, password }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Could not create account. Email may already be in use.' }));
        return;
      }

      const customer = await createRes.json();

      // 2. Auto-login via Elusive Auth plugin
      const authRes = await fetch(`${WC_URL}/wp-json/elusive/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const authData = authRes.ok ? await authRes.json() : null;

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        token: authData?.token ?? null,
        user: {
          id:        customer.id,
          email:     customer.email,
          firstName: customer.first_name,
          lastName:  customer.last_name,
          billing:   customer.billing  ?? null,
          shipping:  customer.shipping ?? null,
        },
      }));
    } catch (err) {
      console.error('Register error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Registration failed. Please try again.' }));
    }
  });
}

async function handleWholesaleRegister(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const d = JSON.parse(body);
      const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

      // Create customer as regular 'customer' with wholesale_status=pending.
      // Admin must approve and assign a wholesale tier before they get
      // wholesale pricing. This replaces the old auto-approve flow.
      const createRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          email:      d.email,
          first_name: d.firstName,
          last_name:  d.lastName,
          username:   d.email,
          password:   d.password,
          role:       'customer',
          billing: {
            first_name: d.firstName,
            last_name:  d.lastName,
            company:    d.businessName || '',
            address_1:  d.address || '',
            city:       d.suburb || '',
            state:      d.state || '',
            postcode:   d.postcode || '',
            country:    'AU',
            email:      d.email,
            phone:      d.phone || '',
          },
          meta_data: [
            { key: 'wholesale_status',        value: 'pending' },
            { key: 'wholesale_abn',           value: d.abn || '' },
            { key: 'wholesale_business_type', value: d.businessType || '' },
            { key: 'wholesale_website',       value: d.website || '' },
            { key: 'wholesale_hear_about',    value: d.hearAbout || '' },
            { key: 'wholesale_notes',         value: d.notes || '' },
            { key: 'wholesale_applied_at',    value: new Date().toISOString() },
          ],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Could not submit wholesale application. Email may already be in use.' }));
        return;
      }

      const customer = await createRes.json();

      // Auto-login so the user lands on their account page
      const authRes = await fetch(`${WC_URL}/wp-json/elusive/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: d.email, password: d.password }),
      });
      const authData = authRes.ok ? await authRes.json() : null;

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        token: authData?.token ?? null,
        pending: true,
        message: "Application received — we'll email you once it's approved.",
        user: {
          id:             customer.id,
          email:          customer.email,
          firstName:      customer.first_name,
          lastName:       customer.last_name,
          role:           'customer',
          wholesaleStatus: 'pending',
          wholesaleTier:  null,
          billing:        customer.billing  ?? null,
          shipping:       customer.shipping ?? null,
        },
      }));
    } catch (err) {
      console.error('Wholesale register error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Registration failed. Please try again.' }));
    }
  });
}

// Request a password-reset email. Always returns a generic 200 to avoid
// leaking which emails are registered (email enumeration defence).
async function handleLostPassword(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  const ip = getClientIp(req);
  const gate = checkPwResetRate(ip);
  if (!gate.allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(gate.retryAfterSec),
      'Access-Control-Allow-Origin': corsOrigin(req),
      'Vary': 'Origin',
    });
    res.end(JSON.stringify({ error: `Too many attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).` }));
    return;
  }
  recordPwResetAttempt(ip);

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    const genericOk = () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin(req), 'Vary': 'Origin' });
      res.end(JSON.stringify({ ok: true, message: "If an account with that email exists, we've sent a password reset link." }));
    };

    try {
      const { email } = JSON.parse(body || '{}');
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        // Still return the generic success — don't hint at validation either.
        return genericOk();
      }

      // Fire at WP but don't gate the response on it. WP plugin also returns 200
      // regardless of whether the email matched a user.
      try {
        await fetch(`${WC_URL}/wp-json/elusive/v1/lost-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (err) {
        console.error('[lost-password] WP call failed:', err?.message || err);
      }

      genericOk();
    } catch (err) {
      console.error('[lost-password] error:', err);
      genericOk();
    }
  });
}

// Consume a reset key + login from the email and set a new password.
async function handleResetPassword(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  const ip = getClientIp(req);
  const gate = checkPwResetRate(ip);
  if (!gate.allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(gate.retryAfterSec),
      'Access-Control-Allow-Origin': corsOrigin(req),
      'Vary': 'Origin',
    });
    res.end(JSON.stringify({ error: `Too many attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).` }));
    return;
  }
  recordPwResetAttempt(ip);

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { key, login, password } = JSON.parse(body || '{}');

      if (!key || !login || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin(req), 'Vary': 'Origin' });
        res.end(JSON.stringify({ error: 'Reset key, login and new password are all required.' }));
        return;
      }
      if (typeof password !== 'string' || password.length < 8) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin(req), 'Vary': 'Origin' });
        res.end(JSON.stringify({ error: 'Password must be at least 8 characters.' }));
        return;
      }

      const wpRes = await fetch(`${WC_URL}/wp-json/elusive/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, login, password }),
      });

      const data = await wpRes.json().catch(() => ({}));
      res.writeHead(wpRes.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin(req), 'Vary': 'Origin' });
      if (wpRes.ok) {
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.end(JSON.stringify({ error: data.message || 'Could not reset password. Please request a new link.' }));
      }
    } catch (err) {
      console.error('[reset-password] error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin(req), 'Vary': 'Origin' });
      res.end(JSON.stringify({ error: 'Could not reset password. Please try again.' }));
    }
  });
}

// Update a signed-in customer's own profile (name, email, phone, addresses).
// Auth: the user's login token is verified via /elusive/v1/verify (the Elusive
// Auth plugin's HMAC check) to resolve the authenticated user ID. The client
// never supplies the customer ID, so this route cannot be used to edit another
// user's record.
async function handleUpdateAccountProfile(req, res) {
  if (req.method !== 'PUT') { res.writeHead(405); res.end(); return; }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not signed in.' }));
    return;
  }

  try {
    // 1. Resolve authenticated user by verifying the Elusive token against WP.
    const token = authHeader.slice(7).trim();
    const verifyRes = await fetch(`${WC_URL}/wp-json/elusive/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!verifyRes.ok) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session expired. Please sign in again.' }));
      return;
    }
    const me = await verifyRes.json();
    const userId = me?.user_id;
    if (!userId) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Could not identify your account.' }));
      return;
    }

    // 2. Whitelist the request body. Anything not listed is dropped, so the
    // client can never escalate role, change password, inject meta, etc.
    const raw = await readBody(req);
    const ADDRESS_KEYS = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country'];
    const BILLING_KEYS = [...ADDRESS_KEYS, 'email', 'phone'];
    const pick = (obj, keys) => {
      const out = {};
      if (!obj || typeof obj !== 'object') return out;
      for (const k of keys) if (typeof obj[k] === 'string') out[k] = obj[k].trim();
      return out;
    };

    const payload = {};
    if (typeof raw.first_name === 'string') payload.first_name = raw.first_name.trim();
    if (typeof raw.last_name  === 'string') payload.last_name  = raw.last_name.trim();
    if (typeof raw.email      === 'string') payload.email      = raw.email.trim();
    if (raw.billing  && typeof raw.billing  === 'object') payload.billing  = pick(raw.billing,  BILLING_KEYS);
    if (raw.shipping && typeof raw.shipping === 'object') payload.shipping = pick(raw.shipping, ADDRESS_KEYS);

    if (payload.email && (!payload.email.includes('@') || payload.email.length > 254)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
      return;
    }

    if (Object.keys(payload).length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No fields to update.' }));
      return;
    }

    // 3. Write to WooCommerce with server credentials.
    const wcRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify(payload),
    });
    const customer = await wcRes.json().catch(() => ({}));

    if (!wcRes.ok) {
      if (customer?.code === 'registration-error-email-exists') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'That email is already in use.' }));
        return;
      }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: customer?.message || 'Could not save changes. Please try again.' }));
      return;
    }

    // 4. Return a user shape matching the login handler so the client can
    // hand it straight to authStore.updateUser().
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id:        customer.id,
      email:     customer.email,
      firstName: customer.first_name || '',
      lastName:  customer.last_name  || '',
      phone:     customer.billing?.phone || '',
      billing:   customer.billing  ?? null,
      shipping:  customer.shipping ?? null,
    }));
  } catch (err) {
    console.error('[account/profile] error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not save changes. Please try again.' }));
  }
}

function trimOrderDetail(o) {
  return {
    id:              o.id,
    number:          o.number,
    status:          o.status,
    currency_symbol: o.currency_symbol || '$',
    date_created:    o.date_created,
    date_paid:       o.date_paid,
    total:           o.total,
    subtotal:        o.line_items?.reduce((s, li) => s + parseFloat(li.subtotal || 0), 0).toFixed(2),
    discount_total:  o.discount_total,
    shipping_total:  o.shipping_total,
    total_tax:       o.total_tax,
    payment_method_title: o.payment_method_title || '',
    shipping_method: o.shipping_lines?.[0]?.method_title || '',
    customer_note:   o.customer_note || '',
    customer: {
      id:         o.customer_id,
      email:      o.billing?.email || '',
      first_name: o.billing?.first_name || '',
      last_name:  o.billing?.last_name || '',
    },
    billing:  o.billing  || {},
    shipping: o.shipping || {},
    line_items: (o.line_items || []).map(li => ({
      id:           li.id,
      name:         li.name,
      product_id:   li.product_id,
      sku:          li.sku,
      quantity:     li.quantity,
      price:        li.price,
      total:        li.total,
      image:        li.image?.src || null,
    })),
    refunds: o.refunds || [],
    tracking: (() => {
      const meta = o.meta_data?.find(m => m.key === '_wc_shipment_tracking_items');
      if (meta?.value && Array.isArray(meta.value)) {
        return meta.value.map(t => {
          // date_shipped is a Unix timestamp string in this plugin's meta
          let iso = '';
          if (t.date_shipped) {
            const ts = parseInt(t.date_shipped, 10);
            if (!Number.isNaN(ts)) iso = new Date(ts * 1000).toISOString();
          }
          return {
            tracking_id:     t.tracking_id || '',
            provider:        t.tracking_provider || t.custom_tracking_provider || '',
            tracking_number: t.tracking_number || '',
            tracking_link:   t.custom_tracking_link || '',
            date_shipped:    iso,
          };
        });
      }
      return [];
    })(),
  };
}

async function handleGetOrders(req, res) {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const customerId = new URL(req.url, 'http://localhost').searchParams.get('customer');
  if (!customerId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing customer ID' }));
    return;
  }
  try {
    const ordersRes = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=20&orderby=date&order=desc`,
      { headers: { Authorization: wcAuth() } }
    );
    if (!ordersRes.ok) throw new Error('WC orders fetch failed');
    const raw = await ordersRes.json();
    const orders = raw.map(trimOrderDetail);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(orders));
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch orders.' }));
  }
}

async function handleAdminListOrders(req, res) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const url     = new URL(req.url, 'http://localhost');
  const page    = url.searchParams.get('page')     || '1';
  const perPage = url.searchParams.get('per_page') || '20';
  const status  = url.searchParams.get('status')   || 'any';
  const search  = url.searchParams.get('search')   || '';
  try {
    const params = new URLSearchParams({
      page, per_page: perPage,
      status,
      orderby: 'date',
      order:   'desc',
    });
    if (search) params.set('search', search);
    const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() },
    });
    if (!r.ok) throw new Error(`WC ${r.status}`);
    const raw        = await r.json();
    const total      = parseInt(r.headers.get('X-WP-Total')      || String(raw.length), 10);
    const totalPages = parseInt(r.headers.get('X-WP-TotalPages') || '1', 10);
    const orders = raw.map(o => {
      const metaGet = (keys) => {
        for (const k of keys) {
          const m = o.meta_data?.find(x => x.key === k);
          if (m && m.value) return m.value;
        }
        return '';
      };
      const invoiceNumber = metaGet([
        '_wcpdf_invoice_number_formatted',
        '_wcpdf_formatted_invoice_number',
        '_wcpdf_invoice_number',
      ]);
      const wholesaleMeta = metaGet([
        '_wwpp_wholesale_role',
        '_wholesale_role',
      ]);
      const orderType = wholesaleMeta ? 'Wholesale' : 'Retail';
      return {
        id:              o.id,
        number:          o.number,
        invoice_number:  invoiceNumber || '',
        status:          o.status,
        currency_symbol: o.currency_symbol || '$',
        date_created:    o.date_created,
        total:           o.total,
        order_type:      orderType,
        payment_method_title: o.payment_method_title || '',
        line_items_count: (o.line_items || []).reduce((s, li) => s + (li.quantity || 0), 0),
        customer: {
          id:         o.customer_id,
          email:      o.billing?.email || '',
          first_name: o.billing?.first_name || '',
          last_name:  o.billing?.last_name || '',
        },
      };
    });
    adminJson(res, 200, { orders, total, totalPages });
  } catch (err) {
    console.error('[admin] list orders:', err.message);
    adminJson(res, 500, { error: 'Failed to fetch orders.' });
  }
}

async function handleAdminGetOrder(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}`, {
        headers: { Authorization: wcAuth() },
      });
      if (!r.ok) throw new Error(`WC ${r.status}`);
      const raw = await r.json();
      adminJson(res, 200, trimOrderDetail(raw));
    } catch (err) {
      console.error('[admin] get order:', err.message);
      adminJson(res, 500, { error: 'Failed to fetch order.' });
    }
    return;
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', c => { body += c.toString(); });
    req.on('end', async () => {
      try {
        const { status } = JSON.parse(body || '{}');
        if (!status) {
          adminJson(res, 400, { error: 'Missing status' });
          return;
        }
        const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}`, {
          method: 'PUT',
          headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          adminJson(res, r.status, { error: data?.message || `WC ${r.status}` });
          return;
        }
        adminJson(res, 200, trimOrderDetail(data));
      } catch (err) {
        console.error('[admin] update order:', err.message);
        adminJson(res, 500, { error: 'Failed to update order.' });
      }
    });
    return;
  }
  res.writeHead(405); res.end();
}

async function handleAdminGetOrderNotes(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}/notes?per_page=100`, {
        headers: { Authorization: wcAuth() },
      });
      if (!r.ok) throw new Error(`WC ${r.status}`);
      const notes = await r.json();
      adminJson(res, 200, notes.map(n => ({
        id:            n.id,
        author:        n.author,
        date_created:  n.date_created,
        note:          n.note,
        customer_note: !!n.customer_note,
      })));
    } catch (err) {
      console.error('[admin] get order notes:', err.message);
      adminJson(res, 500, { error: 'Failed to fetch notes.' });
    }
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c.toString(); });
    req.on('end', async () => {
      try {
        const { note, customer_note } = JSON.parse(body || '{}');
        if (!note || !note.trim()) {
          adminJson(res, 400, { error: 'Note is required.' });
          return;
        }
        const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}/notes`, {
          method: 'POST',
          headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: note.trim(), customer_note: !!customer_note }),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          adminJson(res, r.status, { error: data?.message || `WC ${r.status}` });
          return;
        }
        adminJson(res, 200, data);
      } catch (err) {
        console.error('[admin] add order note:', err.message);
        adminJson(res, 500, { error: 'Failed to add note.' });
      }
    });
    return;
  }
  res.writeHead(405); res.end();
}

async function readOrderTrackingItems(orderId) {
  const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: wcAuth() },
  });
  if (!r.ok) throw new Error(`WC ${r.status}`);
  const order = await r.json();
  const meta = order.meta_data?.find(m => m.key === '_wc_shipment_tracking_items');
  const items = Array.isArray(meta?.value) ? meta.value : [];
  return items;
}

async function writeOrderTrackingItems(orderId, items) {
  const r = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meta_data: [{ key: '_wc_shipment_tracking_items', value: items }],
    }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => null);
    throw new Error(data?.message || `WC ${r.status}`);
  }
  return r.json();
}

async function handleAdminAddTracking(req, res, id) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { tracking_provider, tracking_number, date_shipped, custom_tracking_link } = JSON.parse(body || '{}');
      if (!tracking_number) {
        adminJson(res, 400, { error: 'Tracking number is required.' });
        return;
      }
      // date_shipped arrives as 'YYYY-MM-DD' from <input type=date>; plugin stores unix timestamp (string)
      const tsSeconds = date_shipped
        ? Math.floor(new Date(date_shipped + 'T00:00:00Z').getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const existing = await readOrderTrackingItems(id);
      const newItem = {
        tracking_provider: '',
        custom_tracking_provider: tracking_provider || '',
        custom_tracking_link:     custom_tracking_link || '',
        tracking_number,
        date_shipped: String(tsSeconds),
        tracking_id:  crypto.randomBytes(16).toString('hex'),
      };
      await writeOrderTrackingItems(id, [...existing, newItem]);
      // Return fresh trimmed detail so the UI re-renders with real data
      const freshRes = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}`, { headers: { Authorization: wcAuth() } });
      const fresh = await freshRes.json();
      adminJson(res, 200, trimOrderDetail(fresh));
    } catch (err) {
      console.error('[admin] add tracking:', err.message);
      adminJson(res, 500, { error: err.message || 'Failed to add tracking.' });
    }
  });
}

async function handleAdminDeleteTracking(req, res, id, trackingId) {
  if (!requireAdminAuth(req, res)) return;
  if (req.method !== 'DELETE') { res.writeHead(405); res.end(); return; }
  try {
    const existing = await readOrderTrackingItems(id);
    const filtered = existing.filter(t => t.tracking_id !== trackingId);
    if (filtered.length === existing.length) {
      adminJson(res, 404, { error: 'Tracking entry not found.' });
      return;
    }
    await writeOrderTrackingItems(id, filtered);
    const freshRes = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${id}`, { headers: { Authorization: wcAuth() } });
    const fresh = await freshRes.json();
    adminJson(res, 200, trimOrderDetail(fresh));
  } catch (err) {
    console.error('[admin] delete tracking:', err.message);
    adminJson(res, 500, { error: err.message || 'Failed to delete tracking.' });
  }
}

// ── Stripe PaymentIntent ──────────────────────────────────────────────────────
async function handleCreatePaymentIntent(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405); res.end(); return;
  }
  if (!stripeClient) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Stripe secret key not configured' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { amountCents } = JSON.parse(body);
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount:   Math.max(50, Math.round(amountCents)), // Stripe minimum is 50 cents
        currency: 'aud',
        automatic_payment_methods: { enabled: true },   // enables Link, Apple Pay, Google Pay etc.
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ clientSecret: paymentIntent.client_secret }));
    } catch (err) {
      console.error('PaymentIntent error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

// ── PayPal ────────────────────────────────────────────────────────────────────
// OAuth token is cached in-process until ~60 s before expiry. PayPal tokens last
// ~9 h so this is effectively free after the first request per dyno.
let _ppTokenCache = { token: null, expiresAt: 0 };
async function getPayPalAccessToken() {
  const now = Date.now();
  if (_ppTokenCache.token && now < _ppTokenCache.expiresAt - 60_000) {
    return _ppTokenCache.token;
  }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('PayPal credentials not configured');
  }
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PayPal OAuth failed: ${r.status} ${text.slice(0, 200)}`);
  }
  const data = await r.json();
  _ppTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

async function handleCreatePayPalOrder(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'PayPal not configured' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { amountCents } = JSON.parse(body || '{}');
      const cents = Math.max(1, Math.round(Number(amountCents) || 0));
      const value = (cents / 100).toFixed(2);
      const token = await getPayPalAccessToken();
      const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'AUD', value },
          }],
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.id) {
        console.error('[paypal] create-order failed:', r.status, data);
        res.writeHead(r.status || 500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: data?.message || 'PayPal order creation failed' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ paypalOrderId: data.id }));
    } catch (err) {
      console.error('[paypal] create-order error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

// Re-check stock against Woo. Shares logic with handleCheckStock but callable inline.
// Returns { ok: bool, issues: [...] }.
async function checkStockInline(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: true, issues: [] };
  const issues = [];
  for (const item of items.slice(0, 100)) {
    const id = parseInt(item.id, 10);
    const requested = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (!id) continue;
    try {
      const r = await fetch(
        `${WC_URL}/wp-json/wc/v3/products/${id}?_fields=id,name,stock_status,stock_quantity,manage_stock`,
        { headers: { Authorization: wcAuth() } }
      );
      if (!r.ok) {
        issues.push({ id, name: item.name || `Product ${id}`, requested, available: 0, reason: 'not_found' });
        continue;
      }
      const p = await r.json();
      if (p.stock_status === 'outofstock') {
        issues.push({ id, name: p.name, requested, available: 0, reason: 'out_of_stock' });
      } else if (p.manage_stock && typeof p.stock_quantity === 'number' && p.stock_quantity < requested) {
        issues.push({ id, name: p.name, requested, available: p.stock_quantity, reason: 'insufficient_stock' });
      }
    } catch (err) {
      // Fail open on transient errors — Woo will reject the order if truly out of stock.
      console.error(`[paypal:stock] product ${id} lookup failed:`, err.message);
    }
  }
  return { ok: issues.length === 0, issues };
}

async function handleCapturePayPalOrder(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'PayPal not configured' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    let captureId = null;
    try {
      const { paypalOrderId, items, contact, shipping, fulfillment, freight } = JSON.parse(body || '{}');
      if (!paypalOrderId || !Array.isArray(items) || items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'paypalOrderId and items[] are required' }));
        return;
      }

      // 1. Stock recheck — refuse to capture if anything's out of stock.
      const stock = await checkStockInline(items);
      if (!stock.ok) {
        res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'stock_changed', issues: stock.issues }));
        return;
      }

      // 2. Capture the PayPal order.
      const token = await getPayPalAccessToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const capData = await capRes.json();
      if (!capRes.ok || capData.status !== 'COMPLETED') {
        console.error('[paypal] capture failed:', capRes.status, capData);
        res.writeHead(capRes.status || 500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: capData?.message || 'PayPal capture failed' }));
        return;
      }
      captureId = capData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

      // 3. Build addresses (same shape as the Stripe/BACS path via Store API).
      const addr = fulfillment === 'delivery' ? {
        address_1: shipping?.address1 || '',
        address_2: shipping?.address2 || '',
        city:      shipping?.city     || '',
        state:     shipping?.state    || '',
        postcode:  shipping?.postcode || '',
        country:   'AU',
      } : {
        address_1: '1/32 Graham Rd',
        address_2: '',
        city:      'Clayton South',
        state:     'VIC',
        postcode:  '3169',
        country:   'AU',
      };
      const billing = {
        first_name: contact?.firstName || '',
        last_name:  contact?.lastName  || '',
        email:      contact?.email     || '',
        phone:      contact?.phone     || '',
        ...addr,
      };
      const ship = {
        first_name: contact?.firstName || '',
        last_name:  contact?.lastName  || '',
        ...addr,
      };

      // 4. Build line items and shipping line.
      const line_items = items.map((item) => {
        const productId = parseInt(item.id, 10);
        const variationId = item.variantId && item.variantId !== item.id
          ? parseInt(item.variantId, 10)
          : null;
        const li = { product_id: productId, quantity: Math.max(1, parseInt(item.quantity, 10) || 1) };
        if (variationId) li.variation_id = variationId;
        return li;
      });

      const shippingTotal = fulfillment === 'collect' ? 0 : Number(freight?.price ?? 0);
      const shippingLabel = fulfillment === 'collect' ? 'Click & Collect' : (freight?.label || 'Shipping');
      const shipping_lines = fulfillment === 'collect' ? [] : [{
        method_id:    'flat_rate',
        method_title: shippingLabel,
        total:        shippingTotal.toFixed(2),
      }];

      // 5. Create a paid Woo order via REST v3 admin.
      const wcRes = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
        body: JSON.stringify({
          payment_method:       'paypal',
          payment_method_title: 'PayPal',
          set_paid:             true,
          status:               'processing',
          billing,
          shipping: ship,
          line_items,
          shipping_lines,
          meta_data: [
            { key: '_paypal_order_id',   value: paypalOrderId },
            { key: '_paypal_capture_id', value: captureId || '' },
            { key: '_paypal_env',        value: PAYPAL_ENV },
          ],
        }),
      });
      const wcData = await wcRes.json();
      if (!wcRes.ok || !wcData.id) {
        // Payment has already been captured — this is a reconciliation case.
        console.error('[paypal][ORPHAN] Capture succeeded but WC order creation failed', {
          paypalOrderId, captureId, status: wcRes.status, body: wcData,
        });
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          error: 'order_create_failed',
          paypalOrderId,
          captureId,
          message: 'Payment was captured but we could not create your order. Please contact support with the capture ID.',
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ wcOrderId: wcData.id, captureId }));
    } catch (err) {
      console.error('[paypal] capture-order error:', err.message, captureId ? `(captureId=${captureId})` : '');
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message, captureId }));
    }
  });
}

// ── Afterpay ──────────────────────────────────────────────────────────────────
// Redirect flow. Frontend calls /api/afterpay/create-checkout → we create an
// Afterpay checkout, return `{ redirectCheckoutUrl, orderToken }`. Browser
// redirects to Afterpay; on success Afterpay bounces back to
// /checkout/afterpay-return?status=SUCCESS&orderToken=... which then calls
// /api/afterpay/capture-payment to take the money and create the WC order.
//
// Auth is HTTP Basic: base64(merchantId:secret). Orders are quoted in AUD.
function afterpayAuth() {
  return 'Basic ' + Buffer.from(`${AFTERPAY_MERCHANT_ID}:${AFTERPAY_SECRET}`).toString('base64');
}

async function handleCreateAfterpayCheckout(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (!AFTERPAY_MERCHANT_ID || !AFTERPAY_SECRET) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Afterpay not configured' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { amountCents, items, contact, shipping, fulfillment, freight, origin } = JSON.parse(body || '{}');
      if (!Array.isArray(items) || items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'items[] required' }));
        return;
      }

      // 1. Stock recheck — cheap; saves a failed capture if stock has moved.
      const stock = await checkStockInline(items);
      if (!stock.ok) {
        res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'stock_changed', issues: stock.issues }));
        return;
      }

      // 2. Build Afterpay request body.
      const cents = Math.max(1, Math.round(Number(amountCents) || 0));
      const totalValue = (cents / 100).toFixed(2);
      const shippingAmt = fulfillment === 'collect' ? 0 : Number(freight?.price ?? 0);

      const consumer = {
        email:      contact?.email || '',
        givenNames: contact?.firstName || '',
        surname:    contact?.lastName  || '',
        phoneNumber: contact?.phone || undefined,
      };

      const addr = fulfillment === 'delivery' ? {
        name:        `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
        line1:       shipping?.address1 || '',
        line2:       shipping?.address2 || '',
        area1:       shipping?.city     || '',
        region:      shipping?.state    || '',
        postcode:    shipping?.postcode || '',
        countryCode: 'AU',
        phoneNumber: contact?.phone || undefined,
      } : {
        name:        `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
        line1:       '1/32 Graham Rd',
        area1:       'Clayton South',
        region:      'VIC',
        postcode:    '3169',
        countryCode: 'AU',
      };

      const apItems = items.slice(0, 100).map((it) => ({
        name:     (it.name || '').slice(0, 255),
        sku:      (it.sku || '').toString().slice(0, 128),
        quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
        price:    { amount: Number(it.price || 0).toFixed(2), currency: 'AUD' },
      }));

      // Trust the origin from the request (falls back to Referer) so the
      // redirect returns to the same host the user is on (localhost in dev,
      // elusiveracing.com.au in prod).
      const baseOrigin = (origin && /^https?:\/\//.test(origin) ? origin : '') || (() => {
        try { return new URL(req.headers.referer).origin; } catch { return ''; }
      })();
      const returnBase = `${baseOrigin || ''}/checkout/afterpay-return`;

      const apBody = {
        amount:              { amount: totalValue, currency: 'AUD' },
        consumer,
        billing:             addr,
        shipping:            addr,
        items:               apItems,
        merchant: {
          redirectConfirmUrl: `${returnBase}?status=SUCCESS`,
          redirectCancelUrl:  `${returnBase}?status=CANCELLED`,
        },
        merchantReference:   `ER-${Date.now()}`,
        taxAmount:           { amount: '0.00', currency: 'AUD' }, // AU prices already include GST
        shippingAmount:      { amount: shippingAmt.toFixed(2), currency: 'AUD' },
      };

      const r = await fetch(`${AFTERPAY_BASE}/v2/checkouts`, {
        method: 'POST',
        headers: { Authorization: afterpayAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(apBody),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.token) {
        console.error('[afterpay] create-checkout failed:', r.status, data);
        res.writeHead(r.status || 500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          error:   data?.errorCode || data?.message || 'Afterpay checkout creation failed',
          message: data?.message   || null,
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        orderToken:          data.token,
        redirectCheckoutUrl: data.redirectCheckoutUrl,
        expires:             data.expires || null,
      }));
    } catch (err) {
      console.error('[afterpay] create-checkout error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

async function handleCaptureAfterpayPayment(req, res) {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  if (!AFTERPAY_MERCHANT_ID || !AFTERPAY_SECRET) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Afterpay not configured' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    let paymentId = null;
    try {
      const { orderToken, items, contact, shipping, fulfillment, freight } = JSON.parse(body || '{}');
      if (!orderToken || !Array.isArray(items) || items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'orderToken and items[] are required' }));
        return;
      }

      // 1. Stock recheck.
      const stock = await checkStockInline(items);
      if (!stock.ok) {
        res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'stock_changed', issues: stock.issues }));
        return;
      }

      // 2. Capture Afterpay payment.
      const capRes = await fetch(`${AFTERPAY_BASE}/v2/payments/capture`, {
        method: 'POST',
        headers: { Authorization: afterpayAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken }),
      });
      const capData = await capRes.json().catch(() => ({}));
      if (!capRes.ok || capData.status !== 'APPROVED') {
        console.error('[afterpay] capture failed:', capRes.status, capData);
        res.writeHead(capRes.status || 500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: capData?.errorCode || capData?.message || 'Afterpay capture failed' }));
        return;
      }
      paymentId = capData.id || null;

      // 3. Build addresses.
      const addr = fulfillment === 'delivery' ? {
        address_1: shipping?.address1 || '',
        address_2: shipping?.address2 || '',
        city:      shipping?.city     || '',
        state:     shipping?.state    || '',
        postcode:  shipping?.postcode || '',
        country:   'AU',
      } : {
        address_1: '1/32 Graham Rd',
        address_2: '',
        city:      'Clayton South',
        state:     'VIC',
        postcode:  '3169',
        country:   'AU',
      };
      const billing = {
        first_name: contact?.firstName || '',
        last_name:  contact?.lastName  || '',
        email:      contact?.email     || '',
        phone:      contact?.phone     || '',
        ...addr,
      };
      const ship = {
        first_name: contact?.firstName || '',
        last_name:  contact?.lastName  || '',
        ...addr,
      };

      // 4. Build line items and shipping line.
      const line_items = items.map((item) => {
        const productId = parseInt(item.id, 10);
        const variationId = item.variantId && item.variantId !== item.id
          ? parseInt(item.variantId, 10)
          : null;
        const li = { product_id: productId, quantity: Math.max(1, parseInt(item.quantity, 10) || 1) };
        if (variationId) li.variation_id = variationId;
        return li;
      });

      const shippingTotal = fulfillment === 'collect' ? 0 : Number(freight?.price ?? 0);
      const shippingLabel = fulfillment === 'collect' ? 'Click & Collect' : (freight?.label || 'Shipping');
      const shipping_lines = fulfillment === 'collect' ? [] : [{
        method_id:    'flat_rate',
        method_title: shippingLabel,
        total:        shippingTotal.toFixed(2),
      }];

      // 5. Create a paid Woo order.
      const wcRes = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
        body: JSON.stringify({
          payment_method:       'afterpay',
          payment_method_title: 'Afterpay',
          set_paid:             true,
          status:               'processing',
          billing,
          shipping: ship,
          line_items,
          shipping_lines,
          meta_data: [
            { key: '_afterpay_order_token', value: orderToken },
            { key: '_afterpay_payment_id',  value: paymentId || '' },
            { key: '_afterpay_env',         value: AFTERPAY_ENV },
          ],
        }),
      });
      const wcData = await wcRes.json();
      if (!wcRes.ok || !wcData.id) {
        console.error('[afterpay][ORPHAN] Capture succeeded but WC order creation failed', {
          orderToken, paymentId, status: wcRes.status, body: wcData,
        });
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          error:   'order_create_failed',
          orderToken,
          paymentId,
          message: 'Payment was captured but we could not create your order. Please contact support with the payment ID.',
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ wcOrderId: wcData.id, paymentId }));
    } catch (err) {
      console.error('[afterpay] capture-payment error:', err.message, paymentId ? `(paymentId=${paymentId})` : '');
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message, paymentId }));
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
  '.map':  'application/json; charset=utf-8',
};

// URLs ending in a known static-asset extension must never fall through to the
// SPA index.html — otherwise the browser receives HTML where it expected JS/CSS
// and rejects on MIME, masking the missing file as a silent client-side failure.
const STATIC_ASSET_EXTS = new Set(
  Object.keys(MIME_TYPES).filter((e) => e !== '.html')
);

// ── Sitemap ───────────────────────────────────────────────────────────────────

const STATIC_URLS = [
  { loc: '/',         changefreq: 'weekly',  priority: '1.0' },
  { loc: '/shop',     changefreq: 'daily',   priority: '0.9' },
  { loc: '/brands',   changefreq: 'weekly',  priority: '0.7' },
  { loc: '/services', changefreq: 'monthly', priority: '0.8' },
  { loc: '/about',    changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact',  changefreq: 'monthly', priority: '0.6' },
];

async function handleSitemap(req, res) {
  const SITE = 'https://elusiveracing.com.au';
  try {
    // Fetch all product slugs from Meilisearch (lightweight — handles only)
    let productUrls = [];
    if (MS_HOST && MS_KEY) {
      const ms    = new Meilisearch({ host: MS_HOST, apiKey: MS_KEY });
      const index = ms.index('products');
      let offset = 0, batch;
      do {
        batch = await index.search('', { limit: 1000, offset, attributesToRetrieve: ['handle', 'dateCreated'] });
        batch.hits.forEach(h => {
          if (h.handle) productUrls.push({ loc: `/products/${h.handle}`, lastmod: h.dateCreated?.split('T')[0], changefreq: 'weekly', priority: '0.8' });
        });
        offset += 1000;
      } while (batch.hits.length === 1000);
    }

    const allUrls = [...STATIC_URLS, ...productUrls];
    const urlTags = allUrls.map(u => `
  <url>
    <loc>${SITE}${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}
</urlset>`;

    res.writeHead(200, { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' });
    res.end(xml);
  } catch (err) {
    console.error('[sitemap] error:', err.message);
    res.writeHead(500); res.end();
  }
}

const server = http.createServer((req, res) => {
  // Meilisearch sync triggers
  if (req.url === '/api/sync') { handleSync(req, res); return; }
  if (req.url === '/api/sync-products') { handleSyncProducts(req, res); return; }
  if (req.url === '/api/check-stock') { handleCheckStock(req, res); return; }
  if (req.url.startsWith('/api/wc/')) { handleWcProxy(req, res); return; }
  if (req.url.startsWith('/api/elusive-vehicles/')) { handleElusiveVehicleProxy(req, res); return; }

  // Dynamic sitemap
  if (req.url === '/sitemap.xml') { handleSitemap(req, res); return; }

  // Chat API route
  if (req.url === '/api/chat' || req.url.startsWith('/api/chat?')) {
    handleChat(req, res);
    return;
  }

  // Public (unauth) wholesale tier list — frontend reads this at boot
  if (req.url === '/api/public/wholesale-tiers') { handlePublicWsTiers(req, res); return; }

  // Admin API
  if (req.url === '/api/admin/login') { handleAdminLogin(req, res); return; }
  if (req.url === '/api/admin/promo-banner' && req.method === 'GET') { handleAdminGetPromoBanner(req, res); return; }
  if (req.url === '/api/admin/promo-banner' && req.method === 'PUT') { handleAdminSavePromoBanner(req, res); return; }
  if (req.url === '/api/admin/promo-banner/image' && req.method === 'POST') { handleAdminPromoBannerImage(req, res); return; }
  if (req.url.startsWith('/api/admin/users')) {
    const approveMatch = req.url.match(/^\/api\/admin\/users\/(\d+)\/approve/);
    if (approveMatch) { handleAdminApproveUser(req, res, approveMatch[1]); return; }
    const rejectMatch = req.url.match(/^\/api\/admin\/users\/(\d+)\/reject/);
    if (rejectMatch) { handleAdminRejectUser(req, res, rejectMatch[1]); return; }
    const roleMatch = req.url.match(/^\/api\/admin\/users\/(\d+)\/role/);
    if (roleMatch) { handleAdminUpdateUserRole(req, res, roleMatch[1]); return; }
    const idMatch = req.url.match(/^\/api\/admin\/users\/(\d+)(\?|$)/);
    if (idMatch) { handleAdminGetUser(req, res, idMatch[1]); return; }
    handleAdminListUsers(req, res); return;
  }
  if (req.url.startsWith('/api/admin/orders')) {
    const trackDelMatch = req.url.match(/^\/api\/admin\/orders\/(\d+)\/tracking\/([a-f0-9]+)(\?|$)/i);
    if (trackDelMatch) { handleAdminDeleteTracking(req, res, trackDelMatch[1], trackDelMatch[2]); return; }
    const trackMatch = req.url.match(/^\/api\/admin\/orders\/(\d+)\/tracking(\?|$)/);
    if (trackMatch) { handleAdminAddTracking(req, res, trackMatch[1]); return; }
    const notesMatch = req.url.match(/^\/api\/admin\/orders\/(\d+)\/notes(\?|$)/);
    if (notesMatch) { handleAdminGetOrderNotes(req, res, notesMatch[1]); return; }
    const idMatch = req.url.match(/^\/api\/admin\/orders\/(\d+)(\?|$)/);
    if (idMatch) { handleAdminGetOrder(req, res, idMatch[1]); return; }
    handleAdminListOrders(req, res); return;
  }
  if (req.url.startsWith('/api/admin/tags'))       { handleAdminTags(req, res);       return; }
  if (req.url.startsWith('/api/admin/categories')) { handleAdminCategories(req, res); return; }
  if (req.url === '/api/admin/products/upload-image' && req.method === 'POST') { handleAdminProductImageUpload(req, res); return; }
  if (req.url.startsWith('/api/admin/products')) {
    const m = req.url.match(/^\/api\/admin\/products\/(\d+)/);
    if (m) {
      if (req.method === 'GET')    { handleAdminGetProduct(req, res, m[1]);    return; }
      if (req.method === 'PUT')    { handleAdminUpdateProduct(req, res, m[1]); return; }
      if (req.method === 'DELETE') { handleAdminDeleteProduct(req, res, m[1]); return; }
    } else {
      if (req.method === 'GET')  { handleAdminListProducts(req, res);  return; }
      if (req.method === 'POST') { handleAdminCreateProduct(req, res); return; }
    }
  }

  // WooCommerce product webhooks
  if (req.url === '/api/webhook/product-created' || req.url === '/api/webhook/product-updated') {
    handleProductWebhook(req, res); return;
  }
  if (req.url === '/api/webhook/product-deleted') {
    handleProductDeleteWebhook(req, res); return;
  }

  // Shipping rates proxy
  if (req.url === '/api/shipping-rates') {
    handleShippingRates(req, res);
    return;
  }

  // Auth routes
  if (req.url === '/api/auth/login')    { handleAuthLogin(req, res);    return; }
  if (req.url === '/api/auth/register') { handleAuthRegister(req, res); return; }
  if (req.url === '/api/auth/wholesale-register') { handleWholesaleRegister(req, res); return; }
  if (req.url === '/api/auth/lost-password')  { handleLostPassword(req, res);  return; }
  if (req.url === '/api/auth/reset-password') { handleResetPassword(req, res); return; }
  if (req.url.startsWith('/api/account/orders'))  { handleGetOrders(req, res); return; }
  if (req.url === '/api/account/profile')         { handleUpdateAccountProfile(req, res); return; }

  // Stripe PaymentIntent creation
  if (req.url === '/api/create-payment-intent') {
    handleCreatePaymentIntent(req, res);
    return;
  }

  // PayPal order creation + capture
  if (req.url === '/api/paypal/create-order')  { handleCreatePayPalOrder(req, res);  return; }
  if (req.url === '/api/paypal/capture-order') { handleCapturePayPalOrder(req, res); return; }
  if (req.url === '/api/afterpay/create-checkout') { handleCreateAfterpayCheckout(req, res); return; }
  if (req.url === '/api/afterpay/capture-payment') { handleCaptureAfterpayPayment(req, res); return; }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  // Strip query string and decode URI
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(DIST, urlPath);

  // Security: prevent path traversal outside dist
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const headers = { 'Content-Type': contentType, ...securityHeaders() };

      // Cache headers: hashed assets get immutable year-long cache, others get 1 day
      const isHashedAsset = urlPath.startsWith('/assets/');
      if (isHashedAsset) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else if (ext === '.html') {
        headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      } else {
        headers['Cache-Control'] = 'public, max-age=86400';
      }

      // Gzip compression — prefer pre-compressed .gz files, fall back to runtime
      const skipCompress = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.mp4', '.webm', '.woff2', '.woff', '.br', '.gz']);
      const acceptEncoding = (req.headers['accept-encoding'] || '');
      const gzPath = filePath + '.gz';
      if (!skipCompress.has(ext) && acceptEncoding.includes('gzip') && stats.size > 1024 && fs.existsSync(gzPath)) {
        // Serve pre-compressed file (built by vite-plugin-compression)
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        fs.createReadStream(gzPath).pipe(res);
      } else if (!skipCompress.has(ext) && acceptEncoding.includes('gzip') && stats.size > 1024) {
        // Fallback: runtime gzip
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
      } else {
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      // Static-asset URLs that miss should 404, not fall through to index.html.
      // Otherwise, browsers receive HTML where they expected JS/CSS/etc. and reject it
      // on MIME grounds — masking real "missing asset" bugs as silent client failures.
      const ext = path.extname(urlPath).toLowerCase();
      if (STATIC_ASSET_EXTS.has(ext)) {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...securityHeaders() });
        res.end('Not found');
        return;
      }
      // SPA fallback — serve index.html for all non-file requests
      const index = path.join(DIST, 'index.html');
      const headers = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ...securityHeaders(),
      };
      const acceptEncoding = (req.headers['accept-encoding'] || '');
      if (acceptEncoding.includes('gzip')) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        fs.createReadStream(index).pipe(zlib.createGzip({ level: 6 })).pipe(res);
      } else {
        res.writeHead(200, headers);
        fs.createReadStream(index).pipe(res);
      }
    }
  });
});

async function waitForMeilisearch(retries = 20, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${MS_HOST}/health`, {
        headers: { Authorization: `Bearer ${MS_KEY}` },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  // Wait for Meilisearch to be ready before first sync
  waitForMeilisearch().then(ready => {
    if (ready) {
      runMsSync();
    } else {
      console.log('[sync] Meilisearch did not become ready in time, skipping initial sync.');
    }
  });
  setInterval(runMsSync, 60 * 60 * 1000);
});
