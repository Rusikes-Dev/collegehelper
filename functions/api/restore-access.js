/* POST /api/restore-access  { paymentId }
   Lets a paying user restore access on a new device with their Razorpay
   payment ID (pay_XXXXXXXX), which is on their Razorpay receipt email. */
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
export async function onRequestPost({ request, env }) {
  if (!env.CH_KV) return json({ error: 'Storage is not configured.' }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
  const pid = String(b.paymentId || '').trim();
  if (!pid) return json({ error: 'Enter your payment ID.' }, 400);
  const rec = await env.CH_KV.get('pay:' + pid, 'json');
  if (!rec) return json({ error: 'No purchase found for that payment ID. Check it against your Razorpay receipt email.' }, 404);
  return json({ token: rec.token, tool: rec.tool });
}
