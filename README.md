# 33Mega website

Marketing website for [33mega.cloud](https://33mega.cloud), built with [Astro](https://astro.build).

33Mega delivers fully supported storage platforms built on proven open-source software (Ceph) and standard enterprise hardware — for the media industry. The site leads with the product, **The Atom**, with AI Consultancy as the services arm.

## Design

1980s pop-art meets dependable infrastructure: cream paper, halftone dots, gold starbursts and the atom-mark gradient (cyan → violet → magenta), with bold comic-panel cards. Technical diagrams deliberately drop the pop styling for a restrained engineering look.

- Design tokens: `src/styles/global.css`
- Atom mark (inline SVG): `src/components/AtomMark.astro`
- Pop-art starburst: `src/components/Starburst.astro`
- Serious diagrams: `src/components/DiagramPlatform.astro`, `src/components/DiagramFlow.astro`

## Structure

| Path | Page |
|------|------|
| `/` | Home — hero slider, product-first |
| `/atom/` | The Atom platform |
| `/atom/file/` · `/atom/object/` · `/atom/block/` | Use-case pages |
| `/ai-consultancy/` | All services under one banner |
| `/about/` | Origin story, mission, founders, exit promise |
| `/news/` | Blog / news feed (content collection + RSS at `/rss.xml`) |
| `/contact/` | Contact |

### Extending the hero slider

Add an object to the array in `src/data/slides.ts` — the slider picks it up automatically.

### Adding a news post

Drop a markdown file into `src/content/news/` with `title`, `description`, `pubDate` (and optional `author`, `tag`) frontmatter.

## Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the production build |

## Deployment

The site builds to static files in `dist/` and is hosted on **Firebase Hosting**.

| Firebase project | Alias | URL | Purpose |
|------------------|-------|-----|---------|
| `mega33-cloud` | `production` | https://mega33-cloud.web.app → `33mega.cloud` | Live site |
| `mega33-preview` | `preview` (default) | https://mega33-preview.web.app | Preview channels |

### Deploy to production

```sh
npm run build
firebase deploy --only hosting --project production
```

### Deploy a shareable preview (no effect on live)

```sh
npm run build
firebase hosting:channel:deploy preview --project preview
```

### Custom domain / DNS (IONOS)

`33mega.cloud` and `www.33mega.cloud` are pointed at the `mega33-cloud` Firebase
Hosting site. Add the domains under **Firebase console → Hosting → Add custom
domain** and use the exact A / TXT records Firebase generates. DNS is managed at
IONOS. Do **not** change the IONOS MX, SPF, DKIM, DMARC or autodiscover records —
email hosting stays with IONOS.
