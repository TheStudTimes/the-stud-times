# Writing an edition

One file per day: `editions/YYYY-MM-DD.json`. Copy the newest one and replace the content. `number` goes up by 1 each day.

## Rules
0. No emojis anywhere in edition text (headlines, cards, captions, jokes). Use words or numbers; the ▲▼ arrows in fact boxes are fine.
1. Every number comes from a source you actually read, and every story lists its `sources` (title + https URL).
2. Estimates are allowed only when labelled. Write them in bold (`**Our estimate: ...**`) and explain the math. Deals use `"tag": "ESTIMATE"` or `"REPORTED"`.
3. Family friendly. Funny headlines, accurate facts. Never joke about safety issues, lawsuits involving minors, tragedies or politics; leave those out.
4. Short: a headline, a one-line dek, 3–4 fact boxes, two short paragraphs.
5. Text is plain; only `**bold**` is formatted. No HTML.
6. Game pictures: add `"game": {"universeId": 123, "name": "..."}` (or `"placeId"`) to any story about a Roblox game, including `front.lead`. The build fetches the official Roblox thumbnail and adds a "Play on Roblox" button automatically. Find IDs on rotrends.com/game/<universeId>, rolearn.dev/games/<universeId> or roblox.com/games/<placeId>. Never guess an ID.
7. Other images: `"image": {"src": "https://...", "alt": "...", "credit": "..."}` only for images you have the right to show; otherwise leave it out.
8. Studio Flex: only real posts, by URL. Supported embeds: x.com/<user>/status/<id>, youtube.com/watch?v= or /shorts/, tiktok.com/@user/video/<id>. They play on the page through the platforms' official embeds and credit the creator. Never invent posts.

## Sections
- `front.lead` — the day's biggest story (`big` is a giant number or word). `link` points to the full story, e.g. `"rising#throw-food"`.
- `front.quick` — 6 cards, each linking to a story (`markets#id`, `rising#id`, `rest-in-peace`, `studio-flex#id`).
- `front.feature` — optional big story of the day shown on the front page under a label (e.g. "TEASED TODAY"), same shape as a story. Good for official announcements and teasers.
- Any story can have `"embed": "<post URL>"` (x.com status, YouTube, TikTok) to show the real post or video inside it, e.g. an official @Roblox teaser. Use it whenever a story is about a specific post.
- `front.comingUp` — 2–4 upcoming events, with `comingUpSources`.
- `markets.stock` — RBLX price, `moves`, a funny `caption` that matches the move, and `closes` (last ~15 trading days).
- `markets.stories` — business news from the last 30 days.
- `markets.dealStories` / `markets.bigDeals` — game deals; tag every price REPORTED or ESTIMATE.
- `rising.up` / `rising.down` — 2–4 stories each, with developer, before/after numbers and records.
- `flex.posts` — up to 6 (fills a 3x2 grid; empty slots show a 'tag @TheStudTimes' invite). Mix builds/showcases with cool recent Roblox clips and news videos; Kale's inbox picks go first; `[{ "url": "https://x.com/.../status/...", "caption": "what they built", "creator": "@name" }]`, best first; `flex.larp` same shape or `null`; `flex.stories` — new Studio and creation news.
- `rip.stones` — games that faded: name, dates, fact with numbers, one joke, sources.
- `help.listings` — `[{ "kind": "HIRING" | "LOOKING FOR WORK", "text": "...", "contact": "https://..." }]`.
- `correction` — the funny line at the bottom.

## Tweet drafts (`tweets`)
Every edition also carries 3–5 tweet drafts for @TheStudTimes. They are **drafts only**: nothing is ever posted for Kale. The build turns them into a copy-paste page at `/desk` (latest) and `/desk/<date>` (unlinked, noindex) with a 1600x900 card image per draft, drawn by `public/desk/cards.js`.

`"tweets": [{ "text": "...", "card": { ... } }]`
- `text`: under 280 characters, no emojis, no links unless Kale asks. Family friendly with a bit of dark humor aimed at games, clones, trends and the stock; never at real people, kids or tragedies. Every number must already be in this edition.
- `card.theme`: `"paper"`, `"ink"` or `"red"`. Vary them across the day.
- `card.kicker`, `card.big` (giant number or 1–2 words), `card.headline`, `card.dek`, `card.source` (e.g. `"SOURCE: RBLXSTAT"`), optional `card.label` (top right; defaults to edition number and date).
- Every card should show the story, not just text. The visual fills the right half of the card (Kale wants pictures really big, at least half the image). With a game and a chart, the wide game thumbnail sits on top and the chart under it; with a game alone, the square icon fills the half. Pick what fits:
  - `card.game`: `{"universeId": 123, "name": "..."}`. The build fetches the official game icon and credits it. Never guess an id.
  - `card.chart` bars: `{"title": "AVERAGE PLAYERS", "bars": [["SEPTEMBER", 1815540, "1.82M"], ["OCTOBER", 1341295, "1.34M"]]}`. Real numbers from the edition only; if a value is worked out from a percentage, show it with `~`. The last bar is highlighted.
  - `card.chart` line: `{"line": [["Nov 2", 42.88], ...], "prefix": "$", "chips": ["▼ 6.9% THIS WEEK"]}`, or `"line": "stock"` to reuse `markets.stock.closes`. Use a line only when you have the real daily points; never draw an invented curve.
  - `card.art`: `"wallet"` draws a generic wallet for money stories that have no game picture.
  - `card.tomb`: `{"name": "...", "dates": "2026 – 2026", "line": "..."}` for Rest In Peace stories.
- No Roblox logo, no other logos, no photos of people.

Check it builds: `node build.mjs`.
