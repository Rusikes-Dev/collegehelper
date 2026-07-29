/* GET /api/data/cet | /api/data/neet   (Authorization: Bearer <token>)
   Serves the cutoff dataset only to verified purchasers. The data lives in
   KV, not in the public site folder, so the paywall cannot be bypassed by
   fetching a static file — same principle as the original Vercel version. */
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
export async function onRequestGet({ request, env, params }) {
  const tool = params.tool;
  if (tool !== 'cet' && tool !== 'neet') return json({ error: 'Not found' }, 404);
  if (!env.CH_KV) return json({ error: 'Storage is not configured.' }, 503);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.indexOf('Bearer ') === 0 ? auth.slice(7) : '';
  if (!token) return json({ error: 'This dataset is available after purchase.' }, 401);

  const rec = await env.CH_KV.get('tok:' + token, 'json');
  if (!rec || rec.tool !== tool) return json({ error: 'This dataset is available after purchase.' }, 401);

  const data = await env.CH_KV.get('data:' + tool, 'text');
  if (!data) {
    return json({ error: 'The dataset has not been uploaded yet. Site owner: upload it from /admin/data.html.' }, 503);
  }
  return new Response(data, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=3600' }
  });
}
