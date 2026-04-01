import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

// Load .env manually (Node 18+ has no built-in dotenv)
try {
  const envFile = fs.readFileSync(new URL('.env', import.meta.url), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
} catch { /* .env is optional */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8080;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WC_URL    = process.env.VITE_WC_URL;
const WC_KEY    = process.env.VITE_WC_CONSUMER_KEY;
const WC_SECRET = process.env.VITE_WC_CONSUMER_SECRET;

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
    // Update session cookie on every response (WC may refresh it)
    const sc = res.headers.get('set-cookie');
    if (sc) {
      sessionCookie = sc.split(',')
        .map(c => c.trim().split(';')[0])
        .filter(Boolean)
        .join('; ');
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
  console.log('[shipping] session established, nonce:', nonce ? 'yes' : 'no', '| existing items:', existingCart?.items?.length ?? 0);

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
    const addResult = await storeReq('/cart/add-item', 'POST', { id: variantId ?? productId, quantity: item.quantity });
    console.log(`[shipping] add item ${variantId ?? productId} x${item.quantity} →`, addResult ? 'ok' : 'failed');
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

  console.log('[shipping] address:', JSON.stringify(address));
  console.log('[shipping] shipping_rates from cart:', JSON.stringify(cartData?.shipping_rates));
  console.log('[shipping] cart items:', cartData?.totals?.total_items);

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
});
