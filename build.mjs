// The Stud Times: zero-dependency static site builder.
// Reads editions/*.json, writes the newest edition to dist/ and every edition to dist/archive/<date>/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'dist');
const SITE = 'The Stud Times';
const TAGLINE = 'Made of studs, just like every game on the front page.';

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Plain text with **bold** only. Everything else is escaped.
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="est">$1</b>');
const safeUrl = (u) => (/^https?:\/\//.test(u || '') ? esc(u) : '#');
// "markets#stock" -> "markets.html#stock"
const href = (l) => { if (!l) return 'index.html'; if (/^https?:/.test(l)) return safeUrl(l); const [p, h] = l.split('#'); return `${p || 'index'}.html${h ? '#' + esc(h) : ''}`; };
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const SECTIONS = [
  ['index', 'Front Page'], ['markets', 'Business & Markets'], ['rising', 'Rising & Falling'],
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
    <span class="kicker">${esc(s.kicker)}</span>
    <h3>${esc(s.headline)}</h3>
    <p class="dek">${esc(s.dek)}</p>
    ${image(s.image, 300)}
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

// ---------- page shell ----------
function shell(ed, current, body, { big = false, depth = 0, archiveLink = true } = {}) {
  const up = depth ? '../'.repeat(depth) : '';
  const nav = SECTIONS.map(([slug, name]) => slug === current
    ? `<span class="on">${esc(name)}</span>`
    : `<a href="${slug}.html">${esc(name)}</a>`).join('');
  const title = current === 'index' ? `${SITE}: Roblox news, made of studs` : `${SECTIONS.find((s) => s[0] === current)[1]} · ${SITE}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(TAGLINE)} Daily Roblox news, player records, the Roblox stock and games that died.">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(ed.front.lead.big + ' ' + ed.front.lead.headline)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<div class="paper">
  <header class="mast">
    <a href="index.html" class="name${big ? ' big' : ''}">${SITE}</a>
    ${big ? `<p class="tag">"${esc(TAGLINE)}"</p>` : ''}
    <div class="dateline"><span>${esc(fmtDate(ed.date))}</span><span>Vol. I · No. ${esc(ed.number)}</span><span>Price: 1 Stud</span></div>
    <nav aria-label="Sections">${nav}${archiveLink ? `<a href="${up}archive.html">Past Editions</a>` : ''}</nav>
  </header>
  <main>${body}</main>
  <footer class="foot">
    <span class="corr">${esc(ed.correction || '')}</span>
    <span class="mono">${SITE} is an unofficial fan newspaper and is not affiliated with Roblox Corporation.</span>
  </footer>
</div>
</body>
</html>`;
}

// ---------- pages ----------
function frontPage(ed) {
  const f = ed.front, L = f.lead;
  return `
  <article class="lead" id="lead">
    <span class="flag">${esc(L.kicker)}</span>
    <div class="huge">${esc(L.big)}</div>
    <h2>${esc(L.headline)}</h2>
    <p class="dek">${esc(L.dek)}</p>
    ${image(L.image, 340)}
    <a class="more" href="${href(L.link)}">READ THE FULL STORY →</a>
  </article>
  <section id="quick">
    ${label('THE NEWS IN 10 SECONDS')}
    <div class="cards">${f.quick.map((q) => `<a class="card" href="${href(q.link)}"><span class="big">${esc(q.big)}</span><b>${esc(q.head)}</b><span class="sub">${esc(q.sub)}</span><span class="more">READ MORE →</span></a>`).join('')}</div>
  </section>
  ${f.comingUp && f.comingUp.length ? `<section id="coming-up">
    ${label('COMING UP')}
    <div class="events">${f.comingUp.map((e) => `<div><b>${esc(e.when)}</b><span>${esc(e.what)}</span></div>`).join('')}</div>
    ${sources(f.comingUpSources)}
  </section>` : ''}
  <section class="ad" id="ad">
    <span class="mono small">ADVERTISEMENT</span>
    <span class="ad-h">WANTED: Handmade assets?</span>
    <span class="ad-name">The Workshop</span>
    <span>No AI. No prompting. Just drop them in.</span>
    <a class="btn" href="https://ourworksshop.com" target="_blank" rel="noopener">OURWORKSSHOP.COM</a>
  </section>`;
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
  const post = (p, i) => `<figure class="flex-post${i === 0 ? ' top' : ''}">
      ${p.image ? image(p.image, i === 0 ? 380 : 220) : ''}
      ${p.url ? `<blockquote class="twitter-tweet" data-dnt="true"><a href="${safeUrl(p.url)}">${esc(p.caption || 'View post')}</a></blockquote>` : ''}
      <figcaption>${esc(p.caption || '')}${p.creator ? ` · <b>${esc(p.creator)}</b>` : ''}</figcaption>
    </figure>`;
  const posts = f.posts && f.posts.length
    ? `${label('#1 FLEX OF THE DAY')}${post(f.posts[0], 0)}${f.posts.length > 1 ? `<div class="grid2">${f.posts.slice(1).map((p, i) => post(p, i + 1)).join('')}</div>` : ''}`
    : `<div class="empty">Studio Flex is warming up. Built something insane? Tag us on X and you could be tomorrow's #1.</div>`;
  return `${pageTitle('STUDIO FLEX', f.title, f.dek)}
  <section id="flex">${posts}</section>
  ${f.larp ? `<section class="box" id="larp"><span class="box-h">Studio Larp of the Day</span>${post(f.larp, 1)}</section>` : ''}
  ${f.stories && f.stories.length ? `<section id="new-in-studio">${label('NEW IN STUDIO')}${f.stories.map(story).join('')}</section>` : ''}
  ${f.posts && f.posts.some((p) => p.url) ? '<script async src="https://platform.twitter.com/widgets.js"></script>' : ''}`;
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

const PAGES = { index: frontPage, markets: marketsPage, rising: risingPage, 'studio-flex': flexPage, 'rest-in-peace': ripPage, 'help-wanted': helpPage };

// ---------- build ----------
const files = readdirSync(join(ROOT, 'editions')).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) throw new Error('No editions found');
const editions = files.map((f) => JSON.parse(readFileSync(join(ROOT, 'editions', f), 'utf8')));
const latest = editions[editions.length - 1];

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'style.css'), join(OUT, 'style.css'));
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), OUT, { recursive: true });

function writeEdition(ed, dir, depth) {
  mkdirSync(dir, { recursive: true });
  for (const [slug, fn] of Object.entries(PAGES)) {
    writeFileSync(join(dir, slug + '.html'), shell(ed, slug, fn(ed), { big: slug === 'index', depth }));
  }
}
writeEdition(latest, OUT, 0);
for (const ed of editions) writeEdition(ed, join(OUT, 'archive', ed.date), 2);

const archive = `${pageTitle('PAST EDITIONS', 'The Archive', 'Every edition of The Stud Times, newest first.')}
  <section class="archive">${editions.slice().reverse().map((ed) => `<a class="arch" href="archive/${esc(ed.date)}/index.html"><span class="mono">No. ${esc(ed.number)} · ${esc(fmtDate(ed.date))}</span><b>${esc(ed.front.lead.big)} ${esc(ed.front.lead.headline)}</b></a>`).join('')}</section>`;
writeFileSync(join(OUT, 'archive.html'), shell(latest, 'index', archive, { archiveLink: false }).replace('<span class="on">Front Page</span>', '<a href="index.html">Front Page</a>'));

console.log(`Built ${editions.length} edition(s). Latest: ${latest.date}`);
