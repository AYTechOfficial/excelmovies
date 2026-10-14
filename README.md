# ExcelMovies — excelmovies.vercel.app

An **ads-only** site. No articles, no videos, no content — every pixel is a sponsored
placement. Built for the domain `excelmovies.vercel.app`.

## Design system v2 — "Obsidian Cinema"

Ultra-premium OTT aesthetic (`assets/style.css` + `assets/site.js`): glass sticky
header with active-nav states and a mobile drawer, aurora hero, poster tiles with
3D hover, scroll-reveal animations, scroll progress bar, back-to-top and a
keyboard-driven sponsor search (press `/`). Ads render **bare** — no frames or
containers — strictly in document flow, below the sticky navbar on every page;
never floating, fixed or sticky.
Asset URLs are versioned (`?v=2`) for cache-safe deploys. Every page mounts all
8 AdsLab banner units (desktop/mobile gating per the AdsLab spec) plus its full
Adsterra wrapper set; rewarded buttons route through AdsLab with the Adsterra
smartlink fallback.

## Pages

| Page | What it is |
|------|------------|
| `index.html` | Home — hero, ad wall, sponsor tiles, sidebar skyscrapers |
| `ads.html` | All Ads — every format showcased, repeated in every section |
| `sponsored.html` | Sponsored — a click-wall of smartlink tiles (every tile = smartlink) |
| `tasks.html` | Tasks — banner wall + rewarded-ad buttons (offerwall removed) |
| `go.html` | Go — **premium page**: popunder + smartlink ONLY (Adsterra's highest-CPM formats, ~$0.7–0.8 CPM). No banners, no social bar, no other formats competing. Every visible element is a smartlink. Reachable at `/go`, `/premium`, `/continue`. |
| `404.html` | Not found — ad-stuffed anyway |

## Ad networks wired in

### Adsterra (all 10 units)

- **Popunder** — `<head>` of every page (one per page, as recommended)
- **Banners** (728x90, 468x60, 320x50, 300x250, 160x600, 160x300) — via per-format
  wrapper files in `ads/`, repeated many times per page
- **Smartlink** — the href of every clickable tile/button site-wide

Why wrapper files: Adsterra banner scripts use a global `atOptions` variable, so a
format's snippet can only appear once per document. Serving each banner from its own
small HTML file inside an `<iframe>` lets the same ad repeat any number of times.

### AdsLab (from the vazionixfaucet integration spec)

Implemented — the client-side subset that a static site can run:

| Unit | Placement | Where it runs |
|---|---|---|
| Banners (all 8 sizes: 728x90, 468x60, 320x50, 320x100, 300x250, 336x280, 160x600, 300x600) | `unit-*` IDs | every page, each size at most once per page (per spec), responsive gating: 728x90/468x60 desktop-only, 320x50/320x100 mobile-only |
| Rewarded | `rew-bLIxi4pMugOB` | "Watch a Rewarded Ad" buttons on every page |

All of it loads through `assets/adslab.js` (one file to edit if placement IDs change):

- Sets `window.ADSLAB_INT / ADSLAB_REW / ADSLAB_USER` **before** `sdk.js` loads (spec §3)
- Loads the SDK from `https://adslab.me/api/sdk.js`
- Feature-detects both documented trigger APIs (`adslabShowInterstitial` / `showint_adslab`, same for rewarded) (spec §8.3)
- Registers banner units with `window.adslab_banners` + injects `serve.adslab.me/api/banner/js` once (spec §7)
- `ADSLAB_USER` is a stable per-session visitor ID (`sessionStorage`) — this site has no accounts, and the spec requires a non-empty uid
- Rewarded buttons show "Reward pending…" — **nothing is credited client-side**, per spec (no promise-resolution crediting)

**Adsterra fallback system** (`assets/adslab.js`):

AdsLab placements were registered for a different domain (`vazionixfaucet`), so they may
not serve on `excelmovies.vercel.app`. Every AdsLab slot therefore self-checks after a
4-second grace period: if it hasn't filled, it's swapped for the matching Adsterra banner
(nearest size for formats Adsterra doesn't offer — 320x100→320x50, 336x280→300x250,
300x600→160x600). Rewarded buttons route to the Adsterra smartlink when the AdsLab SDK
is absent. Result: **no ad box is ever empty — Adsterra loads everywhere.** If AdsLab
starts serving (after adding this domain in their dashboard), it wins the race and its
own creative stays. The swap is one file (`assets/adslab.js`) — adjust `GRACE` to tune.

**Deliberately NOT implemented** (they require a backend, a database and the server-only
secrets — none of which a static site has): postback crediting (spec §4), captcha
webhook (§5), server-side tasks proxy (§6a), transaction ledger (§1/§2).

### Secrets handling — important

The AdsLab **Publisher API Key** and **Security Hash** are server-only values. They are
**not present anywhere in this repo or site output**. The spec file that contains them
(`AdsLab Integration Spec — vazionixfaucet.md`) is listed in `.gitignore` and is never
committed. If those keys were ever pushed to a public repo in any other project, rotate
them in the AdsLab dashboard.

## Access gate (server-side)

The whole site sits behind an access code. It is enforced **on Vercel's servers**
(not in the browser), so page content is never served to anyone without the code:

- `middleware.js` — Edge Middleware. Every request without a valid signed cookie
  is 302-redirected to `/gate` (only `/gate.html` and `/api/login` are exempt).
- `api/login.js` — checks the submitted code **server-side** (timing-safe compare),
  sets an `HttpOnly` signed cookie valid for 30 days. Wrong code → 401, nothing set.
- `lib/gate.mjs` — **the one file to edit to change the access code**. The code is
  never shipped to browsers; the cookie holds only an HMAC-SHA256 token derived
  from it, which cannot be forged without the code.
- `gate.html` — the code-entry screen (self-contained, no external assets).
- `tests/gate.test.mjs` — `node --test tests/gate.test.mjs` verifies middleware
  gating, cookie issuance and the login flow end-to-end.

Log in once → every page (including ad iframes) loads for 30 days. The gate also
means AdsLab/Adsterra impressions only count for visitors who passed the code check.

## Smartlink

The Adsterra smartlink URL is used everywhere anything is clickable: hero buttons,
nav CTA, all 16+ sponsor tiles, 404 page CTAs.

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # from this folder — link to your excelmovies project
vercel --prod
```

Or push to GitHub and import the repo in the Vercel dashboard (framework preset:
**Other**, no build command, output dir `.`). `vercel.json` already sets clean URLs
and `/ads`, `/sponsored`, `/all-ads`, `/click`, `/offerwall`, `/earn` rewrites.
`/tasks` works automatically via clean URLs.
