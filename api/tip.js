// The public tip box. Stores a short note and an optional link. No names, no emails, no IP addresses kept.
const crypto = require('node:crypto');
const { ready, pipeline } = require('./_kv.js');
const SECTIONS = ['News', 'Items & sales', 'Events', 'Games', 'Drama', 'Studio Flex', 'Business', 'Rest In Peace', 'Help Wanted', 'Other'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use the form on the site.' });
  if (!ready()) return res.status(503).json({ ok: false, error: 'The tip box is not open yet. DM @TheStudTimes on X for now.' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'Nothing was sent.' });
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill this hidden field
  const note = String(b.note || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const link = String(b.link || '').trim().slice(0, 300);
  const section = SECTIONS.includes(b.section) ? b.section : 'Other';
  if (note.length < 10) return res.status(400).json({ ok: false, error: 'Tell us a bit more (at least 10 characters).' });
  if (link && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(link)) return res.status(400).json({ ok: false, error: 'That link does not look right. It should start with https://' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const day = new Date().toISOString().slice(0, 13);
    const rk = 'tiprate:' + crypto.createHash('sha256').update(ip + '|' + day).digest('hex').slice(0, 24);
    const [count] = await pipeline([['INCR', rk], ['EXPIRE', rk, 3600]]);
    if (Number(count) > 5) return res.status(429).json({ ok: false, error: 'That is a lot of tips. Try again in an hour.' });
    const tip = JSON.stringify({ at: new Date().toISOString(), section, link, note });
    await pipeline([['LPUSH', 'tips', tip], ['LTRIM', 'tips', 0, 999]]);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: 'Could not save that. Try again in a minute.' });
  }
};
