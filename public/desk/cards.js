// The Stud Times: tweet card maker. Draws each draft's image on a canvas (1600x900)
// from the data the build put in window.STUD_TWEETS. No dependencies.
(function () {
  const W = 1600, H = 900;
  const PAPER = '#F3ECDA', INK = '#1A1713', RED = '#7A1F12';
  const THEMES = {
    paper: { bg: PAPER, fg: INK, accent: RED },
    ink: { bg: INK, fg: PAPER, accent: PAPER },
    red: { bg: RED, fg: PAPER, accent: PAPER },
  };
  const F = {
    mast: (s) => `${s}px "UnifrakturMaguntia", serif`,
    head: (s, w) => `${w || 700} ${s}px "Playfair Display", Georgia, serif`,
    body: (s, it) => `${it ? 'italic ' : ''}${s}px "Libre Baskerville", Georgia, serif`,
    mono: (s, w) => `${w || 500} ${s}px "IBM Plex Mono", monospace`,
  };

  function spacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function fit(ctx, text, font, max, min, maxW) {
    let s = max;
    for (; s > min; s -= 2) { ctx.font = font(s); if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = font(s);
    return s;
  }
  function brick(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 10, 56, 23);
    for (const sx of [7, 23, 39]) ctx.fillRect(x + sx, y + 2, 12, 8);
  }

  function cover(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }

  // horizontal bars: label, bar, value. The last row is highlighted.
  function drawBars(ctx, t, c, x, y, w, h) {
    const rows = c.bars || [];
    if (!rows.length) return;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = t.accent; spacing(ctx, 2); ctx.font = F.mono(20, 700);
    if (c.title) ctx.fillText(c.title, x, y + 22);
    const top = y + (c.title ? 40 : 0), rh = Math.min(96, (y + h - top) / rows.length);
    const max = Math.max(...rows.map((r) => r[1]));
    spacing(ctx, 1); ctx.font = F.mono(17, 500);
    const lw = Math.max(...rows.map((r) => ctx.measureText(r[0]).width)) + 18;
    spacing(ctx, 0); ctx.font = F.head(40, 900);
    const vw = Math.max(...rows.map((r) => ctx.measureText(r[2] || String(r[1])).width)) + 16;
    const bw = w - lw - vw, bh = Math.min(54, rh - 16);
    rows.forEach((r, i) => {
      const cy = top + i * rh + rh / 2, len = Math.max(6, (bw * r[1]) / max), last = i === rows.length - 1;
      ctx.fillStyle = t.fg; spacing(ctx, 1); ctx.font = F.mono(17, 500);
      ctx.fillText(r[0], x, cy + 6);
      ctx.globalAlpha = last ? 1 : 0.45; ctx.fillStyle = last ? t.accent : t.fg;
      ctx.fillRect(x + lw, cy - bh / 2, len, bh);
      ctx.globalAlpha = 1; ctx.fillStyle = t.fg; spacing(ctx, 0); ctx.font = F.head(40, 900);
      ctx.fillText(r[2] || String(r[1]), x + lw + len + 12, cy + 14);
    });
  }

  // a generic wallet drawing for money stories with no game picture (no logos)
  function drawWallet(ctx, t, x, y, w, h) {
    ctx.fillStyle = t.accent; ctx.fillRect(x, y, w, h);
    const fg = t.bg, cx = x + w / 2, cy = y + h / 2, bw = Math.min(460, w - 120), bh = bw * 0.66;
    const bx = cx - bw / 2, by = cy - bh / 2 + 40;
    ctx.fillStyle = fg; ctx.globalAlpha = 0.55; ctx.fillRect(bx + 50, by - 96, bw - 130, 130);
    ctx.globalAlpha = 0.8; ctx.fillRect(bx + 90, by - 58, bw - 150, 100);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 26); ctx.fill();
    ctx.fillStyle = t.accent; ctx.fillRect(bx, by + 56, bw, 5);
    ctx.fillStyle = fg; ctx.strokeStyle = t.accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(bx + bw - 150, by + bh / 2 - 44, 180, 88, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.arc(bx + bw - 100, by + bh / 2, 17, 0, 7); ctx.fill();
  }

  function drawLine(ctx, t, c, x, y, w, h) {
    const pts = c.line || [];
    if (pts.length < 2) return;
    const chips = c.chips || [];
    const ch = h - 44 - (chips.length ? 76 : 0);
    const vals = pts.map((p) => p[1]);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12 || 1;
    const px = (i) => x + 20 + ((w - 40) * i) / (pts.length - 1);
    const py = (v) => y + 20 + (ch - 40) * (1 - (v - (lo - pad)) / (hi - lo + 2 * pad));
    ctx.strokeStyle = t.fg; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, ch);
    ctx.setLineDash([3, 7]); ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, y + (ch * k) / 4); ctx.lineTo(x + w, y + (ch * k) / 4); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = t.accent; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(px(i), py(p[1])) : ctx.moveTo(px(i), py(p[1]))));
    ctx.stroke();
    const hiI = vals.indexOf(hi), n = pts.length - 1;
    ctx.fillStyle = t.fg; ctx.beginPath(); ctx.arc(px(hiI), py(hi), 9, 0, 7); ctx.fill();
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.arc(px(n), py(vals[n]), 9, 0, 7); ctx.fill();
    const pre = c.prefix || '';
    ctx.fillStyle = t.fg; spacing(ctx, 1); ctx.font = F.mono(18, 500); ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillText(String(pts[0][0]).toUpperCase(), x, y + ch + 30);
    ctx.textAlign = 'center'; ctx.fillText(`HIGH ${pre}${hi}`.toUpperCase(), x + w / 2, y + ch + 30);
    ctx.textAlign = 'right'; ctx.fillText(String(pts[n][0]).toUpperCase(), x + w, y + ch + 30);
    if (chips.length) {
      const cw = (w - 16 * (chips.length - 1)) / chips.length, cy = y + h - 58;
      chips.forEach((txt, i) => {
        const cx = x + i * (cw + 16);
        if (t.bg === PAPER) { ctx.fillStyle = i === 0 ? RED : INK; ctx.fillRect(cx, cy, cw, 58); ctx.fillStyle = PAPER; }
        else { ctx.strokeStyle = t.fg; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, 58); ctx.fillStyle = t.fg; }
        ctx.textAlign = 'left';
        fit(ctx, txt, (s) => F.mono(s, 700), 24, 14, cw - 32);
        ctx.fillText(txt, cx + 16, cy + 38);
      });
    }
    ctx.textAlign = 'left';
  }

  function drawTomb(ctx, t, tomb, x, y, w, h) {
    const tw = Math.min(540, w), th = Math.min(612, h), tx = x + (w - tw) / 2, ty = y + (h - th) / 2;
    ctx.fillStyle = t.bg === PAPER ? INK : PAPER;
    const ink = t.bg === PAPER ? PAPER : INK;
    ctx.beginPath();
    ctx.moveTo(tx, ty + th); ctx.lineTo(tx, ty + tw / 2);
    ctx.arc(tx + tw / 2, ty + tw / 2, tw / 2, Math.PI, 0);
    ctx.lineTo(tx + tw, ty + th); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
    const cx = tx + tw / 2;
    let cy = ty + 190;
    spacing(ctx, 2); ctx.font = F.head(100, 900); ctx.fillText('R.I.P.', cx, cy);
    cy += 34; ctx.fillRect(cx - 90, cy, 180, 2); ctx.fillRect(cx - 90, cy + 6, 180, 2);
    cy += 70; spacing(ctx, 0);
    fit(ctx, tomb.name || '', (s) => F.head(s, 700), 52, 26, tw - 70); ctx.fillText(tomb.name || '', cx, cy);
    cy += 58; spacing(ctx, 3); ctx.font = F.mono(28, 700);
    ctx.fillStyle = t.bg === PAPER ? PAPER : RED; ctx.fillText(tomb.dates || '', cx, cy);
    ctx.fillStyle = ink; spacing(ctx, 0); ctx.font = F.body(23, true);
    cy += 54;
    for (const ln of wrap(ctx, tomb.line || '', tw - 90)) { ctx.fillText(ln, cx, cy); cy += 34; }
    ctx.textAlign = 'left';
  }

  function draw(canvas, card, icon, wide) {
    const ctx = canvas.getContext('2d');
    const t = THEMES[card.theme] || THEMES.paper;
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = t.fg; ctx.lineWidth = 3; ctx.strokeRect(29.5, 29.5, W - 59, H - 59);
    ctx.lineWidth = 1; ctx.strokeRect(40.5, 40.5, W - 81, H - 81);
    const L = 96, R = W - 96;

    // header
    ctx.fillStyle = t.fg; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    spacing(ctx, 0); ctx.font = F.mast(62); ctx.fillText('The Stud Times', L, 124);
    const mastW = ctx.measureText('The Stud Times').width;
    spacing(ctx, 2); ctx.textAlign = 'right';
    fit(ctx, card.label || '', (s) => F.mono(s, 500), 22, 14, R - L - mastW - 50);
    ctx.fillText(card.label || '', R, 122);
    ctx.fillRect(L, 142, R - L, 1); ctx.fillRect(L, 146, R - L, 1);

    // footer
    ctx.fillRect(L, 812, R - L, 1);
    brick(ctx, L, 826, t.accent);
    ctx.fillStyle = t.fg; ctx.textAlign = 'left'; spacing(ctx, 2); ctx.font = F.mono(20, 700);
    ctx.fillText('THESTUDTIMES.COM', L + 74, 852);
    const siteW = ctx.measureText('THESTUDTIMES.COM').width;
    const foot = [card.source, 'UNOFFICIAL, NOT AFFILIATED WITH ROBLOX'].filter(Boolean).join(' · ');
    ctx.textAlign = 'right';
    fit(ctx, foot, (s) => F.mono(s, 500), 20, 12, R - L - siteW - 120);
    ctx.fillText(foot, R, 852);

    // body
    const top = 166, bot = 796;
    const hasVisual = !!(card.tomb || card.art || icon || wide || card.chart);
    const textW = hasVisual ? 644 : R - L;
    const vx = 800, vw = R - vx, vy = top + 6, vh = bot - vy;

    ctx.textAlign = 'left';
    const blocks = [];
    if (card.kicker) blocks.push({ kind: 'kicker', h: 40 });
    if (card.big) {
      const big = String(card.big);
      let size = fit(ctx, big, (s) => F.head(s, 900), hasVisual ? 220 : 260, 100, textW), lines = [big];
      if (ctx.measureText(big).width > textW) { size = 104; ctx.font = F.head(size, 900); lines = wrap(ctx, big, textW); }
      blocks.push({ kind: 'big', size, lines, h: lines.length * size * 1.0 });
    }
    if (card.headline) {
      let size = 64; ctx.font = F.head(size, 700); let lines = wrap(ctx, card.headline, textW);
      if (lines.length > 2) { size = 50; ctx.font = F.head(size, 700); lines = wrap(ctx, card.headline, textW); }
      blocks.push({ kind: 'headline', size, lines, h: lines.length * size * 1.14 });
    }
    if (card.dek) {
      ctx.font = F.body(31, true); const lines = wrap(ctx, card.dek, textW);
      blocks.push({ kind: 'dek', lines, h: lines.length * 45 + 8 });
    }
    const gap = 18, total = blocks.reduce((a, b) => a + b.h, 0) + gap * (blocks.length - 1);
    let y = top + (bot - top - total) / 2;
    for (const b of blocks) {
      if (b.kind === 'kicker') {
        ctx.fillStyle = t.accent; spacing(ctx, 4);
        fit(ctx, card.kicker, (s) => F.mono(s, 700), 28, 16, textW); ctx.fillText(card.kicker, L, y + 30);
      } else if (b.kind === 'big') {
        ctx.fillStyle = t.fg; spacing(ctx, -3); ctx.font = F.head(b.size, 900);
        b.lines.forEach((ln, i) => ctx.fillText(ln, L - 4, y + b.size * 0.86 + i * b.size));
      } else if (b.kind === 'headline') {
        ctx.fillStyle = t.fg; spacing(ctx, 0); ctx.font = F.head(b.size, 700);
        b.lines.forEach((ln, i) => ctx.fillText(ln, L, y + b.size * 0.9 + i * b.size * 1.14));
      } else {
        ctx.fillStyle = t.fg; spacing(ctx, 0); ctx.font = F.body(31, true);
        b.lines.forEach((ln, i) => ctx.fillText(ln, L, y + 40 + i * 45));
      }
      y += b.h + gap;
    }

    // visual column: the right half of the card
    if (card.tomb) { drawTomb(ctx, t, card.tomb, vx, vy, vw, vh); return; }
    const credit = (x, y, w) => {
      const txt = (card.credit || 'Image: Roblox').toUpperCase();
      spacing(ctx, 1); fit(ctx, txt, (s) => F.mono(s, 500), 15, 10, w - 24);
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = t.bg; ctx.fillRect(x, y - 30, tw + 22, 30);
      ctx.fillStyle = t.fg; ctx.textAlign = 'left'; ctx.fillText(txt, x + 11, y - 9);
    };
    const pic = card.chart ? wide || icon : icon || wide;
    let cy = vy;
    if (pic) {
      const ph = card.chart ? Math.round((vw * 9) / 16) : vh;
      const pw = card.chart ? vw : Math.min(vw, vh), px0 = vx + (vw - pw) / 2;
      cover(ctx, pic, px0, cy, pw, ph);
      ctx.strokeStyle = t.fg; ctx.lineWidth = 3; ctx.strokeRect(px0, cy, pw, ph);
      credit(px0, cy + ph, pw);
      cy += ph + 22;
    } else if (card.art === 'wallet') {
      const ph = card.chart ? Math.round((vw * 9) / 16) : vh;
      drawWallet(ctx, t, vx, cy, vw, ph); cy += ph + 22;
    }
    if (card.chart) {
      const ch = vy + vh - cy;
      if (card.chart.line) drawLine(ctx, t, card.chart, vx, cy, vw, ch); else drawBars(ctx, t, card.chart, vx, cy, vw, ch);
    }
  }

  function loadImage(src) {
    return new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  }
  async function fontsReady() {
    const want = ['62px "UnifrakturMaguntia"', '900 100px "Playfair Display"', '700 60px "Playfair Display"', 'italic 31px "Libre Baskerville"', '500 20px "IBM Plex Mono"', '700 20px "IBM Plex Mono"'];
    const all = Promise.all(want.map((f) => document.fonts.load(f).catch(() => null)));
    await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
  }
  function flash(btn, msg) { const old = btn.textContent; btn.textContent = msg; setTimeout(() => (btn.textContent = old), 1600); }

  async function main() {
    const tweets = window.STUD_TWEETS || [];
    await fontsReady();
    for (let i = 0; i < tweets.length; i++) {
      const tw = tweets[i], root = document.getElementById('draft-' + i);
      if (!root) continue;
      const canvas = root.querySelector('canvas'), ta = root.querySelector('textarea'), count = root.querySelector('.count');
      if (tw.card) draw(canvas, tw.card, await loadImage(tw.card.icon), await loadImage(tw.card.wide));
      const upd = () => { count.textContent = ta.value.length + ' / 280'; count.classList.toggle('over', ta.value.length > 280); };
      ta.addEventListener('input', upd); upd();
      root.querySelector('.copy-text').addEventListener('click', async (e) => {
        try { await navigator.clipboard.writeText(ta.value); flash(e.currentTarget, 'Copied'); } catch { ta.select(); flash(e.currentTarget, 'Press Ctrl+C'); }
      });
      const blob = () => new Promise((res) => canvas.toBlob(res, 'image/png'));
      const ci = root.querySelector('.copy-img'), dl = root.querySelector('.dl-img');
      if (ci) ci.addEventListener('click', async (e) => {
        const b = e.currentTarget;
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob() })]); flash(b, 'Copied'); } catch { flash(b, 'Use Download'); }
      });
      if (dl) dl.addEventListener('click', async () => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = `stud-times-${window.STUD_DATE || 'card'}-${i + 1}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
    }
    document.documentElement.dataset.ready = '1';
  }
  main();
})();
