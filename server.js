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

const SHOPIFY_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN  = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

async function shopifySearch(query, count = 6) {
  try {
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query: `
          query ChatSearch($query: String!, $count: Int!) {
            products(first: $count, query: $query, sortKey: BEST_SELLING) {
              edges {
                node {
                  title
                  handle
                  vendor
                  priceRange {
                    minVariantPrice { amount currencyCode }
                  }
                  compareAtPriceRange {
                    minVariantPrice { amount }
                  }
                  variants(first: 1) {
                    edges { node { availableForSale } }
                  }
                  tags
                }
              }
            }
          }
        `,
        variables: { query, count },
      }),
    });
    const { data } = await res.json();
    return data?.products?.edges?.map(e => e.node) || [];
  } catch {
    return [];
  }
}

function isProductQuery(message) {
  return /\b(stock|price|available|buy|order|part|clutch|coilover|coilovers|spring|sway bar|brake|rotor|pad|caliper|exhaust|header|intake|turbo|intercooler|blow.?off|suspension|engine|cam|piston|rod|bearing|injector|fuel pump|fuel rail|radiator|ecu|tune|hondata|k.?tuned|skunk2|exedy|bc racing|hks|arp|acl|spoon|mugen|bosch|ngk|mishimoto|cusco|project mu|tein|whiteline|hardrace|hasport|hybrid racing|cometic|wiseco|je piston|do you have|do you stock|got any|show me|what.*have|looking for|need a|need some)\b/i.test(message);
}

function buildProductContext(products) {
  if (!products.length) return '';
  const lines = products.map(p => {
    const price = parseFloat(p.priceRange.minVariantPrice.amount).toFixed(2);
    const compareAt = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount || 0);
    const saleTag = compareAt > parseFloat(p.priceRange.minVariantPrice.amount) ? ' (ON SALE)' : '';
    const status = p.variants.edges[0]?.node?.availableForSale ? 'In Stock' : 'Backorder';
    return `• ${p.title} — ${p.vendor} | $${price} AUD${saleTag} | ${status} | /products/${p.handle}`;
  }).join('\n');
  return `\n\nLIVE PRODUCT DATA FROM OUR STORE (use this to answer the customer):\n${lines}\n\nInclude relevant product names, prices, stock status and the product URL in your reply. Do not invent products not in this list.`;
}

const SYSTEM_PROMPT = `You are the AI assistant for Elusive Racing, a specialist performance car parts retailer based in Clayton South, Melbourne, Australia. You help customers find the right parts, understand products, and get answers to common questions.

BUSINESS DETAILS:
- Store: 1/32 Graham Road, Clayton South VIC 3169
- Phone: 03 9574 1710
- Email: sales@elusiveracing.com.au
- Hours: Mon–Fri 9am–5pm, Sat 9am–2pm, Sun Closed
- Facebook Messenger: m.me/ElusiveRacin
- Online booking (workshop): /book on the website

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
- Free shipping on orders over $150 AUD (Australia)
- International shipping available
- Orders dispatched within 1–2 business days
- Returns accepted for faulty/incorrectly sent items — contact us within 14 days
- Payments: Visa, Mastercard, Amex, PayPal, Afterpay, Zip, Apple Pay, Google Pay
- Wholesale/trade accounts available — customers can register on the website

YOUR ROLE:
- Help customers find the right products and brands for their build
- Answer questions about fitment, product categories, and brands
- Explain policies (shipping, returns, payments)
- Provide store info (hours, location, contact)
- Recommend contacting the team for complex fitment queries or specific stock checks
- Be friendly, knowledgeable and use natural Australian language
- Keep responses concise — this is a chat widget, not an essay
- Use minimal markdown: bullet points and **bold** are fine, but never use headings (##) or horizontal rules

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

If a customer asks something you genuinely cannot answer (e.g. exact current stock levels), direct them to call 03 9574 1710 or email sales@elusiveracing.com.au.`;

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
        const products = await shopifySearch(latestUserMessage);
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
