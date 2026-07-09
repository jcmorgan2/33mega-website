/**
 * Schemas + sanitisation for the editable surface.
 * This module is the hard security boundary: whatever calls the API can only
 * produce content that passes here. Paths are for the site-at-repo-root layout.
 */

/** Art styles the hero slider knows how to render. */
const SLIDE_ART = ['atom', 'orbit', 'exit', 'spark'];
/** Accent-colour presets an admin can pick for a slide starburst. */
const SLIDE_BURSTS = ['#e8a33d', '#2bd4ff', '#f0439c', '#9d7bff'];

export class ValidationError extends Error {
  constructor(errors) {
    super('validation failed');
    this.errors = errors;
  }
}

/** Strip dangerous HTML from markdown bodies / SVG; allow a small inline whitelist. */
export function sanitiseMarkdown(md) {
  let s = String(md);
  s = s.replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, '');
  s = s.replace(/\son\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, ''); // event handlers
  s = s.replace(/(javascript|vbscript)\s*:/gi, ''); // dangerous URL schemes
  return s.trim();
}

export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

function req(errors, obj, field, max = 5000) {
  const v = obj?.[field];
  if (v === undefined || v === null || v === '') {
    errors.push(`missing ${field}`);
    return undefined;
  }
  if (typeof v !== 'string') {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  if (v.length > max) {
    errors.push(`${field} too long (max ${max})`);
    return undefined;
  }
  return v;
}

function isoDate(v, fallback) {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(+d) ? fallback : d.toISOString().slice(0, 10);
}

const yamlStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Build a news post draft. `imagePath` (optional) is a /media web path for an
 * already-processed upload/graphic (see media.mjs) — image bytes are committed
 * separately by the caller. Returns { files: [{path, content}], summary, slug }.
 */
export function buildDraft(payload) {
  const errors = [];
  if (payload?.type !== 'news') {
    throw new ValidationError([`unknown type: ${payload?.type}`]);
  }
  const imagePath = payload.imagePath || null;

  const title = req(errors, payload, 'title', 200);
  const body = req(errors, payload, 'body', 60000);
  if (errors.length) throw new ValidationError(errors);

  const slug = slugify(payload.slug || title);
  const date = isoDate(payload.pubDate, new Date().toISOString().slice(0, 10));
  const description = sanitiseMarkdown(payload.description || '').slice(0, 300)
    || `${title}.`;
  const author = sanitiseMarkdown(String(payload.author || '33Mega')).slice(0, 80);
  const tag = sanitiseMarkdown(String(payload.tag || 'News')).slice(0, 40);

  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    `description: ${yamlStr(description)}`,
    `pubDate: ${date}`,
    `author: ${yamlStr(author)}`,
    `tag: ${yamlStr(tag)}`,
    ...(imagePath ? [`image: ${yamlStr(imagePath)}`] : []),
    '---',
  ].join('\n');

  return {
    files: [
      {
        path: `src/content/news/${slug}.md`,
        content: `${fm}\n\n${sanitiseMarkdown(body)}\n`,
      },
    ],
    summary: `news: ${title}`,
    slug,
  };
}

/**
 * Add or remove an extra homepage slide. Operates on the current
 * extra-slides.json array (`current`), which contains ONLY admin-added slides —
 * the core hero slides live in slides.ts and are never in this file, so they can
 * never be edited or removed here. `imagePath` is unused (slides use SVG art
 * styles for brand consistency). Returns { files, summary, slideId }.
 */
export function buildSlideChange(payload, current) {
  const errors = [];
  const op = payload.op;
  const slides = Array.isArray(current?.slides) ? [...current.slides] : [];
  const PATH = 'src/data/extra-slides.json';

  if (op === 'remove') {
    const id = String(payload.id || '');
    if (!id) throw new ValidationError(['missing slide id']);
    const next = slides.filter((s) => s.id !== id);
    if (next.length === slides.length) throw new ValidationError([`no such slide: ${id}`]);
    return {
      files: [{ path: PATH, content: JSON.stringify({ slides: next }, null, 2) + '\n' }],
      summary: `remove slide: ${id}`,
      slideId: id,
    };
  }

  if (op !== 'add') throw new ValidationError([`unknown slide op: ${op}`]);

  const title = req(errors, payload, 'title', 160);
  const expires = isoDate(payload.expires, null);
  if (!expires) errors.push('missing/invalid expires (YYYY-MM-DD)');
  const art = SLIDE_ART.includes(payload.art) ? payload.art : 'spark';
  const burst = SLIDE_BURSTS.includes(payload.burst) ? payload.burst : '#9d7bff';
  const ctaHref = String(payload.ctaHref || '').slice(0, 300);
  if (ctaHref && !/^(\/|https:\/\/)/.test(ctaHref)) {
    errors.push('ctaHref must be a relative path or https URL');
  }
  if (errors.length) throw new ValidationError(errors);

  const slide = {
    id: `${slugify(title)}-${Date.now().toString(36)}`.slice(0, 60),
    eyebrow: sanitiseMarkdown(String(payload.eyebrow || 'News')).slice(0, 40),
    title: sanitiseMarkdown(title),
    text: sanitiseMarkdown(String(payload.text || '')).slice(0, 400),
    ctaLabel: sanitiseMarkdown(String(payload.ctaLabel || '')).slice(0, 40),
    ctaHref,
    art,
    burst,
    expires,
  };
  slides.push(slide);
  return {
    files: [{ path: PATH, content: JSON.stringify({ slides }, null, 2) + '\n' }],
    summary: `add slide: ${slide.title}`,
    slideId: slide.id,
  };
}

/** Paths a draft PR is allowed to touch — mirrored by the CI guard. */
export const EDITABLE_PATHS = [
  /^src\/content\/news\/[a-z0-9-]+\.md$/,
  /^src\/data\/extra-slides\.json$/,
  /^public\/media\/uploads\/\d{4}\/\d{2}\/[\w.-]+$/,
];
