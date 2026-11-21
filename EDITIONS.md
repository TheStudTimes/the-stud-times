# Writing an edition

One file per day: `editions/YYYY-MM-DD.json`. Copy the newest one and replace the content. `number` goes up by 1 each day.

## Rules
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
- `front.comingUp` — 2–4 upcoming events, with `comingUpSources`.
- `markets.stock` — RBLX price, `moves`, a funny `caption` that matches the move, and `closes` (last ~15 trading days).
- `markets.stories` — business news from the last 30 days.
- `markets.dealStories` / `markets.bigDeals` — game deals; tag every price REPORTED or ESTIMATE.
- `rising.up` / `rising.down` — 2–4 stories each, with developer, before/after numbers and records.
- `flex.posts` — up to 3 `[{ "url": "https://x.com/.../status/...", "caption": "what they built", "creator": "@name" }]`, best first; `flex.larp` same shape or `null`; `flex.stories` — new Studio and creation news.
- `rip.stones` — games that faded: name, dates, fact with numbers, one joke, sources.
- `help.listings` — `[{ "kind": "HIRING" | "LOOKING FOR WORK", "text": "...", "contact": "https://..." }]`.
- `correction` — the funny line at the bottom.

Check it builds: `node build.mjs`.
