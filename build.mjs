// The Stud Times: zero-dependency static site builder.
// Reads editions/*.json, writes the newest edition to dist/ and every edition to dist/archive/<date>/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'dist');
const SITE = 'The Stud Times';
const TAGLINE = 'Made of studs, just like every game on the front page.';
const X_URL = 'https://x.com/TheStudTimes';
const SITE_URL = 'https://www.thestudtimes.com';

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Plain text with **bold** only. Everything else is escaped.
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="est">$1</b>');
const safeUrl = (u) => (/^https?:\/\//.test(u || '') ? esc(u) : '#');
// "markets#stock" -> "markets.html#stock"
const href = (l) => { if (!l) return 'index.html'; if (/^https?:/.test(l)) return safeUrl(l); const [p, h] = l.split('#'); return `${p || 'index'}.html${h ? '#' + esc(h) : ''}`; };
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const SECTIONS = [
  ['index', 'Front Page'], ['news', 'News'], ['markets', 'Business & Markets'], ['rising', 'Rising & Falling'],
  ['studio-flex', 'Studio Flex'], ['rest-in-peace', 'Rest In Peace'], ['help-wanted', 'Help Wanted'],
];

function sources(list) {
  if (!list || !list.length) return '';
  return `<p class="src"><b>SOURCES:</b> ${list.map((s) => `<a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ')}</p>`;
}
function facts(list) {
  if (!list || !list.length) return '';
  return `<div class="facts">${list.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>`;
}
function image(img, h = 320) {
  if (!img || !img.src) return '';
  const src = /^https?:\/\//.test(img.src) ? esc(img.src) : esc(img.src.replace(/^\/+/, ''));
  return `<figure class="photo" style="--h:${h}px"><img src="${src}" alt="${esc(img.alt || '')}" loading="lazy"><figcaption>${esc(img.credit || '')}</figcaption></figure>`;
}
function story(s) {
  return `<article class="story" id="${esc(s.id)}">
    <span class="tagrow">${s.tag ? `<span class="pill">${esc(s.tag)}</span>` : ''}<span class="kicker">${esc(s.kicker)}</span></span>
    <h3>${esc(s.headline)}</h3>
    <p class="dek">${esc(s.dek)}</p>
    ${s.embed && embed(s.embed) ? `<div class="story-embed">${embed(s.embed).html}</div>` : (s._game ? gameBlock(s._game, 300) : (s._item ? `<figure class="item-pic"><img src="${esc(s._item)}" alt="${esc((s.item && s.item.name) || 'Roblox item')}" loading="lazy"><figcaption class="credit">Image: Roblox</figcaption></figure>` : image(s.image, 300)))}
    ${facts(s.facts)}
    ${(s.paras || []).map((p) => `<p>${rich(p)}</p>`).join('')}
    ${sources(s.sources)}
  </article>`;
}
const label = (t, id) => `<div class="label"${id ? ` id="${id}"` : ''}>${esc(t)}</div>`;
const pageTitle = (kicker, title, dek) => `<div class="ptitle"><span class="kicker">${esc(kicker)}</span><h2>${esc(title)}</h2><p class="dek">${esc(dek)}</p></div>`;

function stockChart(closes) {
  const W = 860, H = 340, L = 56, R = 20, T = 20, B = 44;
  const vals = closes.map((c) => c[1]);
  const lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.ceil(Math.max(...vals) / 5) * 5;
  const x = (i) => L + (i * (W - L - R)) / (closes.length - 1);
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c[1]).toFixed(1)}`).join(' ');
  let grid = '';
  for (let v = lo; v <= hi; v += 5) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="g"/><text x="${L - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="m">$${v}</text>`;
  const ticks = [0, Math.round((closes.length - 1) / 3), Math.round((2 * (closes.length - 1)) / 3), closes.length - 1];
  const xl = ticks.map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 14}" text-anchor="middle" class="m">${esc(closes[i][0])}</text>`).join('');
  const maxI = vals.indexOf(Math.max(...vals)), minI = vals.indexOf(Math.min(...vals.slice(1)));
  const ann = `<text x="${x(maxI).toFixed(1)}" y="${(y(vals[maxI]) - 14).toFixed(1)}" text-anchor="middle" class="a">Peak: $${vals[maxI].toFixed(2)}</text>`;
  const dots = closes.map((c, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(c[1]).toFixed(1)}" r="3.5"><title>${esc(c[0])}: $${c[1].toFixed(2)}</title></circle>`).join('');
  const area = `${L},${H - B} ${pts} ${x(closes.length - 1).toFixed(1)},${H - B}`;
  const first = closes[0], last = closes[closes.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Roblox stock closing price from ${esc(first[0])} ($${first[1]}) to ${esc(last[0])} ($${last[1]}), peaking at $${vals[maxI]}."><polygon points="${area}" class="area"/>${grid}<polyline points="${pts}" class="line"/>${dots}${ann}${xl}</svg>`;
}


// ---------- Roblox game info (official public API, fetched at build time) ----------
const gameCache = new Map();
async function getJSON(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function resolveGame(g) {
  if (!g) return null;
  const key = JSON.stringify(g);
  if (gameCache.has(key)) return gameCache.get(key);
  let universeId = g.universeId, placeId = g.placeId;
  if (!universeId && placeId) {
    const u = await getJSON(`https://apis.roblox.com/universes/v1/places/${encodeURIComponent(placeId)}/universe`);
    universeId = u && u.universeId;
  }
  const out = { name: g.name, universeId, placeId, thumb: null, icon: null };
  if (universeId) {
    const [info, thumbs, icons] = await Promise.all([
      getJSON(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
      getJSON(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&size=768x432&format=Png&isCircular=false`),
      getJSON(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`),
    ]);
    const d = info && info.data && info.data[0];
    if (d) { out.placeId = out.placeId || d.rootPlaceId; out.name = out.name || d.name; out.creator = d.creator && d.creator.name; }
    const t = thumbs && thumbs.data && thumbs.data[0] && thumbs.data[0].thumbnails && thumbs.data[0].thumbnails[0];
    if (t && t.state === 'Completed' && /^https:\/\//.test(t.imageUrl)) out.thumb = t.imageUrl;
    const ic = icons && icons.data && icons.data[0];
    if (ic && ic.state === 'Completed' && /^https:\/\//.test(ic.imageUrl)) out.icon = ic.imageUrl;
  }
  gameCache.set(key, out);
  return out;
}
async function enrich(ed) {
  const all = [ed.front.lead, ...(ed.markets.stories || []), ...(ed.markets.dealStories || []), ...ed.rising.up, ...ed.rising.down, ...((ed.flex && ed.flex.stories) || []), ...((ed.news && ed.news.stories) || [])];
  for (const s of all) {
    if (s && s.game) s._game = await resolveGame(s.game);
    if (s && s.item && /^\d+$/.test(String(s.item.assetId || ''))) {
      const t = await getJSON(`https://thumbnails.roblox.com/v1/assets?assetIds=${s.item.assetId}&size=420x420&format=Png&isCircular=false`);
      const d = t && t.data && t.data[0];
      if (d && d.state === 'Completed' && /^https:\/\//.test(d.imageUrl)) s._item = d.imageUrl;
    }
  }
}
function gameBlock(gm, h = 300) {
  if (!gm) return '';
  const play = gm.placeId ? `https://www.roblox.com/games/${encodeURIComponent(gm.placeId)}` : null;
  const pic = gm.thumb || gm.icon;
  const credit = `Image: Roblox${gm.creator ? ' / ' + gm.creator : ''}`;
  return `<div class="game">
    ${pic ? `<figure class="photo game-pic" style="--h:${h}px"><img src="${esc(pic)}" alt="${esc((gm.name || 'Game') + ' on Roblox')}" loading="lazy"><figcaption>${esc(credit)}</figcaption></figure>` : ''}
    ${play ? `<a class="play" href="${esc(play)}" target="_blank" rel="noopener">▶ Play ${esc(gm.name || 'it')} on Roblox</a>` : ''}
  </div>`;
}

// ---------- embeds (official embed codes only) ----------
function embed(url) {
  const u = String(url || '');
  let m;
  if (/^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/.test(u)) return { kind: 'x', html: `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light" data-chrome="transparent nofooter"><a href="${esc(u.replace('://x.com', '://twitter.com'))}"></a></blockquote>` };
  if ((m = u.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/))) return { kind: 'yt', html: `<div class="yt${/\/shorts\//.test(u) ? ' tall' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${esc(m[1])}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` };
  if ((m = u.match(/^https:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/(\d+)/))) return { kind: 'tt', html: `<blockquote class="tiktok-embed" cite="${esc(u)}" data-video-id="${esc(m[1])}"><section><a href="${esc(u)}">Watch on TikTok</a></section></blockquote>` };
  return null;
}

// ---------- page shell ----------
const BRICK = '<svg aria-hidden="true" viewBox="0 0 220 124"><rect y="32" width="220" height="92" fill="currentColor"/><rect x="22" width="46" height="32" fill="currentColor"/><rect x="87" width="46" height="32" fill="currentColor"/><rect x="152" width="46" height="32" fill="currentColor"/></svg>';
const shortDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
// games shown in the live strip: today's lead, then the risers and fallers
function liveGames(ed) {
  const seen = new Set(), out = [];
  for (const s of [ed.front.lead, ...ed.rising.up, ...ed.rising.down]) {
    const id = s && s.game && s.game.universeId;
    if (!id || !/^\d+$/.test(String(id)) || seen.has(String(id))) continue;
    seen.add(String(id));
    out.push({ id: String(id), name: (s._game && s._game.name) || s.game.name || 'Game' });
    if (out.length === 4) break;
  }
  return out;
}
const LIVE_JS = `(function(){var els=[].slice.call(document.querySelectorAll('[data-live]'));if(!els.length)return;function go(){fetch('/api/live?ids='+els.map(function(e){return e.getAttribute('data-live')}).join(',')).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j||!j.games)return;var any=false;els.forEach(function(e){var g=j.games[e.getAttribute('data-live')];if(g&&typeof g.playing==='number'){e.querySelector('b').textContent=g.playing.toLocaleString('en-US');e.hidden=false;any=true}});var h=document.querySelector('.live-h');if(h&&any)h.hidden=false}).catch(function(){})}go();setInterval(go,60000)})();`;

function shell(ed, current, body, { depth = 0, archiveLink = true } = {}) {
  const up = depth ? '../'.repeat(depth) : '';
  const short = { index: 'Front Page', news: 'News', markets: 'Markets', rising: 'Rising & Falling', 'studio-flex': 'Studio Flex', 'rest-in-peace': 'Rest In Peace', 'help-wanted': 'Help Wanted' };
  const hasNews = !!(ed.news && ed.news.stories && ed.news.stories.length);
  const nav = SECTIONS.filter(([slug]) => slug !== 'news' || hasNews).map(([slug]) => slug === current
    ? `<span class="on" aria-current="page">${esc(short[slug])}</span>`
    : `<a href="${slug}.html">${esc(short[slug])}</a>`).join('');
  const sec = SECTIONS.find((s) => s[0] === current);
  const title = current === 'index' ? `${SITE}: Roblox news, made of studs` : `${sec ? sec[1] : 'Past Editions'} · ${SITE}`;
  const st = ed.markets && ed.markets.stock;
  const live = depth === 0 ? liveGames(ed) : [];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(TAGLINE)} Daily Roblox news, player records, the Roblox stock and games that died.">
<meta property="og:site_name" content="The Stud Times">
<meta name="twitter:site" content="@TheStudTimes">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(ed.front.lead.big + ' ' + ed.front.lead.headline)}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${up}favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<meta name="theme-color" content="#1A1713">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<header class="top"><div class="wrap">
  <a href="index.html" class="name">${SITE}</a>
  <nav aria-label="Sections">${nav}${archiveLink ? `<a href="${up}archive.html">Archive</a>` : ''}</nav>
  <span class="mono date">No. ${esc(ed.number)} · ${esc(shortDate(ed.date))}</span>
</div></header>
<div class="live"><div class="wrap">
  ${live.length ? `<span class="live-h" hidden><i></i>Playing now</span>${live.map((g) => `<a hidden data-live="${esc(g.id)}" href="rising.html">${esc(g.name)} <b></b></a>`).join('')}` : ''}
  ${st ? `<a href="markets.html">${esc(String(st.ticker || 'RBLX').replace(/^NYSE:\s*/, ''))} <b>${esc(st.price)} ${esc((st.moves || [])[0] || '')}</b></a>` : ''}
</div></div>
<main class="page-${esc(current)}">${body}</main>
${body.includes('twitter-tweet') && !body.includes('platform.twitter.com/widgets.js') ? '<script async src="https://platform.twitter.com/widgets.js"></script>' : ''}
${body.includes('tiktok-embed') && !body.includes('tiktok.com/embed.js') ? '<script async src="https://www.tiktok.com/embed.js"></script>' : ''}
<footer class="foot"><div class="wrap">
  <span class="tagline">${esc(TAGLINE)}</span>
  ${ed.correction ? `<span class="corr">${esc(ed.correction)}</span>` : ''}
  <a class="follow" href="${X_URL}" target="_blank" rel="noopener">Follow @TheStudTimes on X</a>
  <span>${SITE} is an unofficial fan newspaper and is not affiliated with Roblox Corporation. Game images: Roblox and each game's creator.</span>
</div></footer>
${live.length ? `<script>${LIVE_JS}</script>` : ''}
</body>
</html>`;
}

// ---------- pages ----------
function findStory(ed, link) {
  if (!link || /^https?:/.test(link)) return null;
  const [p, id] = link.split('#');
  if (!id) return null;
  const pools = {
    markets: [...(ed.markets.stories || []), ...(ed.markets.dealStories || [])],
    rising: [...ed.rising.up, ...ed.rising.down],
    news: (ed.news && ed.news.stories) || [],
    index: [ed.front.feature, ...((ed.flex && ed.flex.stories) || [])].filter(Boolean),
  };
  return (pools[p || 'index'] || []).find((s) => s.id === id) || null;
}
function spark(closes, W = 384, H = 216) {
  const v = closes.map((c) => c[1]), lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.2 || 1;
  const x = (i) => 16 + (i * (W - 32)) / (closes.length - 1), y = (n) => 16 + (H - 32) * (1 - (n - lo + pad) / (hi - lo + 2 * pad));
  const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c[1]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Roblox stock, daily closes"><polyline points="${pts}" fill="none" stroke="#7A1F12" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}
const gamePic = (gm) => gm && (gm.thumb || gm.icon);
const creditOf = (gm) => `Image: Roblox${gm && gm.creator ? ' / ' + gm.creator : ''}`;
function cardArt(ed, q) {
  const s = findStory(ed, q.link), gm = s && s._game;
  if (gamePic(gm)) return `<span class="art"><img src="${esc(gamePic(gm))}" alt="" loading="lazy"><span class="credit">${esc(creditOf(gm))}</span></span>`;
  if (s && s._item) return `<span class="art"><img src="${esc(s._item)}" alt="" loading="lazy" style="object-fit: contain"><span class="credit">Image: Roblox</span></span>`;
  if (/^markets/.test(q.link || '') && /\$/.test(q.big || '') && ed.markets.stock) return `<span class="art">${spark(ed.markets.stock.closes)}</span>`;
  return `<span class="art art-type">${BRICK}</span>`;
}
const changeOf = (s) => { const f = (s.facts || []).find(([k]) => /change/i.test(k)); return f ? f[1] : (((s.facts || [])[0] || [])[1] || ''); };
function mover(s, dir) {
  const gm = s._game, c = String(changeOf(s)).replace(/^[+\-−]/, '');
  return `<a class="mover" href="rising.html#${esc(s.id)}">
    ${gm && gm.icon ? `<img src="${esc(gm.icon)}" alt="" loading="lazy">` : '<span class="noicon"></span>'}
    <span class="who"><b>${esc((gm && gm.name) || (s.game && s.game.name) || s.headline)}</b><span>${esc(s.headline)}</span></span>
    <span class="chg ${dir}">${dir === 'up' ? '▲' : '▼'} ${esc(c)}</span>
  </a>`;
}
function frontPage(ed) {
  const f = ed.front, L = f.lead, gm = L._game, st = ed.markets.stock;
  const play = gm && gm.placeId ? `https://www.roblox.com/games/${encodeURIComponent(gm.placeId)}` : null;
  const pic = gamePic(gm) || (L.image && L.image.src);
  return `
  <article class="hero" id="lead">
    ${pic ? `<figure class="hero-pic"><img src="${esc(pic)}" alt="${esc(((gm && gm.name) || L.headline) + ' on Roblox')}"><figcaption class="credit">${esc(gm ? creditOf(gm) : (L.image.credit || ''))}</figcaption></figure>` : ''}
    <div class="hero-text">
      <span class="kicker">${esc(L.kicker)}</span>
      <div class="huge">${esc(L.big)}</div>
      <h2>${esc(L.headline)}</h2>
      <p class="dek">${esc(L.dek)}</p>
      <div class="btns"><a class="btn solid" href="${href(L.link)}">Read the story</a>${play ? `<a class="btn" href="${esc(play)}" target="_blank" rel="noopener">Play on Roblox</a>` : ''}</div>
    </div>
  </article>
  <section id="quick">
    ${label('Today in 10 seconds')}
    <div class="cards">${f.quick.map((q) => `<a class="card" href="${href(q.link)}">${cardArt(ed, q)}<span class="big${/^[-−▼]/.test(q.big || '') ? ' down' : ''}">${esc(q.big)}</span><b>${esc(q.head)}</b><span class="sub">${esc(q.sub)}</span></a>`).join('')}</div>
  </section>
  <section class="duo" id="today" style="flex-direction: row">
    ${st ? `<div class="panel">
      <span class="kicker">Business &amp; Markets · ${esc(st.ticker)}</span>
      <div class="pline"><span class="p">${esc(st.price)}</span>${(st.moves || []).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      <div style="aspect-ratio: 3 / 1">${spark(st.closes, 600, 200)}</div>
      <p class="quote">${esc(st.caption)}</p>
      <a class="more" href="markets.html">${ed.markets.stories.length ? esc(ed.markets.stories[0].headline) + ', and more' : 'Open Business & Markets'}</a>
    </div>` : ''}
    <div class="movers">
      ${label('Rising & Falling')}
      <div style="margin-top: 14px">${ed.rising.up.slice(0, 3).map((s) => mover(s, 'up')).join('')}${ed.rising.down.slice(0, 3).map((s) => mover(s, 'down')).join('')}</div>
    </div>
  </section>
  ${ed.news && ed.news.stories && ed.news.stories.length ? `<section id="news">
    ${label('In the news')}
    <div class="cards">${ed.news.stories.slice(0, 6).map((n) => `<a class="card" href="news.html#${esc(n.id)}">${cardArt(ed, { link: 'news#' + n.id })}${n.tag ? `<span class="tagrow"><span class="pill">${esc(n.tag)}</span></span>` : ''}<b>${esc(n.headline)}</b><span class="sub">${esc(n.dek)}</span></a>`).join('')}</div>
  </section>` : ''}
  ${f.feature ? `<section id="feature">${label(f.feature.label || 'Teased today')}${story(f.feature)}</section>` : ''}
  ${ed.rip && ed.rip.stones && ed.rip.stones.length ? `<section id="rip">
    ${label('Rest In Peace')}
    <div class="stones">${ed.rip.stones.slice(0, 4).map((s) => `<a class="stone" href="rest-in-peace.html" style="text-decoration: none"><span class="here">R.I.P.</span><b>${esc(s.name)}</b><span class="mono">${esc(s.dates)}</span><i>${esc(s.joke)}</i></a>`).join('')}</div>
  </section>` : ''}
  ${ed.flex && ed.flex.stories && ed.flex.stories.length ? `<section id="new-in-studio">${label('New in Studio')}${ed.flex.stories.map(story).join('')}</section>` : ''}
  ${f.comingUp && f.comingUp.length ? `<section id="coming-up">
    ${label('Coming up')}
    <div class="events">${f.comingUp.map((e) => `<div><b>${esc(e.when)}</b><span>${esc(e.what)}</span></div>`).join('')}</div>
    ${sources(f.comingUpSources)}
  </section>` : ''}
  <section class="ad" id="ad">
    <span class="mono small">Advertisement</span>
    <span class="ad-h">This Space For Rent</span>
    <span>Put your game, studio or shop in front of Roblox players and devs, every single day.</span>
    <a class="btn" href="${X_URL}" target="_blank" rel="noopener">DM @TheStudTimes for ad space</a>
  </section>`;
}

function newsPage(ed) {
  const n = ed.news || {};
  return `${pageTitle('NEWS', n.title || 'The News', n.dek || 'Items, sales, events, drama and lawsuits: everything else happening on Roblox.')}
  ${(n.stories || []).length ? n.stories.map(story).join('') : '<p class="note">This edition had no News page yet.</p>'}`;
}

function marketsPage(ed) {
  const m = ed.markets, s = m.stock;
  const deal = (d) => `<div class="deal">
      <div class="deal-top"><span><b>${esc(d.game)}</b> · ${esc(d.who)} <i>(${esc(d.when)})</i></span><span class="deal-price"><b>${esc(d.price)}</b><span class="tag ${d.tag === 'ESTIMATE' ? 'est' : ''}">${esc(d.tag)}</span></span></div>
      ${d.bar ? `<div class="bar ${d.tag === 'ESTIMATE' ? 'est' : ''}" style="width:${Math.max(2, Math.min(100, +d.bar))}%"></div>` : ''}
      <span>${esc(d.note)}</span>
      ${sources(d.sources)}
    </div>`;
  return `${pageTitle('BUSINESS & MARKETS', m.title, m.dek)}
  <section id="stock">
    ${label('ROBLOX STOCK (' + s.ticker + ')')}
    <div class="price"><span class="p">${esc(s.price)}</span><span class="moves">${s.moves.map((x) => `<span>${esc(x)}</span>`).join('')}</span></div>
    <div class="chartbox">${stockChart(s.closes)}</div>
    <p class="note">${esc(s.note)}</p>
    <p class="quote">"${esc(s.caption)}"</p>
    ${sources(s.sources)}
  </section>
  <section id="month">${label('THIS MONTH IN ROBLOX MONEY')}${m.stories.map(story).join('')}</section>
  ${(m.dealStories && m.dealStories.length) || (m.bigDeals && m.bigDeals.length) ? `<section id="deals">
    ${label('WHO TEAMED UP WITH WHOM')}
    ${(m.dealStories || []).map(story).join('')}
    ${m.bigDeals && m.bigDeals.length ? `<div class="deals"><h4>For scale: the biggest Roblox game deals so far</h4><p class="note">Solid bar = price reported in the news. Striped bar = <b class="est">our estimate</b>.</p>${m.bigDeals.map(deal).join('')}</div>` : ''}
  </section>` : ''}`;
}

function risingPage(ed) {
  const r = ed.rising;
  return `${pageTitle('RISING & FALLING', r.title, r.dek)}
  ${label('▲ GOING UP', 'up')}${r.up.map(story).join('')}
  ${label('▼ GOING DOWN', 'down')}${r.down.map(story).join('')}`;
}

function flexPage(ed) {
  const f = ed.flex;
  const SLOTS = 6;
  const post = (p, i) => {
    const em = embed(p.url);
    return `<figure class="clip">
      <span class="clip-no">No. ${i + 1}</span>
      ${em ? em.html : (p.image ? image(p.image, 220) : '')}
      <figcaption>${[p.caption ? esc(p.caption) : '', p.creator ? `<b>${esc(p.creator)}</b>` : '', p.url ? `<a href="${safeUrl(p.url)}" target="_blank" rel="noopener">Original post</a>` : ''].filter(Boolean).join(' · ')}</figcaption>
    </figure>`;
  };
  const list = (f.posts || []).filter((p) => p.url || p.image).slice(0, SLOTS);
  const empty = (i) => `<div class="clip clip-empty"><span class="clip-no">No. ${i + 1}</span><span class="slot-h">This spot is open</span><span>Built something insane in Studio? Tag <a href="${X_URL}" target="_blank" rel="noopener">@TheStudTimes</a> and it could be here tomorrow.</span></div>`;
  const cells = list.map(post).concat(Array.from({ length: Math.max(0, SLOTS - list.length) }, (_, k) => empty(list.length + k)));
  const larp = f.larp && (f.larp.url || f.larp.image) ? `<section class="box" id="larp"><span class="box-h">Studio Larp of the Day</span>${post(f.larp, 0).replace('No. 1', 'LARP')}</section>` : '';
  return `${pageTitle('STUDIO FLEX', f.title, f.dek)}
  <section id="flex">${label('THE FLEX REEL')}<div class="flex-grid">${cells.join('')}</div></section>
  ${larp}
`;
}

function ripPage(ed) {
  const r = ed.rip;
  return `${pageTitle('REST IN PEACE', r.title, r.dek)}
  <section class="stones" id="stones">${r.stones.map((s) => `<div class="stone"><span class="here">Here lies</span><b>${esc(s.name)}</b><span class="mono">${esc(s.dates)}</span><span>${esc(s.fact)}</span><i>${esc(s.joke)}</i>${sources(s.sources)}</div>`).join('')}</section>
  <p class="note center">${esc(r.note)}</p>`;
}

function helpPage(ed) {
  const h = ed.help;
  return `${pageTitle('HELP WANTED', h.title, h.dek)}
  ${h.listings && h.listings.length
    ? `<section class="listings" id="listings">${h.listings.map((l) => `<div class="listing"><b class="mono">${esc(l.kind)}</b><span>${esc(l.text)}</span>${l.contact ? `<a href="${safeUrl(l.contact)}" target="_blank" rel="noopener">Contact →</a>` : ''}</div>`).join('')}</section>`
    : ''}
  <section class="box" id="post"><span class="box-h">Want your listing here?</span><span>${esc(h.how)}</span></section>`;
}

const PAGES = { index: frontPage, news: newsPage, markets: marketsPage, rising: risingPage, 'studio-flex': flexPage, 'rest-in-peace': ripPage, 'help-wanted': helpPage };

// ---------- build ----------
const files = readdirSync(join(ROOT, 'editions')).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) throw new Error('No editions found');
const editions = files.map((f) => JSON.parse(readFileSync(join(ROOT, 'editions', f), 'utf8')));
const latest = editions[editions.length - 1];
for (const ed of editions) await enrich(ed);

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'style.css'), join(OUT, 'style.css'));
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), OUT, { recursive: true });

