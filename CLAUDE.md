# The Stud Times: briefing for Claude

Read this first. It is the full story of The Stud Times so far, written at the end of the chat where it was born (Nov 21, 2026). From now on, The Stud Times has its own chat and its own board. Keep it separate from The Workshop.

## Who and what

- **Kale** owns it. He also runs The Workshop (ourworksshop.com, Roblox asset packs and templates, @Kale_3D on X). That is a **separate business** with its own chat and boards (Trend Radar, Template Radar, Workshop Tweet Board). Don't mix them: never advertise or mention The Workshop in the paper.
- **The Stud Times** is an unofficial, family-friendly, daily Roblox newspaper. Kale knows the people behind big Roblox news accounts (Bloxfeed, RBXEvents and others) and wants this to become a really big news brand.
- **Live site:** https://www.thestudtimes.com (Vercel, also https://the-stud-times.vercel.app). Kale bought the domain.
- **X account:** https://x.com/TheStudTimes (@TheStudTimes).
- **GitHub:** TheStudTimes/the-stud-times (this repo). The Claude GitHub App is installed on this repo only. Vercel deploys every push to `main`.
- **Kale is new to GitHub/Vercel.** Explain setup steps in plain words with exact clicks.

## Brand

- Name: **The Stud Times** (no "s" on stud). Joke: every Roblox game is made of studs and is low effort now.
- Tagline: **"Made of studs, just like every game on the front page."**
- Look: old newspaper. Paper `#F3ECDA`, ink `#1A1713`, red `#7A1F12`. Fonts: UnifrakturMaguntia (blackletter masthead), Playfair Display (headlines), Libre Baskerville (body), IBM Plex Mono (labels).
- Favicon: transparent blackletter "St" (`public/favicon.svg`, `favicon-32.png`, `icon-512.png`, `apple-touch-icon.png`).
- X icon and header were designed in a Claude Design canvas (artboards XIcon, XIconInk, XIconBrick, XHeader). Kale has hand-edited the icon artboards: don't overwrite them.
- **No Roblox logo** anywhere (Kale asked; Claude declined to reproduce it; Kale accepted). No other companies' logos as images either. A stud-brick motif is fine.
- **No emojis** anywhere on the site or in editions. Kale found them ugly.
- Funny headlines, but facts must be strictly accurate. Never mean to real people.

## Sections (one page each, front page links to all)

1. **Front Page**: giant-number lead story with the official game thumbnail and Play button, 6 quick cards, an optional `front.feature` (e.g. an embedded official Roblox teaser), **New in Studio** (from `flex.stories`; Kale moved it here from the Studio Flex page), Coming Up (with sources), and the ad slot.
2. **Business & Markets** (`markets`): RBLX stock chart from daily closes, a funny quote, business stories, deals of the last 30 days. Deal prices only REPORTED, or a labelled ESTIMATE with the math in one sentence (bars: solid = reported, striped = estimate). A partnership is not a purchase.
3. **Rising & Falling** (`rising`): games going up and down with before/after numbers, developer names, game pictures.
4. **Studio Flex** (`flex`): "The Flex Reel", 6 embedded posts, 3 per row. Optional "Studio Larp of the Day" for over-the-top brags.
5. **Rest In Peace** (`rip`): games that faded, as tombstones.
6. **Help Wanted** (`help`): classifieds, mostly "looking for work" and "hiring". Contact: DM @TheStudTimes on X.
7. **Archive**: every past edition at `/archive/<date>/`.
- Corrections are a daily one-line joke.
- Kale said no opinion pieces, comics or letters for now; interviews maybe later.

## Ads

- The front page has an **empty ad slot**: "This Space For Rent … DM @TheStudTimes for ad space". The Workshop ad was removed at Kale's request.
- **Paid ads:** none yet. If Kale sells one, list it here (advertiser, dates, copy, link) and the daily run will place it.

## Pictures and embeds (all legal, official sources only)

- **Game pictures:** add `"game": {"universeId"|"placeId", "name"}` to a story. At build time `build.mjs` calls the official Roblox APIs (`apis.roblox.com/universes/v1/places/{id}/universe`, `games.roblox.com/v1/games`, `thumbnails.roblox.com/.../thumbnails` and `/icons`) and shows the thumbnail credited "Image: Roblox / <creator>" plus "Play <game> on Roblox". Never guess an id.
- **Post embeds:** `"embed": "<url>"` on a story, or entries in `flex.posts`. Official embed codes only: X (`blockquote.twitter-tweet` + widgets.js), YouTube (youtube-nocookie iframe, Shorts tall), TikTok (`tiktok-embed` + embed.js). Scripts load only when the page has embeds.

