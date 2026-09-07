# ExcelMovies — excelmovies.vercel.app

An **ads-only** site. No articles, no videos, no content — every pixel is a sponsored
placement. Built for the domain `excelmovies.vercel.app`.

## Pages

| Page | What it is |
|------|------------|
| `index.html` | Home — hero, ad wall, native ads, sponsor tiles, sidebar skyscrapers |
| `ads.html` | All Ads — every format showcased, repeated in every section |
| `sponsored.html` | Sponsored — a click-wall of smartlink tiles (every tile = smartlink) |
| `404.html` | Not found — ad-stuffed anyway |

## Ad networks wired in (Adsterra)

All 10 units you provided, placed per Adsterra's instructions:

- **Popunder** — `<head>` of every page (one per page, as recommended)
- **Social Bar** — just before `</body>` on every page
- **Native Banner** — via `ads/native.html` iframe, repeated across pages
- **Banners** (728x90, 468x60, 320x50, 300x250, 160x600, 160x300) — via per-format
  wrapper files in `ads/`, repeated many times per page

### Why wrapper files in `ads/`?

Adsterra banner scripts use a global `atOptions` variable, so a format's snippet
**can only appear once per document**. Serving each banner from its own small HTML
file inside an `<iframe>` lets the same ad repeat any number of times on a page —
which is the whole point of an ads-only site.

## Adslab slots

You mentioned Adslab but didn't paste their snippets, so every page contains
**clearly-marked `<!-- ADSLAB SLOT -->` comments** (head, top banner, hero, sidebar,
mid-page, native, wall, bottom, footer). Paste Adslab code into those slots and
the site supports both networks.

## Smartlink

The smartlink URL is used everywhere anything is clickable:
hero buttons, nav CTA, all 16+ sponsor tiles, 404 page CTAs.

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # from this folder — link to your excelmovies project
vercel --prod
```

Or push to GitHub and import the repo in the Vercel dashboard (framework preset:
**Other**, no build command, output dir `.`). `vercel.json` already sets clean
URLs and `/ads`, `/sponsored`, `/all-ads`, `/click` rewrites.
