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

The site builds to static files in `dist/` and can be served from any static host (the previous site ran on Google Cloud Run; a simple nginx or bucket deployment works too).
