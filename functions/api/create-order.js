/* POST /api/create-order  { tool: "cet" | "neet" }
   Creates a Razorpay order server-side so the amount cannot be tampered with. */
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
  const tool = body.tool;
  const prices = {
    cet: parseInt(env.PRICE_CET || '49', 10),
    neet: parseInt(env.PRICE_NEET || '49', 10)
  };
  if (!prices[tool]) return json({ error: 'Unknown tool' }, 400);
  if (!env.RZP_KEY_ID || !env.RZP_KEY_SECRET) {
    return json({ error: 'Payments are not configured yet. The site owner needs to add the Razorpay keys.' }, 503);
  }
  const auth = 'Basic ' + btoa(env.RZP_KEY_ID + ':' + env.RZP_KEY_SECRET);
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: prices[tool] * 100,      // paise
      currency: 'INR',
      receipt: tool + '-' + Date.now(),
      notes: { tool: tool }
    })
  });
  const d = await r.json();
  if (!r.ok) {
    return json({ error: (d.error && d.error.description) || 'Could not create the payment order.' }, 502);
  }
  return json({ orderId: d.id, amount: d.amount, currency: d.currency, keyId: env.RZP_KEY_ID });
}
