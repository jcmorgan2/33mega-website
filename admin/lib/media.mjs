/**
 * Image handling for uploads and AI-generated graphics.
 * - Raster (jpg/png/webp): auto-orient, resize (long edge <= 1600), re-encode
 *   to WebP, strip EXIF (drops camera/location metadata + any embedded exploit).
 * - SVG: sanitise markup (scripts/handlers removed); kept as-is (vector).
 * Returns { file: {path, content, binary}, path } ready to commit + reference.
 * Paths use the site-at-repo-root layout (public/media/…).
 */
import sharp from 'sharp';
import { sanitiseMarkdown } from './validate.mjs';

const MAX_INPUT = 12_000_000; // 12 MB raw upload cap (phone photos)
const LONG_EDGE = 1600;

function stamp() {
  const n = new Date();
  return { yyyy: n.getUTCFullYear(), mm: String(n.getUTCMonth() + 1).padStart(2, '0') };
}
function safeName(name) {
  return String(name || 'image').toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
}

/**
 * @param {{name:string, dataBase64:string}} image
 * @returns {Promise<{file:{path:string,content:string,binary:boolean}, path:string}>}
 */
export async function processUpload(image) {
  if (!image?.dataBase64) throw new Error('no image data');
  const raw = Buffer.from(String(image.dataBase64).replace(/^data:[^,]*,/, ''), 'base64');
  if (!raw.length) throw new Error('empty image');
  if (raw.length > MAX_INPUT) throw new Error('image exceeds 12 MB');

  const ext = safeName(image.name).split('.').pop();
  const { yyyy, mm } = stamp();
  const base = safeName(image.name).replace(/\.[^.]+$/, '') || 'image';

  if (ext === 'svg') {
    const clean = sanitiseMarkdown(raw.toString('utf8'));
    const rel = `uploads/${yyyy}/${mm}/${base}.svg`;
    return { file: { path: `public/media/${rel}`, content: clean, binary: false }, path: `/media/${rel}` };
  }

  // raster → normalised WebP
  const out = await sharp(raw)
    .rotate() // apply EXIF orientation, then EXIF is dropped on re-encode
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const rel = `uploads/${yyyy}/${mm}/${base}.webp`;
  return {
    file: { path: `public/media/${rel}`, content: out.toString('base64'), binary: true },
    path: `/media/${rel}`,
  };
}
