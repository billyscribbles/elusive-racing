/**
 * search-server/server.js
 *
 * Lightweight HTTP server that:
 *  - Runs a full WC → Meilisearch sync on startup
 *  - Schedules hourly re-syncs via node-cron
 *  - Exposes endpoints for manual sync triggers and WC webhooks
 *
 * Endpoints:
 *  GET  /health                     → status + last sync info
 *  POST /sync                       → trigger full re-sync (requires Bearer token)
 *  POST /webhook/product-created    → WC webhook: upsert product
 *  POST /webhook/product-updated    → WC webhook: upsert product
 *  POST /webhook/product-deleted    → WC webhook: remove product
 */

import http    from 'http';
import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';
import cron    from 'node-cron';
import {
  runFullSync,
  upsertProduct,
  deleteProduct,
  getSyncState,
} from './sync.js';

// ── Load .env ─────────────────────────────────────────────────────────────────
// Reads parent .env first (shared WC creds), then local .env overrides

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const envPath of ['../.env', '.env'].map(p => path.join(__dirname, p))) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch { /* file is optional */ }
}

// ── Config ────────────────────────────────────────────────────────────────────

const PORT         = parseInt(process.env.SEARCH_SERVER_PORT || '3001', 10);
const SYNC_TOKEN   = process.env.SEARCH_SYNC_TOKEN || '';   // Bearer token for /sync
const SYNC_CRON    = process.env.SEARCH_SYNC_CRON  || '0 * * * *'; // default: every hour

// Validate required env
const required = ['VITE_WC_URL', 'MEILISEARCH_HOST', 'MEILISEARCH_ADMIN_KEY'];
const missing  = required.filter(k => !process.env[k] && !process.env[k.replace('VITE_', '')]);
if (missing.length) {
  console.error('[server] Missing required env vars:', missing.join(', '));
  console.error('[server] Check .env or search-server/.env — see .env.example');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end',  () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function isAuthorised(req) {
  if (!SYNC_TOKEN) return true; // no token configured → open (dev only)
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${SYNC_TOKEN}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url    = req.url.split('?')[0];
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Authorization,Content-Type' });
    res.end();
    return;
  }

  // ── GET /health ──────────────────────────────────────────────────────────
  if (method === 'GET' && url === '/health') {
    const state = getSyncState();
    return send(res, 200, {
      status:    'ok',
      uptime:    process.uptime(),
      syncCron:  SYNC_CRON,
      ...state,
    });
  }

  // ── POST /sync ───────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/sync') {
    if (!isAuthorised(req)) return send(res, 401, { error: 'Unauthorised' });
    const state = getSyncState();
    if (state.running) return send(res, 409, { error: 'Sync already in progress' });

    // Fire and forget — respond immediately
    send(res, 202, { message: 'Sync started' });
    runFullSync().catch(err => console.error('[server] Sync failed:', err.message));
    return;
  }

  // ── POST /webhook/product-created  or  /webhook/product-updated ──────────
  if (method === 'POST' && (url === '/webhook/product-created' || url === '/webhook/product-updated')) {
    const body = await readBody(req);
    if (!body.id) return send(res, 400, { error: 'Missing product id' });
    try {
      await upsertProduct(body);
      return send(res, 200, { ok: true });
    } catch (err) {
      console.error('[webhook] Upsert failed:', err.message);
      return send(res, 500, { error: err.message });
    }
  }

  // ── POST /webhook/product-deleted ────────────────────────────────────────
  if (method === 'POST' && url === '/webhook/product-deleted') {
    const body = await readBody(req);
    if (!body.id) return send(res, 400, { error: 'Missing product id' });
    try {
      await deleteProduct(body.id);
      return send(res, 200, { ok: true });
    } catch (err) {
      console.error('[webhook] Delete failed:', err.message);
      return send(res, 500, { error: err.message });
    }
  }

  return send(res, 404, { error: 'Not found' });
}

// ── Server startup ────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[server] Unhandled error:', err);
    send(res, 500, { error: 'Internal server error' });
  });
});

server.listen(PORT, () => {
  console.log(`[server] Elusive Racing search server listening on port ${PORT}`);
  console.log(`[server] Meilisearch host: ${process.env.MEILISEARCH_HOST}`);
  console.log(`[server] Sync schedule: ${SYNC_CRON}`);

  // Run initial sync on startup
  runFullSync().catch(err => console.error('[server] Initial sync failed:', err.message));

  // Schedule periodic re-syncs
  cron.schedule(SYNC_CRON, () => {
    console.log('[cron] Triggering scheduled sync…');
    runFullSync().catch(err => console.error('[cron] Sync failed:', err.message));
  });
});

server.on('error', err => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
