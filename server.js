import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { Meilisearch } from 'meilisearch';

// Load .env manually — only sets vars not already injected by the environment (e.g. Railway)
try {
  const envFile = fs.readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env is optional */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8080;

const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const WC_URL    = process.env.VITE_WC_URL;
const WC_KEY    = process.env.VITE_WC_CONSUMER_KEY;
const WC_SECRET = process.env.VITE_WC_CONSUMER_SECRET;

const MS_HOST = process.env.MEILISEARCH_HOST;
const MS_KEY  = process.env.MEILISEARCH_ADMIN_KEY;
const MS_INDEX = 'products';
const SYNC_TOKEN = process.env.SEARCH_SYNC_TOKEN || '';

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
  'id,name,slug,price,regular_price,on_sale,stock_status,images,categories,brands,attributes,tags,sku,short_description,date_created';

function decodeHtml(str) {
  return (str ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
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
    stockStatus:     p.stock_status || 'instock',
    imageUrl:        p.images?.[0]?.src || '',
    imageAlt:        decodeHtml(p.images?.[0]?.alt || p.name),
    tags:            (p.tags  ?? []).map(t => decodeHtml(t.name)),
    categories:      (p.categories ?? []).map(c => decodeHtml(c.name)),
    categoryHandles: (p.categories ?? []).map(c => c.slug),
    dateCreated:     p.date_created || '',
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
      searchableAttributes: ['title', 'vendor', 'sku', 'tags', 'categories', 'description'],
      filterableAttributes: ['vendor', 'categories', 'categoryHandles', 'onSale', 'stockStatus', 'price'],
      sortableAttributes:   ['price', 'regularPrice', 'dateCreated'],
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
      const { messages } = JSON.parse(body);

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid messages' }));
        return;
      }

      // Search Shopify for live product data if the query is product-related
      const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      let productContext = '';
      if (isProductQuery(latestUserMessage)) {
        const products = await wcSearch(latestUserMessage);
        productContext = buildProductContext(products);
      }

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT + productContext,
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
    const headers = { 'Content-Type': 'application/json' };
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
  const existingCart = await storeReq('/cart');

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
    await storeReq('/cart/add-item', 'POST', { id: variantId ?? productId, quantity: item.quantity });
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

      // 1. Authenticate via JWT plugin
      const jwtRes = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      if (!jwtRes.ok) {
        const err = await jwtRes.json().catch(() => ({}));
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Invalid email or password.' }));
        return;
      }

      const jwt = await jwtRes.json();

      // 2. Fetch WC customer record by email for name + saved addresses
      const custRes = await fetch(
        `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&per_page=1`,
        { headers: { Authorization: auth } }
      );
      let customer = null;
      if (custRes.ok) {
        const list = await custRes.json();
        customer = list[0] ?? null;
      }

      const displayName = jwt.user_display_name || '';
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        token: jwt.token,
        user: {
          id:        customer?.id   ?? null,
          email:     jwt.user_email,
          firstName: customer?.first_name || displayName.split(' ')[0] || '',
          lastName:  customer?.last_name  || displayName.split(' ').slice(1).join(' ') || '',
          billing:   customer?.billing  ?? null,
          shipping:  customer?.shipping ?? null,
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

      // 2. Auto-login via JWT
      const jwtRes = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const jwt = jwtRes.ok ? await jwtRes.json() : null;

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        token: jwt?.token ?? null,
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

async function handleGetOrders(req, res) {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const customerId = new URL(req.url, 'http://localhost').searchParams.get('customer');
  if (!customerId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing customer ID' }));
    return;
  }
  try {
    const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    const ordersRes = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=20&orderby=date&order=desc`,
      { headers: { Authorization: auth } }
    );
    if (!ordersRes.ok) throw new Error('WC orders fetch failed');
    const orders = await ordersRes.json();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(orders));
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch orders.' }));
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
};

const server = http.createServer((req, res) => {
  // Meilisearch sync trigger
  if (req.url === '/api/sync') { handleSync(req, res); return; }

  // Chat API route
  if (req.url === '/api/chat' || req.url.startsWith('/api/chat?')) {
    handleChat(req, res);
    return;
  }

  // Shipping rates proxy
  if (req.url === '/api/shipping-rates') {
    handleShippingRates(req, res);
    return;
  }

  // Auth routes
  if (req.url === '/api/auth/login')    { handleAuthLogin(req, res);    return; }
  if (req.url === '/api/auth/register') { handleAuthRegister(req, res); return; }
  if (req.url.startsWith('/api/account/orders')) { handleGetOrders(req, res); return; }

  // Stripe PaymentIntent creation
  if (req.url === '/api/create-payment-intent') {
    handleCreatePaymentIntent(req, res);
    return;
  }

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
      // Serve the exact file that was requested
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA fallback — serve index.html for all non-file requests
      const index = path.join(DIST, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(index).pipe(res);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  const msKeys = Object.keys(process.env).filter(k => k.includes('MEILI'));
  console.log('[sync] MEILI env keys found:', msKeys.length ? msKeys.join(', ') : '(none)');
  console.log(`[sync] MS_HOST=${MS_HOST || '(not set)'} MS_KEY=${MS_KEY ? '(set)' : '(not set)'}`);
  // Run initial Meilisearch sync, then repeat every hour
  runMsSync();
  setInterval(runMsSync, 60 * 60 * 1000);
});
