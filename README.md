# The Stud Times

*"Made of studs, just like every game on the front page."*

An unofficial daily Roblox newspaper. Not affiliated with Roblox Corporation.

## How it works

- `editions/YYYY-MM-DD.json` — one file per daily edition (the only thing that changes day to day).
- `build.mjs` — turns the newest edition into the site, and every edition into `/archive/<date>/`. No dependencies.
- `style.css` — the newspaper look.
- `public/` — images and anything else copied to the site as-is.

Vercel runs `node build.mjs` and serves `dist/`. Push a new edition file → the site updates.

See `EDITIONS.md` for the edition format and the rules every story follows.
