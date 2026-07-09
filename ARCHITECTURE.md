# 33Mega Content Pipeline — Architecture

How authorised admins publish **news posts** and **homepage slides** through a
purpose-built **web app**, with optional AI drafting, and a safe, auditable
git-backed publish pipeline behind it. No database anywhere: git is the store.

```
Admin (browser — desktop or phone)
   │  logs in (email + password, named admins)
   ▼
Admin web app  ── hosted on Google Cloud Run ──────────────────────────┐
   │  1. Compose: news editor / slide editor                           │
   │     • AI assist (optional): draft copy, draft an on-brand SVG      │
   │     • upload a photo (phone/desktop) — resized + EXIF-stripped     │
   │  2. Submit  → validate + sanitise + commit to a draft branch → PR  │
   │  3. Preview → open the Firebase preview channel for that draft     │
   │  4. Publish → merge PR → live deploy (~2 min)                      │
   └───────────────────────────────────────────────────────────────────┘
        │ (same git pipeline)
        ▼
   GitHub PR → Action builds Astro → Firebase Hosting (live)
```

This mirrors the IntroTeach content pipeline, adapted for 33Mega: **no
translation** (English only) and **no jobs** — just news and homepage slides,
in the 33Mega pop-art brand and voice.

## 1. Principles

1. **Git is the single source of truth.** Content is markdown + JSON files in
   this repo — no database. The backend is a *content commit service*: validate →
   commit → open PR → (on publish) merge. Free consequences: full audit trail
   (every change is a commit), one-command rollback (`git revert`), disaster
   recovery = clone.
2. **The editable surface is defined in code, not prose.** The backend only
   accepts content that passes strict per-type schemas and writes only to an
   allow-listed set of paths. CI re-checks the same allow-list on every draft PR.
   Neither an admin nor the AI can alter templates, components or config through
   this tool.
3. **AI never publishes; it only drafts.** Anything the AI produces (copy, an SVG
   graphic) is just a starting point in the editor. It still passes through
   validation, sanitisation, preview and an explicit human **Publish** click.
4. **Preview before publish, always.** Every draft gets its own live Firebase
   preview URL showing the *whole site* with the change applied. Publishing is a
   deliberate second action after previewing.

## 2. Components

| Component | Runs on | Responsibility | Cost |
|---|---|---|---|
| **Admin web app** | **Google Cloud Run** | Auth, compose UI, AI-assist proxy, image processing, drives the git pipeline | ~£0 (scale-to-zero) + small AI usage |
| Build pipeline | GitHub Actions | `astro build` + `firebase deploy` on merge to `main`; preview channel per PR | £0 (free tier) |
| Hosting + previews | Firebase Hosting | Live site (`mega33-cloud`) + per-draft preview channels | £0 |
| Repo | GitHub (`jcmorgan2/33mega-website`) | Source of truth for code *and* content | £0 |
| AI provider | OpenAI API | Draft copy + on-brand SVG graphics — called server-side only | usage-based, small |

The admin web app is a single Cloud Run service that serves both the browser UI
and its own JSON API (same origin, no CORS). It shares the same validation and
GitHub libraries the pipeline is built on.

## 3. Authentication

- **Named admins:** e.g. `jonathan@33mega.cloud`, `peter@33mega.cloud`, each with
  a strong generated password.
- **No user database.** Passwords are stored only as **scrypt hashes** (Node
  built-in, per-user random salt) in a single secret (`ADMIN_USERS`) held in
  Google Secret Manager and injected as an env var. Plaintext passwords are shown
  to the owner once at setup and never committed.
- **Sessions are stateless JWTs** (HS256, signed with a `JWT_SECRET` in Secret
  Manager) — fits Cloud Run's stateless model. Short lifetime (12h) with re-login.
- **Every API route except `/login` requires a valid JWT.** The AI-assist and
  git-pipeline routes are all behind auth.
- Transport is HTTPS (Cloud Run default). `/login` is rate-limited; lock-out after
  N failures per email.