function writeEdition(ed, dir, depth) {
  mkdirSync(dir, { recursive: true });
  for (const [slug, fn] of Object.entries(PAGES)) {
    writeFileSync(join(dir, slug + '.html'), shell(ed, slug, fn(ed), { depth }));
  }
}
writeEdition(latest, OUT, 0);
for (const ed of editions) writeEdition(ed, join(OUT, 'archive', ed.date), 2);

const archive = `${pageTitle('PAST EDITIONS', 'The Archive', 'Every edition of The Stud Times, newest first.')}
  <section class="archive">${editions.slice().reverse().map((ed) => `<a class="arch" href="archive/${esc(ed.date)}/index.html"><span class="mono">No. ${esc(ed.number)} · ${esc(fmtDate(ed.date))}</span><b>${esc(ed.front.lead.big)} ${esc(ed.front.lead.headline)}</b></a>`).join('')}</section>`;
writeFileSync(join(OUT, 'archive.html'), shell(latest, 'index', archive, { archiveLink: false }).replace('<span class="on" aria-current="page">Front Page</span>', '<a href="index.html">Front Page</a>').replace('class="page-index"', 'class="page-archive"'));

// ---------- tweet drafts desk (/desk, unlinked and noindex): copy-paste drafts with card images ----------
const TWEET_TAIL = 'thestudtimes.com #Roblox #RobloxNews';
async function saveIcon(url, id) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    mkdirSync(join(OUT, 'desk', 'img'), { recursive: true });
    writeFileSync(join(OUT, 'desk', 'img', `${id}.png`), Buffer.from(await r.arrayBuffer()));
    return `/desk/img/${id}.png`;
  } catch { return null; }
}
async function deskPage(ed) {
  const tweets = [];
  for (const tw of ed.tweets || []) {
    const card = tw.card ? { ...tw.card } : null;
    if (card) {
      if (!card.label) card.label = `NO. ${ed.number} · ${fmtDate(ed.date).toUpperCase()}`;
      if (card.chart && card.chart.line === 'stock') card.chart = { prefix: '$', ...card.chart, line: ed.markets.stock.closes };
      if (card.game) {
        const gm = await resolveGame(card.game);
        if (gm && gm.icon && gm.universeId) card.icon = await saveIcon(gm.icon, gm.universeId);
        if (gm && gm.thumb && gm.universeId) card.wide = await saveIcon(gm.thumb, gm.universeId + '-wide');
        card.credit = `Image: Roblox${gm && gm.creator ? ' / ' + gm.creator : ''}`;
        delete card.game;
      }
    }
    // every draft ends with the site link and the two hashtags (Kale's standing ask)
    let text = (tw.text || '').trim();
    if (!/thestudtimes\.com/i.test(text)) text += `\n\n${TWEET_TAIL}`;
    tweets.push({ text, card });
  }
  const data = JSON.stringify(tweets).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Tweet drafts · ${esc(fmtDate(ed.date))} · ${SITE}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500;700&display=swap">
<style>
body{margin:0;background:#F3ECDA;color:#1A1713;font-family:'Libre Baskerville',Georgia,serif}
main{max-width:900px;margin:0 auto;padding:28px 18px 80px}
h1{font-family:'UnifrakturMaguntia',serif;font-weight:400;font-size:46px;margin:0}
.mono{font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase}
.draft{border-top:3px double #1A1713;margin-top:28px;padding-top:18px}
canvas{display:block;width:100%;height:auto;border:1px solid #1A1713}
textarea{display:block;box-sizing:border-box;width:100%;min-height:150px;margin-top:12px;padding:12px;border:1px solid #1A1713;background:#FBF7EA;color:#1A1713;font:16px/1.5 'Libre Baskerville',Georgia,serif;resize:vertical}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:10px}
button{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;min-height:44px;padding:0 16px;border:2px solid #1A1713;background:#1A1713;color:#F3ECDA;cursor:pointer}
button.alt{background:transparent;color:#1A1713}
.count{margin-left:auto}.count.over{color:#7A1F12;font-weight:700}
</style>
</head>
<body>
<main>
<h1>${SITE}</h1>
<p class="mono">Tweet drafts · No. ${esc(ed.number)} · ${esc(fmtDate(ed.date))} · drafts only, nothing here is posted for you · <a href="/desk/pinned" style="color:#7A1F12">pinned tweet</a> · <a href="/desk" style="color:#7A1F12">today</a></p>
${tweets.map((tw, i) => `<section class="draft" id="draft-${i}">
<p class="mono">Draft ${i + 1} of ${tweets.length}</p>
${tw.card ? '<canvas width="1600" height="900" role="img" aria-label="Card image for draft ' + (i + 1) + '"></canvas>' : '<canvas width="1600" height="900" hidden></canvas>'}
<textarea aria-label="Tweet text for draft ${i + 1}">${esc(tw.text)}</textarea>
<div class="row"><button class="copy-text" type="button">Copy text</button>${tw.card ? '<button class="copy-img alt" type="button">Copy image</button><button class="dl-img alt" type="button">Download image</button>' : ''}<span class="mono count"></span></div>
</section>`).join('\n')}
</main>
<script>window.STUD_DATE=${JSON.stringify(ed.date)};window.STUD_TWEETS=${data};</script>
<script src="/desk/cards.js"></script>
</body>
</html>`;
}
// the pinned intro tweet (pinned.json) gets its own page at /desk/pinned
if (existsSync(join(ROOT, 'pinned.json'))) {
  mkdirSync(join(OUT, 'desk'), { recursive: true });
  const pinned = JSON.parse(readFileSync(join(ROOT, 'pinned.json'), 'utf8'));
  writeFileSync(join(OUT, 'desk', 'pinned.html'), await deskPage({ ...latest, tweets: [pinned] }));
}
const withTweets = editions.filter((ed) => Array.isArray(ed.tweets) && ed.tweets.length);
if (withTweets.length) {
  mkdirSync(join(OUT, 'desk'), { recursive: true });
  for (const ed of withTweets) {
    const html = await deskPage(ed);
    writeFileSync(join(OUT, 'desk', `${ed.date}.html`), html);
    if (ed === withTweets[withTweets.length - 1]) writeFileSync(join(OUT, 'desk', 'index.html'), html);
  }
}

console.log(`Built ${editions.length} edition(s). Latest: ${latest.date}`);
