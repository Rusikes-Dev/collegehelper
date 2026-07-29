/* GET /api/config — public. Razorpay key id + live prices for the unlock UI. */
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    keyId: env.RZP_KEY_ID || '',
    configured: !!(env.RZP_KEY_ID && env.RZP_KEY_SECRET && env.CH_KV),
    prices: {
      cet: parseInt(env.PRICE_CET || '49', 10),
      neet: parseInt(env.PRICE_NEET || '49', 10)
    }
  }), { headers: { 'Content-Type': 'application/json' } });
}
