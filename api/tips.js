// Private: lists the latest tips for Kale. Needs the TIPS_KEY password set in Vercel.
const crypto = require('node:crypto');
const { ready, pipeline } = require('./_kv.js');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.TIPS_KEY || '';
  if (!key || !ready()) return res.status(503).json({ ok: false, error: 'The tip box is not set up yet.' });
  if (!same(req.headers['x-tips-key'] || '', key)) return res.status(401).json({ ok: false, error: 'Wrong password.' });
  try {
    const [rows] = await pipeline([['LRANGE', 'tips', 0, 199]]);
    const tips = (rows || []).map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    return res.status(200).json({ ok: true, tips });
  } catch {
    return res.status(502).json({ ok: false, error: 'Could not read the tips.' });
  }
};