## 4. Content flows (the two composers)

### News posts
A title + body editor with an optional **featured image** (two routes):
1. **Upload a photo** → the backend resizes (long edge ≤ 1600px), re-encodes to
   WebP and strips EXIF before committing under `public/media/uploads/YYYY/MM/`.
2. **AI-drafted graphic** → OpenAI generates an on-brand pop-art **SVG** (atom
   palette, halftone, starburst) as the featured image.

AI assist can **draft the whole post** (title, description, body, tag) from a
short prompt, in 33Mega's voice. Writes `src/content/news/<slug>.md`.

### Homepage slides
The hero carousel has **permanent core slides** — they live in
`src/data/slides.ts` (the component code) and **can never be edited or removed
through this tool.** Admins manage only *additional* slides:

- **Add** a slide: eyebrow + title + text, an optional CTA (label + link), an
  **art style** (atom / orbit / exit / spark) and accent colour, and an **expiry
  date** (the slide auto-hides itself after it passes).
- **Remove** a slide: only ever removes admin-added slides; the core slides are
  not in the data file and are never listed as removable.

Stored as an array in `src/data/extra-slides.json`; each entry carries an `id`.
`slides.ts` merges the non-expired extras after the core slides at build time.

## 5. Editable surface (enforced by schema + CI path-guard)

| Type | Target paths |
|---|---|
| `news` | `src/content/news/<slug>.md` |
| `slide` add/remove | `src/data/extra-slides.json` |
| media | `public/media/uploads/YYYY/MM/<file>` |

Everything else is rejected by validation, and independently by the CI path-guard
on the draft PR. Content bodies and uploaded SVGs are sanitised (scripts,
iframes, event handlers, dangerous URL schemes stripped).

## 6. Backend API (same-origin, behind JWT auth)

```
POST /api/login                  { email, password } → { token }        (no auth)
GET  /api/me                     → { email }
POST /api/assist                 { task, type, prompt, ... } → { draft | image }   draft copy / SVG graphic
POST /api/drafts                 { type, ... }        → { draft_id, pr_url }        create news/slide draft, or delete
GET  /api/drafts                 → open drafts with preview URLs
POST /api/drafts/<id>/publish    → squash-merge PR → live deploy
POST /api/drafts/<id>/discard    → close PR + delete branch
GET  /api/content?type=news      → existing news posts (for the remove UI)
GET  /api/slides                 → current extra slides (for the remove UI)
```

## 7. Approval / preview / publish

1. Compose → **Submit**: content validated, committed to `draft/<id>`, PR opened;
   CI deploys a preview channel and reports its URL as a PR comment.
2. **Preview**: the web app shows/opens the preview URL — the entire site with the
   change applied (e.g. the new post live in the news list).
3. **Publish**: squash-merge → `main` → GitHub Action builds and deploys live (~2
   min).
4. **Discard** (or 7-day expiry): branch + preview channel cleaned up.
5. Undo after publish: `git revert` (surfaceable later as an "unpublish" button).

## 8. Security summary

- Email+password login; scrypt-hashed, JWT sessions; `/login` rate-limited.
- All content/AI routes behind auth.
- Schema-validated editable surface + CI path-guard — the hard boundary.
- Bodies and SVG uploads sanitised; raster uploads re-encoded (drops embedded
  exploits and EXIF/location data).
- AI output is a draft only; nothing reaches live without preview + explicit
  Publish.
- GitHub token scoped to this repo; secrets (`ADMIN_USERS`, `JWT_SECRET`,
  `GITHUB_TOKEN`, `OPENAI_API_KEY`) in Secret Manager, never in the repo.
- Core hero slides are structurally unremovable through the tool.

## 9. Layout note (vs IntroTeach)

The IntroTeach repo nests the Astro site under `site/`; **this repo has the Astro
site at the root**, so the editable paths are `src/content/news/…`,
`src/data/extra-slides.json` and `public/media/…` (no `site/` prefix). The admin
app lives under `admin/`. See `admin/README.md` for deploy steps.
