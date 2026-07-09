/**
 * AI assist via the OpenAI API — draft news/slide copy (Chat Completions) and
 * generate an on-brand pop-art graphic (Images API, gpt-image-1). Server-side
 * only (the API key never reaches the browser). Uses fetch directly (no SDK).
 */
const OPENAI = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

const BRAND = {
  voice:
    '33Mega — a media-industry storage company. Our product is "The Atom": fully ' +
    'supported file and object storage built on Ceph and standard Dell hardware, for ' +
    'broadcasters, post-production, sport and archives. Voice: calm, specific, ' +
    'confident, non-corporate; British English; trust and "turnkey" without hype; no ' +
    'superlatives, no AI slop. We also offer AI Consultancy. Tagline: "Every human. 33 ' +
    'megatons of good." Palette: cyan #2bd4ff, violet #9d7bff, magenta #f0439c, gold ' +
    '#e8a33d on cream #fff9ef, with a 1980s pop-art / halftone / starburst style.',
};

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY not set');
  return k;
}

/** One chat turn. Returns the message text. `json:true` requests a JSON object. */
async function chat(system, user, { json = false, maxTokens = 2000 } = {}) {
  const res = await fetch(OPENAI, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

/** Pull a JSON object out of a model reply, tolerating stray prose or ``` fences. */
function parseJSON(raw) {
  let s = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

/**
 * Draft a full posting from a short prompt. Returns an object shaped for the
 * given type (news | slide), in 33Mega's British-English voice.
 */
export async function draftContent(type, prompt) {
  const shapes = {
    news: `{"title": string, "description": string (<=200 chars), "body": string (Markdown), "tag": string}`,
    slide: `{"eyebrow": string (<=30 chars), "title": string (<=90 chars), "text": string (<=200 chars), "ctaLabel": string, "ctaHref": string}`,
  };
  const guidance = {
    news: 'Write an engaging news / blog post (~200-350 words) in Markdown for the body. tag is a short label such as "Product", "Company" or "Engineering".',
    slide: 'A homepage hero slide: eyebrow is a short kicker (e.g. "News"), title is a punchy headline, text one or two sentences, ctaLabel a short button label, ctaHref a relative path like "/atom/".',
  };
  if (!shapes[type]) throw new Error(`unknown draft type: ${type}`);
  const system =
    `You write website content for ${BRAND.voice}\n` +
    `Return ONLY JSON matching this shape: ${shapes[type]}. ${guidance[type]} ` +
    `Use British English.`;
  return parseJSON(await chat(system, `Draft a ${type} about: ${prompt}`, { json: true }));
}

/**
 * The house graphic styles the image model can adopt. "auto" (the default)
 * picks one of the three at random so graphics vary but always look like
 * 33Mega. They reference the company logo and the founders' pop-art portraits.
 */
const GRAPHIC_STYLES = {
  logo:
    'Clean geometric vector-emblem style echoing the 33Mega atom logo: thin precise ' +
    'line work, crossing elliptical orbit shapes and a rotated square motif, drawn in a ' +
    'smooth cyan-to-violet-to-magenta gradient on a plain cream background. Minimal ' +
    'composition, generous negative space, flat vector look.',
  'portrait-bold':
    'Bold 1980s pop-art screen-print poster style: heavy black comic outlines, ' +
    'saturated neon cyan, magenta, violet and gold inks, halftone dot shading, a ' +
    'dramatic gold starburst of rays and sparkles radiating from the centre, ' +
    'psychedelic sunset colours, high energy.',
  'portrait-comic':
    'Clean vintage comic-book illustration style: confident black ink linework, ' +
    'cream paper background, visible halftone dot shading, restrained cyan, magenta ' +
    'and gold accents, calm editorial mood, mid-century print feel.',
};

/**
 * Generate an on-brand pop-art graphic with the OpenAI Images API. The admin's
 * description is the primary subject; `headline` is only a fallback subject.
 * `style` is a GRAPHIC_STYLES key or "auto" (default → random house style).
 * Returns { name, dataBase64 } (PNG) ready for media.processUpload, which
 * resizes and re-encodes it to WebP.
 */
export async function generateGraphic(headline, description = '', style = 'auto') {
  const keys = Object.keys(GRAPHIC_STYLES);
  const chosen = GRAPHIC_STYLES[style] ? style : keys[Math.floor(Math.random() * keys.length)];
  const subject = String(description || headline || 'the 33Mega atom logo mark').trim();

  const prompt =
    `A pop-art illustration for a media-technology company website.\n` +
    `Subject: ${subject}.\n` +
    `Style: ${GRAPHIC_STYLES[chosen]}\n` +
    `Brand palette: cream #fff9ef background, gold #e8a33d accents, and cyan #2bd4ff, ` +
    `violet #9d7bff, magenta #f0439c as the main colours, with near-black #17121f outlines.\n` +
    `Flat illustration, not photorealistic. Do NOT include any text, words, lettering, ` +
    `captions or watermarks unless the subject explicitly asks for them. ` +
    `One clear focal composition, clean and uncluttered.`;

  const res = await fetch(OPENAI_IMAGES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: '1536x1024', quality: 'medium', n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI image ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image returned');
  return { name: `ai-graphic-${Date.now().toString(36)}.png`, dataBase64: b64 };
}
