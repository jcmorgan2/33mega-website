/**
 * AI assist via the OpenAI API — draft news/slide copy and generate an on-brand
 * pop-art SVG graphic. Server-side only (the API key never reaches the browser).
 * Uses fetch directly against the Chat Completions endpoint (no SDK).
 */
const OPENAI = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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
 * Generate an on-brand pop-art SVG graphic (no raster model needed — SVG suits
 * the site's vector aesthetic and is sanitised before commit). Returns
 * { name, dataBase64 } ready for media.processUpload (SVG branch).
 */
export async function generateGraphic(headline, extra = '') {
  const system =
    `You are a graphic designer producing a single self-contained SVG for ${BRAND.voice}\n` +
    `Return ONLY the SVG markup — starting with <svg and ending with </svg>. No prose, no code fences, no <script>. ` +
    `Use viewBox="0 0 1200 630". Style: bold 1980s pop-art — cream #fff9ef background, ` +
    `halftone dots, gold #e8a33d starburst rays, thick #17121f outlines, and the cyan→violet→magenta ` +
    `gradient (#2bd4ff → #9d7bff → #f0439c). Include the headline text prominently in a heavy sans-serif. ` +
    `Keep it clean and legible; no photos, no external references, no fonts beyond generic sans-serif.`;
  const svg = await chat(
    system,
    `Headline to feature: "${headline}".${extra ? ` Context: ${extra}.` : ''}`,
    { maxTokens: 4000 }
  );
  const start = svg.indexOf('<svg');
  const end = svg.lastIndexOf('</svg>');
  if (start === -1 || end === -1) throw new Error('model did not return an SVG');
  const clean = svg.slice(start, end + 6);
  return {
    name: `ai-graphic-${Date.now().toString(36)}.svg`,
    dataBase64: Buffer.from(clean, 'utf8').toString('base64'),
  };
}
