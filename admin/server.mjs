/**
 * 33Mega Admin web app — Cloud Run service.
 * Serves the admin UI (public/) and its JSON API (/api/*), all behind
 * email+password / JWT auth except /api/login.
 *
 * Env: ADMIN_USERS (JSON of email→scrypt hash), JWT_SECRET, GITHUB_TOKEN,
 *      GITHUB_REPO, ANTHROPIC_API_KEY (assist), optional ANTHROPIC_MODEL.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPassword, signToken, verifyToken, loadUsers } from './lib/auth.mjs';
import { GitHub } from './lib/github.mjs';
import { buildDraft, buildSlideChange, ValidationError } from './lib/validate.mjs';
import { processUpload } from './lib/media.mjs';
import { draftContent, generateGraphic } from './lib/assist.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const REPO = process.env.GITHUB_REPO || 'jcmorgan2/33mega-website';
const gh = new GitHub({ token: process.env.GITHUB_TOKEN, repo: REPO });
const SLIDES_PATH = 'src/data/extra-slides.json';

const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let d = '';
  for await (const c of req) { d += c; if (d.length > 8_000_000) throw new Error('too large'); }
  return d ? JSON.parse(d) : {};
}
function requireAuth(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return verifyToken(token, JWT_SECRET);
}

// --- login rate limiting (per-process, best-effort) ---
const attempts = new Map();
function throttled(email) {
  const a = attempts.get(email);
  return a && a.until > Date.now();
}
function noteFailure(email) {
  const a = attempts.get(email) || { n: 0, until: 0 };
  a.n += 1;
  if (a.n >= 5) { a.until = Date.now() + 15 * 60_000; a.n = 0; }
  attempts.set(email, a);
}

/** Remove an existing news post via a draft PR. */
async function deleteContentDraft(payload, author) {
  const slug = String(payload.slug || '');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new ValidationError(['invalid slug']);
  const pth = `src/content/news/${slug}.md`;
  const branch = `draft/delete-news-${slug}-${Date.now().toString(36)}`.slice(0, 60);
  const sha = await gh.defaultBranchSha('main');
  await gh.createBranch(branch, sha);
  const r = await gh.deleteFile(branch, pth, `remove news: ${slug}`);
  if (!r) {
    await gh.deleteBranch(branch);
    throw new ValidationError([`nothing found to delete for "${slug}"`]);
  }
  const pr = await gh.createPR({
    title: `[content] remove news: ${slug}`,
    head: branch,
    base: 'main',
    body: `Deletion requested by ${author} via the admin app.\n\nRemoving:\n- \`${pth}\`\n\nA preview deploy will be posted below.`,
  });
  return { draft_id: pr.number, pr_url: pr.html_url, removed: [pth] };
}

