/* PUT /api/upload-data?tool=cet|neet   (x-admin-secret header)
   One-time upload of the cutoff datasets into KV, done from /admin/data.html.
   GET with the same header reports whether a dataset is present. */
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
}
function guard(request, env) {
  if (!env.ADMIN_SECRET) return json({ error: 'ADMIN_SECRET is not set in the Pages environment variables.' }, 503);
  if ((request.headers.get('x-admin-secret') || '') !== env.ADMIN_SECRET) {
    return json({ error: 'Wrong admin secret.' }, 401);
  }
  if (!env.CH_KV) return json({ error: 'The KV namespace binding CH_KV is missing.' }, 503);
  return null;
}
export async function onRequestGet({ request, env }) {
  const bad = guard(request, env); if (bad) return bad;
  const tool = new URL(request.url).searchParams.get('tool');
  if (tool !== 'cet' && tool !== 'neet') return json({ error: 'Unknown tool' }, 400);
  const data = await env.CH_KV.get('data:' + tool, 'text');
  return json({ tool: tool, uploaded: !!data, bytes: data ? data.length : 0 });
}
export async function onRequestPut({ request, env }) {
  const bad = guard(request, env); if (bad) return bad;
  const tool = new URL(request.url).searchParams.get('tool');
  if (tool !== 'cet' && tool !== 'neet') return json({ error: 'Unknown tool' }, 400);
  const text = await request.text();
  try { JSON.parse(text); } catch (e) { return json({ error: 'That file is not valid JSON.' }, 400); }
  await env.CH_KV.put('data:' + tool, text);
  return json({ ok: true, tool: tool, bytes: text.length });
}