## How the paper gets made

- **Daily scheduled task** "The Stud Times daily edition" (`trig_01LasuoJcgst2bCEdR9H6g9Q`), every day at 6:47 Europe/Zagreb. It clones this repo, reads this file and `EDITIONS.md`, reads the tip line, researches, writes `editions/YYYY-MM-DD.json`, runs `node build.mjs`, commits and pushes to `main`, then marks used tips.
- **Tip line:** the **"The Stud Times Desk"** board, https://claude.ai/artifact/2XGi63CnEvdQCB8KhkTxvm (artifact slug `0c5321e5-166f-45cc-8dab-71ab3c2e27aa`, Data type, pinned in Kale's sidebar). Kale pastes links there (section Studio Flex / News / Rising / Business / RIP / Help Wanted, optional note). Store collection `data/studtimes/inbox`, fields `url, section, note, added_on, used_on`. His links go first in the next edition. This used to live on the Workshop Tweet Board and was moved here on Nov 21.
- **Studio Flex fill order:** (1) Kale's tips, (2) impressive Roblox Studio builds/dev clips, (3) cool recent Roblox videos (update showcases, official teasers, news). YouTube is the best-indexed source; X search is weak, so Kale's tips matter.
- **Research sources:** rblxstat.com "This Week on Roblox", bloxbunny.com/trending-roblox-games, endgametools.com/en/roblox/charts, rostats.io/charts/<YYYY-MM>, GGRecon, DevForum/create.roblox.com updates, about.roblox.com, official @Roblox / @RobloxCreators / @RobloxDevRel posts, Yahoo Finance or StockAnalysis for RBLX.

## Tweet drafts

- Each edition has a `tweets` list (see `EDITIONS.md`). The build makes a copy-paste page at https://www.thestudtimes.com/desk (unlinked, noindex): text with a Copy button and a card image with Copy/Download buttons. Kale posts them himself, 2–3 a day. Still drafts only.
- Every draft ends with `thestudtimes.com #Roblox #RobloxNews` (added by the build; Kale asked for the link and both hashtags on every tweet).
- Tweet text is short and punchy: the fact in one line, then one short joke. Kale will ask if he wants longer ones.
- Kale wants every card to show the story: the game icon, a chart from real numbers, a tombstone. Not text alone. Tone: family friendly with a bit of dark humor for the Roblox community.
- Automatic posting was discussed on Nov 21 and parked: it needs a paid X developer account (about $0.015 per post, $0.20 with a link) and Kale's keys in GitHub secrets.
- Brand extras made Nov 21 on the Design canvas "Stud Times tweet cards: Nov 21" (https://claude.ai/artifact/Hm4WQvGPjmKvE1qirEShwq): three brick icon options (A red on paper, B paper on red, C paper on ink) and an all-black X banner. Kale loves the brick icon and wants it as the paper's icon; he has not picked A, B or C yet.

## Hard rules

- Every story links the sources it was written from. Never invent posts, numbers, quotes or game ids. Label estimates and rumors ("unconfirmed").
- Family-friendly. Leave out child safety, lawsuits involving minors, politics and tragedies entirely.
- No emojis. No Roblox logo or other logos. Never mention The Workshop.
- Always say the paper is unofficial and not affiliated with Roblox (it's in the footer).
- Never post to X for Kale. Tweets, if he wants them, are drafts only.
- Don't force-push, don't delete editions.

## Tech notes

- Zero-dependency Node build: `node build.mjs` reads `editions/*.json`, writes the newest to `dist/` and every edition to `dist/archive/<date>/`. Vercel: `buildCommand: node build.mjs`, `cleanUrls`, `installCommand: echo no-install`.
- Edition format and per-section fields: see `EDITIONS.md`. Edition No. 1 is `editions/2026-11-21.json`.
- In Claude's sandbox npm and raw GitHub downloads are blocked; Vercel's build has internet (that's where thumbnails are fetched).
- Push with `git -c push.negotiate=true push origin main`.
- Fact-check corrections made on edition 1: TDS × doBIG was a partnership, not a purchase; RBLX was down 6.9% that week; Clean The Ballpit is listed on Roblox under Mutrix Games (made by TrixFarm).

## Ideas not started yet

- Interviews with devs; a bigger ads offer once traffic grows.
