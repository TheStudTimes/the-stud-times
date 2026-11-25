// Live player counts for the strip under the masthead.
// Asks Roblox's official public games API and caches the answer for a minute.
module.exports = async (req, res) => {
  const ids = String((req.query && req.query.ids) || '').split(',').filter((x) => /^\d{1,15}$/.test(x)).slice(0, 12);
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (!ids.length) return res.status(400).json({ error: 'ids' });
  try {
    const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(502).json({ error: 'upstream' });
    const j = await r.json();
    const games = {};
    for (const g of (j && j.data) || []) if (g && typeof g.playing === 'number') games[g.id] = { playing: g.playing };
    return res.status(200).json({ at: Date.now(), games });
  } catch {
    return res.status(502).json({ error: 'upstream' });
  }
};
