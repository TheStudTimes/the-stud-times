// Tiny client for the Redis store connected in Vercel (Upstash). No dependencies.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ready = () => !!(URL_ && TOKEN);
async function pipeline(cmds) {
  const r = await fetch(`${URL_.replace(/\/+$/, '')}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('store ' + r.status);
  return (await r.json()).map((x) => x.result);
}
module.exports = { ready, pipeline };
