/* College Helper — API Worker.
   Handles the Razorpay paywall and serves the paid cutoff datasets from KV.
   Everything that is not /api/* is served straight from static assets and
   never reaches this script (see run_worker_first in wrangler.jsonc). */

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const prices = env => ({
  cet: parseInt(env.PRICE_CET || '49', 10),
  neet: parseInt(env.PRICE_NEET || '49', 10)
});

const isTool = t => t === 'cet' || t === 'neet';

/* ------------------------------------------------------------- endpoints -- */

function config(env) {
  return json({
    keyId: env.RZP_KEY_ID || '',
    configured: !!(env.RZP_KEY_ID && env.RZP_KEY_SECRET && env.CH_KV),
    prices: prices(env)
  });
}

async function createOrder(request, env) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const p = prices(env);
  if (!isTool(b.tool) || !p[b.tool]) return json({ error: 'Unknown tool' }, 400);
  if (!env.RZP_KEY_ID || !env.RZP_KEY_SECRET) {
    return json({ error: 'Payments are not configured yet. The site owner needs to add the Razorpay keys.' }, 503);
  }
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(env.RZP_KEY_ID + ':' + env.RZP_KEY_SECRET),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: p[b.tool] * 100,           // paise
      currency: 'INR',
      receipt: b.tool + '-' + Date.now(),
      notes: { tool: b.tool }
    })
  });
  const d = await r.json();
  if (!r.ok) return json({ error: d?.error?.description || 'Could not create the payment order.' }, 502);
  return json({ orderId: d.id, amount: d.amount, currency: d.currency, keyId: env.RZP_KEY_ID });
}

