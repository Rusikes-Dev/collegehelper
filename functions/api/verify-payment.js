/* POST /api/verify-payment  { tool, orderId, paymentId, signature }
   Verifies the Razorpay signature (HMAC-SHA256 of "orderId|paymentId" with the
   key secret) and, if genuine, mints a lifetime access token stored in KV. */
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
export async function onRequestPost({ request, env }) {
  if (!env.CH_KV) return json({ error: 'Storage is not configured. The site owner needs to bind the KV namespace.' }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
  const tool = b.tool;
  if (tool !== 'cet' && tool !== 'neet') return json({ error: 'Unknown tool' }, 400);
  if (!b.orderId || !b.paymentId || !b.signature) return json({ error: 'Missing payment details' }, 400);

  const expected = await hmacHex(env.RZP_KEY_SECRET, b.orderId + '|' + b.paymentId);
  if (expected !== b.signature) return json({ error: 'Payment could not be verified.' }, 400);

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.CH_KV.put('tok:' + token, JSON.stringify({ tool: tool, paymentId: b.paymentId, ts: Date.now() }));
  await env.CH_KV.put('pay:' + b.paymentId, JSON.stringify({ token: token, tool: tool }));
  return json({ token: token, paymentId: b.paymentId });
}