/** Process optional image, validate, commit to a draft branch, open PR. */
async function createDraft(payload, author) {
  if (payload.type === 'delete') return deleteContentDraft(payload, author);
  let mediaFile = null;
  if (payload.image?.dataBase64) {
    const up = await processUpload(payload.image);
    payload.imagePath = up.path;
    mediaFile = up.file;
  }

  let built;
  if (payload.type === 'slide') {
    const raw = await gh.getFile(SLIDES_PATH, 'main');
    built = buildSlideChange(payload, raw ? JSON.parse(raw) : { slides: [] });
  } else {
    built = buildDraft(payload);
  }
  const files = mediaFile ? [mediaFile, ...built.files] : built.files;

  const id = `${built.slug || built.slideId || 'slide'}-${Date.now().toString(36)}`.slice(0, 60);
  const branch = `draft/${id}`;
  const sha = await gh.defaultBranchSha('main');
  await gh.createBranch(branch, sha);
  for (const f of files) {
    await gh.putFile(branch, f.path, f.content, `content: ${built.summary}`, { binary: !!f.binary });
  }
  const pr = await gh.createPR({
    title: `[content] ${built.summary}`,
    head: branch,
    base: 'main',
    body: `Submitted by ${author} via the admin app.\n\nFiles:\n${files.map((f) => `- \`${f.path}\``).join('\n')}\n\nA preview deploy will be posted below.`,
  });
  return { draft_id: pr.number, pr_url: pr.html_url, files: files.map((f) => f.path) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    if (p === '/healthz') return json(res, 200, { ok: true });

    if (p === '/api/login' && req.method === 'POST') {
      const { email, password } = await body(req);
      if (throttled(email)) return json(res, 429, { error: 'too many attempts, try later' });
      const users = loadUsers();
      const stored = users[String(email || '').toLowerCase()];
      if (!stored || !verifyPassword(String(password || ''), stored)) {
        noteFailure(email);
        return json(res, 401, { error: 'invalid email or password' });
      }
      attempts.delete(email);
      const token = signToken({ sub: email }, JWT_SECRET);
      return json(res, 200, { token, email });
    }

    if (p.startsWith('/api/')) {
      const user = requireAuth(req);
      if (!user) return json(res, 401, { error: 'unauthorised' });

      if (p === '/api/me') return json(res, 200, { email: user.sub });

      if (p === '/api/assist' && req.method === 'POST') {
        const { task, type, prompt, headline, context } = await body(req);
        if (task === 'draft') return json(res, 200, { draft: await draftContent(type, prompt) });
        if (task === 'graphic') return json(res, 200, { image: await generateGraphic(headline, context) });
        return json(res, 400, { error: 'unknown assist task' });
      }

      if (p === '/api/drafts' && req.method === 'POST') {
        const payload = await body(req);
        const result = await createDraft(payload, user.sub);
        return json(res, 201, result);
      }

      if (p === '/api/drafts' && req.method === 'GET') {
        const prs = await gh.listDraftPRs();
        const drafts = await Promise.all(prs.map(async (pr) => ({
          draft_id: pr.number, title: pr.title, created: pr.created_at,
          pr_url: pr.html_url, preview_url: await gh.previewUrl(pr.number),
        })));
        return json(res, 200, { drafts });
      }

      const act = p.match(/^\/api\/drafts\/(\d+)\/(publish|discard)$/);
      if (req.method === 'POST' && act) {
        const number = Number(act[1]);
        const pr = await gh.getPR(number);
        if (!pr.labels?.some((l) => l.name === 'content-draft')) {
          return json(res, 403, { error: 'not a content draft' });
        }
        if (act[2] === 'publish') {
          if (pr.state !== 'open') return json(res, 409, { error: `PR is ${pr.state}` });
          const merge = await gh.mergePR(number);
          await gh.deleteBranch(pr.head.ref);
          return json(res, 200, { published: true, sha: merge.sha });
        }
        await gh.closePR(number);
        await gh.deleteBranch(pr.head.ref);
        return json(res, 200, { discarded: true });
      }

      if (p === '/api/content' && req.method === 'GET') {
        const files = await gh.listDir('src/content/news', 'main');
        const items = await Promise.all(
          files.filter((f) => f.name.endsWith('.md')).map(async (f) => {
            const raw = await gh.getFile(f.path, 'main');
            const m = raw.match(/^title:\s*["']?(.*?)["']?\s*$/m);
            return { slug: f.name.replace(/\.md$/, ''), title: m ? m[1] : f.name };
          })
        );
        items.sort((a, b) => a.title.localeCompare(b.title));
        return json(res, 200, { items });
      }

      if (p === '/api/slides' && req.method === 'GET') {
        const raw = await gh.getFile(SLIDES_PATH, 'main');
        const data = raw ? JSON.parse(raw) : { slides: [] };
        return json(res, 200, { slides: (data.slides || []).map((s) => ({ id: s.id, title: s.title, expires: s.expires })) });
      }

      return json(res, 404, { error: 'not found' });
    }

    // ---- static UI ----
    let file = p === '/' ? '/index.html' : p;
    const full = path.join(PUBLIC, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
    if (full.startsWith(PUBLIC) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      return fs.createReadStream(full).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(path.join(PUBLIC, 'index.html')).pipe(res);
  } catch (e) {
    if (e instanceof ValidationError) return json(res, 422, { error: 'validation', details: e.errors });
    console.error(e);
    return json(res, 500, { error: String(e.message || e).slice(0, 200) });
  }
});

server.listen(PORT, () => console.log(`33Mega admin app on :${PORT}`));
