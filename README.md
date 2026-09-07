# ExcelMovies — excelmovies.vercel.app

An **ads-only** site. No articles, no videos, no content — every pixel is a sponsored
placement. Built for the domain `excelmovies.vercel.app`.

## Pages

| Page | What it is |
|------|------------|
| `index.html` | Home — hero, ad wall, native ads, sponsor tiles, sidebar skyscrapers |
| `ads.html` | All Ads — every format showcased, repeated in every section |
| `sponsored.html` | Sponsored — a click-wall of smartlink tiles (every tile = smartlink) |
| `tasks.html` | Tasks — the AdsLab offerwall embedded full-page (offers, surveys, shortlinks) |
| `go.html` | Go — **premium page**: popunder + smartlink ONLY (Adsterra's highest-CPM formats, ~$0.7–0.8 CPM). No banners, no social bar, no other formats competing. Every visible element is a smartlink. Reachable at `/go`, `/premium`, `/continue`. |
| `404.html` | Not found — ad-stuffed anyway |

## Ad networks wired in

### Adsterra (all 10 units)

- **Popunder** — `<head>` of every page (one per page, as recommended)
- **Social Bar** — just before `</body>` on every page
- **Native Banner** — via `ads/native.html` iframe, repeated across pages
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
| Interstitial | `int-euZL0Ewr9Fql` | fires on the visitor's first click on every page, rate-limited to 1 per 60s per session (spec's fraud warning) |
| Rewarded | `rew-wlWIoORtfsDg` | "Watch a Rewarded Ad" buttons on every page |
| Tasks offerwall | `task-qhgx1qTcI5gH` | embedded iframe on `tasks.html`, plus "open in new tab" fallback |

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
is absent, and a blank offerwall iframe hides itself so the Adsterra content below it
takes over. Result: **no ad box is ever empty — Adsterra loads everywhere.** If AdsLab
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