async function verifyPayment(request, env) {
  if (!env.CH_KV) return json({ error: 'Storage is not configured (CH_KV binding missing).' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (!isTool(b.tool)) return json({ error: 'Unknown tool' }, 400);
  if (!b.orderId || !b.paymentId || !b.signature) return json({ error: 'Missing payment details' }, 400);

  const expected = await hmacHex(env.RZP_KEY_SECRET, b.orderId + '|' + b.paymentId);
  if (expected !== b.signature) return json({ error: 'Payment could not be verified.' }, 400);

  const ts = Date.now();
  const amount = prices(env)[b.tool] || 0;
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.CH_KV.put('tok:' + token, JSON.stringify({ tool: b.tool, paymentId: b.paymentId, ts }));
  await env.CH_KV.put('pay:' + b.paymentId, JSON.stringify({ token, tool: b.tool, ts, amount }));
  return json({ token, paymentId: b.paymentId });
}

async function restoreAccess(request, env) {
  if (!env.CH_KV) return json({ error: 'Storage is not configured.' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const pid = String(b.paymentId || '').trim();
  if (!pid) return json({ error: 'Enter your payment ID.' }, 400);
  const rec = await env.CH_KV.get('pay:' + pid, 'json');
  if (!rec) return json({ error: 'No purchase found for that payment ID. Check it against your Razorpay receipt email.' }, 404);
  return json({ token: rec.token, tool: rec.tool });
}

async function serveData(request, env, tool) {
  if (!isTool(tool)) return json({ error: 'Not found' }, 404);
  if (!env.CH_KV) return json({ error: 'Storage is not configured.' }, 503);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json({ error: 'This dataset is available after purchase.' }, 401);

  const rec = await env.CH_KV.get('tok:' + token, 'json');
  if (!rec || rec.tool !== tool) return json({ error: 'This dataset is available after purchase.' }, 401);

  const data = await env.CH_KV.get('data:' + tool, 'text');
  if (!data) return json({ error: 'The dataset has not been uploaded yet. Site owner: upload it from /admin/data.html.' }, 503);

  return new Response(data, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=3600' }
  });
}

function adminGuard(request, env) {
  if (!env.ADMIN_SECRET) return json({ error: 'ADMIN_SECRET is not set in the Worker environment variables.' }, 503);
  let ok = (request.headers.get('x-admin-secret') || '') === env.ADMIN_SECRET;
  if (!ok) {
    // The /admin/ pages are already behind Basic Auth; accept those credentials too.
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Basic ')) {
      try {
        const d = atob(auth.slice(6));
        const i = d.indexOf(':');
        ok = i !== -1 && d.slice(0, i) === 'admin' && timingSafeEqual(d.slice(i + 1), env.ADMIN_SECRET);
      } catch { /* malformed header */ }
    }
  }
  if (!ok) return json({ error: 'Wrong admin secret.' }, 401);
  if (!env.CH_KV) return json({ error: 'The KV namespace binding CH_KV is missing.' }, 503);
  return null;
}

/* ------------------------------------------------------------- sales -----
   Lists every verified purchase from KV so the admin panel can show sales
   and revenue. Read-only; nothing here can alter a payment record. */
async function listSales(request, env) {
  const bad = adminGuard(request, env);
  if (bad) return bad;

  const sales = [];
  let cursor;
  for (let page = 0; page < 10; page++) {          // up to 10k purchases
    const res = await env.CH_KV.list({ prefix: 'pay:', limit: 1000, cursor });
    for (const k of res.keys) sales.push(k.name.slice(4));
    if (res.list_complete) break;
    cursor = res.cursor;
    if (!cursor) break;
  }

  const rows = [];
  const CHUNK = 40;                                 // stay well inside subrequest limits
  for (let i = 0; i < sales.length; i += CHUNK) {
    const part = sales.slice(i, i + CHUNK);
    const got = await Promise.all(part.map(id => env.CH_KV.get('pay:' + id, 'json')));
    got.forEach((rec, j) => {
      if (!rec) return;
      rows.push({
        paymentId: part[j],
        tool: rec.tool || 'unknown',
        ts: rec.ts || null,
        amount: typeof rec.amount === 'number' ? rec.amount : null
      });
    });
  }
  rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const totals = { count: rows.length, revenue: 0, byTool: {} };
  for (const r of rows) {
    const amt = r.amount == null ? (prices(env)[r.tool] || 0) : r.amount;
    totals.revenue += amt;
    if (!totals.byTool[r.tool]) totals.byTool[r.tool] = { count: 0, revenue: 0 };
    totals.byTool[r.tool].count++;
    totals.byTool[r.tool].revenue += amt;
  }
  return json({ totals, sales: rows, prices: prices(env) });
}

/* ------------------------------------------------------- /admin/* gate --
   Real server-side password protection for the admin panel, using the
   browser's native HTTP Basic Auth prompt. Substitutes for Cloudflare
   Access (which requires a card on file even on the free plan) — this
   needs neither a card nor any extra Cloudflare product.
   Username is always "admin"; the password is your ADMIN_SECRET. */
function basicAuthPrompt() {
  return new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="College Helper Admin", charset="UTF-8"' }
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function guardAdminPage(request, env) {
  if (!env.ADMIN_SECRET) {
    return json({ error: 'The admin panel is not protected yet: ADMIN_SECRET is not set in the Worker environment variables. Add it under Settings -> Variables and secrets before using /admin/.' }, 503);
  }
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) return basicAuthPrompt();

  let decoded;
  try { decoded = atob(auth.slice(6)); } catch { return basicAuthPrompt(); }
  const sep = decoded.indexOf(':');
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const pass = sep === -1 ? '' : decoded.slice(sep + 1);

  if (user !== 'admin' || !timingSafeEqual(pass, env.ADMIN_SECRET)) return basicAuthPrompt();
  return null; // authorized
}

async function uploadData(request, env, url) {
  const bad = adminGuard(request, env);
  if (bad) return bad;
  const tool = url.searchParams.get('tool');
  if (!isTool(tool)) return json({ error: 'Unknown tool' }, 400);

  if (request.method === 'GET') {
    const data = await env.CH_KV.get('data:' + tool, 'text');
    return json({ tool, uploaded: !!data, bytes: data ? data.length : 0 });
  }
  const text = await request.text();
  try { JSON.parse(text); } catch { return json({ error: 'That file is not valid JSON.' }, 400); }
  await env.CH_KV.put('data:' + tool, text);
  return json({ ok: true, tool, bytes: text.length });
}

/* ---------------------------------------------------------------- router -- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === '/admin' || path.startsWith('/admin/')) {
      const denied = await guardAdminPage(request, env);
      if (denied) return denied;
      return env.ASSETS.fetch(request);
    }

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (path === '/api/config' && method === 'GET') return config(env);
    if (path === '/api/create-order' && method === 'POST') return createOrder(request, env);
    if (path === '/api/verify-payment' && method === 'POST') return verifyPayment(request, env);
    if (path === '/api/restore-access' && method === 'POST') return restoreAccess(request, env);

    if (path.startsWith('/api/data/') && method === 'GET') {
      return serveData(request, env, path.slice('/api/data/'.length));
    }
    if (path === '/api/upload-data' && (method === 'GET' || method === 'PUT')) {
      return uploadData(request, env, url);
    }
    if (path === '/api/sales' && method === 'GET') return listSales(request, env);
    return json({ error: 'Not found' }, 404);
  }
};
