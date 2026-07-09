// 33Mega Admin — front-end. Login/session + two composers (news, homepage
// slides) + a pending/publish view. Talks only to the same-origin API.
const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const TOKEN_KEY = 'm33_admin_token';
const token = () => sessionStorage.getItem(TOKEN_KEY);
const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// AI-graphic house styles (mirrors GRAPHIC_STYLES in admin/lib/assist.mjs).
const STYLE_OPTIONS =
  '<option value="auto">House style (auto)</option>' +
  '<option value="logo">Logo style (atom mark)</option>' +
  '<option value="portrait-bold">Pop-art portrait — bold</option>' +
  '<option value="portrait-comic">Pop-art portrait — comic</option>';

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts.headers || {}) },
  });
  if (res.status === 401) { showLogin(); throw new Error('unauthorised'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'validation' ? data.details.join('; ') : data.error || `error ${res.status}`);
  return data;
}

// ---------- auth ----------
function showLogin() { setToken(null); $('#app').hidden = true; $('#login').hidden = false; }
async function showApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  try { const me = await api('/api/me'); $('#who').textContent = me.email; } catch {}
  selectTab('news');
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error'); err.hidden = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('#email').value.trim().toLowerCase(), password: $('#password').value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Sign in failed');
    setToken(d.token); showApp();
  } catch (e) { err.textContent = e.message; err.hidden = false; }
});
$('#logout').addEventListener('click', showLogin);

// ---------- tabs ----------
const TABS = { news: renderNews, slides: renderSlides, drafts: renderDrafts };
function selectTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  const panel = $('#panel'); panel.innerHTML = '';
  TABS[name](panel);
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

// ---------- shared bits ----------
function statusLine(parent) {
  const s = el('<p class="status" hidden></p>'); parent.appendChild(s);
  return (msg, kind = 'info') => { s.hidden = false; s.textContent = msg; s.className = `status ${kind}`; };
}
async function fileToImage(input) {
  const f = input.files[0];
  if (!f) return null;
  const buf = await f.arrayBuffer();
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { name: f.name, dataBase64: btoa(bin) };
}
function imagePreview(container, image) {
  container.innerHTML = '';
  if (!image) return;
  const isSvg = /\.svg$/i.test(image.name);
  const src = isSvg ? `data:image/svg+xml;base64,${image.dataBase64}` : `data:image/*;base64,${image.dataBase64}`;
  container.appendChild(el(`<img class="thumb" src="${src}" alt="preview" />`));
}

// Existing news list with Remove (unpublish) buttons → delete-draft pipeline.
async function renderManageList(root, say) {
  const block = el('<div class="manage"><h3>Manage existing news posts</h3><div class="slide-list muted" id="m-list">Loading…</div></div>');
  root.appendChild(block);
  const list = block.querySelector('#m-list');
  try {
    const { items } = await api('/api/content?type=news');
    list.innerHTML = '';
    if (!items.length) { list.textContent = 'No news posts yet.'; return; }
    items.forEach((it) => {
      const row = el(`<div class="slide-row"><span><b>${escapeHtml(it.title)}</b><br><small class="muted">${it.slug}</small></span><button class="btn ghost small">Remove</button></div>`);
      row.querySelector('button').onclick = async () => {
        if (!confirm(`Remove post “${it.title}”?\n\nThis creates a draft to preview & publish — it won't go live until you Publish it.`)) return;
        try {
          const r = await api('/api/drafts', { method: 'POST', body: JSON.stringify({ type: 'delete', slug: it.slug }) });
          say(`Removal submitted (draft #${r.draft_id}) — preview & publish in Pending.`, 'ok');
          row.remove();
        } catch (e) { say(e.message, 'error'); }
      };
      list.appendChild(row);
    });
  } catch (e) { list.textContent = e.message; }
}

// ---------- NEWS ----------
function renderNews(root) {
  root.appendChild(el(`
    <div>
      <h2>Write a news post</h2>
      <p class="muted">Publishes to the site's News feed after preview.</p>
      <div class="ai-row">
        <input id="n-prompt" placeholder="What's the post about? AI will draft it" />
        <button id="n-ai" class="btn ghost">✨ AI draft</button>
      </div>
      <label>Title<input id="n-title" /></label>
      <div class="grid2">
        <label>Tag<input id="n-tag" placeholder="Product / Company / Engineering" value="News" /></label>
        <label>Author<input id="n-author" placeholder="33Mega" value="33Mega" /></label>
      </div>
      <label>Summary (used in listings &amp; social)<textarea id="n-desc" rows="2"></textarea></label>
      <label>Body (Markdown)<textarea id="n-body" rows="10"></textarea></label>
      <div class="image-block">
        <strong>Featured image (optional)</strong>
        <label>AI graphic description<input id="n-gfx" placeholder="Describe the graphic to generate (auto-filled from your AI draft prompt)" /></label>
        <div class="ai-row">
          <label class="inline-field">Style<select id="n-style">${STYLE_OPTIONS}</select></label>
          <button id="n-gen" class="btn ghost">🎨 AI graphic</button>
          <span class="muted">or upload</span>
          <input id="n-file" type="file" accept="image/*" />
        </div>
        <div id="n-thumb" class="thumb-wrap"></div>
      </div>
      <button id="n-submit" class="btn primary">Submit for preview</button>
    </div>`));
  const say = statusLine(root);
  let image = null;

  $('#n-ai').onclick = async () => {
    say('Drafting with AI…');
    try {
      const { draft } = await api('/api/assist', { method: 'POST', body: JSON.stringify({ task: 'draft', type: 'news', prompt: $('#n-prompt').value }) });
      $('#n-title').value = draft.title || ''; $('#n-desc').value = draft.description || '';
      $('#n-body').value = draft.body || ''; if (draft.tag) $('#n-tag').value = draft.tag;
      if (!$('#n-gfx').value) $('#n-gfx').value = $('#n-prompt').value || draft.title || '';
      say('Drafted — review, add an image, submit.', 'ok');
    } catch (e) { say(e.message, 'error'); }
  };
  $('#n-file').onchange = async () => { image = await fileToImage($('#n-file')); imagePreview($('#n-thumb'), image); };
  $('#n-gen').onclick = async () => {
    say('Generating pop-art graphic (can take ~15s)…');
    try {
      const { image: img } = await api('/api/assist', { method: 'POST', body: JSON.stringify({ task: 'graphic', headline: $('#n-title').value || $('#n-prompt').value, context: $('#n-gfx').value || $('#n-prompt').value, style: $('#n-style').value }) });
      image = img; imagePreview($('#n-thumb'), image); say('Graphic ready.', 'ok');
    } catch (e) { say(e.message, 'error'); }
  };
  $('#n-submit').onclick = async () => {
    say('Submitting…');
    try {
      const r = await api('/api/drafts', { method: 'POST', body: JSON.stringify({
        type: 'news', title: $('#n-title').value, description: $('#n-desc').value,
        body: $('#n-body').value, tag: $('#n-tag').value, author: $('#n-author').value,
        image: image || undefined,
      }) });
      say(`Submitted (draft #${r.draft_id}). Open “Pending” to preview & publish.`, 'ok');
    } catch (e) { say(e.message, 'error'); }
  };
  renderManageList(root, say);
}

// ---------- HOMEPAGE SLIDES ----------
async function renderSlides(root) {
  root.appendChild(el(`
    <div>
      <h2>Homepage slides</h2>
      <p class="muted">The core hero slides are permanent and not shown here. You can add or remove extra slides that appear after them, each with an expiry date.</p>
      <div class="split">
        <div>
          <h3>Add a slide</h3>
          <div class="ai-row"><input id="s-prompt" placeholder="What's the news? AI will draft it" /><button id="s-ai" class="btn ghost">✨ AI draft</button></div>
          <label>Eyebrow (kicker)<input id="s-eyebrow" placeholder="News" /></label>
          <label>Title<input id="s-title" /></label>
          <label>Text<textarea id="s-text" rows="2"></textarea></label>
          <div class="grid2">
            <label>Button label (optional)<input id="s-cta" /></label>
            <label>Button link (optional)<input id="s-href" placeholder="/atom/" /></label>
            <label>Art style<select id="s-art"><option value="spark">Spark</option><option value="atom">Atom</option><option value="orbit">Orbit</option><option value="exit">Exit</option></select></label>
            <label>Accent colour<select id="s-burst"><option value="#9d7bff">Violet</option><option value="#e8a33d">Gold</option><option value="#2bd4ff">Cyan</option><option value="#f0439c">Magenta</option></select></label>
            <label>Expires<input id="s-exp" type="date" /></label>
          </div>
          <p class="field-note">The slide hides itself automatically after the expiry date.</p>
          <div class="image-block">
            <strong>Slide graphic (optional — replaces the art style)</strong>
            <label>AI graphic description<input id="s-gfx" placeholder="Describe the graphic to generate (auto-filled from your AI draft prompt)" /></label>
            <div class="ai-row">
              <label class="inline-field">Style<select id="s-style">${STYLE_OPTIONS}</select></label>
              <button id="s-gen" class="btn ghost">🎨 AI graphic</button>
              <span class="muted">or upload</span>
              <input id="s-file" type="file" accept="image/*" />
            </div>
            <div id="s-thumb" class="thumb-wrap"></div>
          </div>
          <button id="s-add" class="btn primary">Add slide (preview)</button>
        </div>
        <div>
          <h3>Current extra slides</h3>
          <div id="s-list" class="slide-list muted">Loading…</div>
        </div>
      </div>
    </div>`));
  const say = statusLine(root);
  let image = null;

  async function loadList() {
    try {
      const { slides } = await api('/api/slides');
      const list = $('#s-list'); list.innerHTML = '';
      if (!slides.length) { list.textContent = 'No extra slides. Add one on the left.'; return; }
      slides.forEach((s) => {
        const row = el(`<div class="slide-row"><span><b>${escapeHtml(s.title || s.id)}</b><br><small class="muted">expires ${s.expires || '—'}</small></span><button class="btn ghost small">Remove</button></div>`);
        row.querySelector('button').onclick = async () => {
          if (!confirm(`Remove slide “${s.title}”? This creates a draft to preview & publish.`)) return;
          try { const r = await api('/api/drafts', { method: 'POST', body: JSON.stringify({ type: 'slide', op: 'remove', id: s.id }) }); say(`Removal submitted (draft #${r.draft_id}) — preview & publish in Pending.`, 'ok'); }
          catch (e) { say(e.message, 'error'); }
        };
        list.appendChild(row);
      });
    } catch (e) { $('#s-list').textContent = e.message; }
  }
  loadList();

  $('#s-ai').onclick = async () => {
    say('Drafting…');
    try {
      const { draft } = await api('/api/assist', { method: 'POST', body: JSON.stringify({ task: 'draft', type: 'slide', prompt: $('#s-prompt').value }) });
      $('#s-eyebrow').value = draft.eyebrow || 'News'; $('#s-title').value = draft.title || '';
      $('#s-text').value = draft.text || ''; $('#s-cta').value = draft.ctaLabel || ''; $('#s-href').value = draft.ctaHref || '';
      if (!$('#s-gfx').value) $('#s-gfx').value = $('#s-prompt').value || draft.title || '';
      say('Drafted.', 'ok');
    } catch (e) { say(e.message, 'error'); }
  };
  $('#s-file').onchange = async () => { image = await fileToImage($('#s-file')); imagePreview($('#s-thumb'), image); };
  $('#s-gen').onclick = async () => {
    say('Generating pop-art graphic (can take ~15s)…');
    try {
      const { image: img } = await api('/api/assist', { method: 'POST', body: JSON.stringify({ task: 'graphic', headline: $('#s-title').value || $('#s-prompt').value, context: $('#s-gfx').value || $('#s-prompt').value, style: $('#s-style').value }) });
      image = img; imagePreview($('#s-thumb'), image); say('Graphic ready.', 'ok');
    } catch (e) { say(e.message, 'error'); }
  };
  $('#s-add').onclick = async () => {
    say('Submitting…');
    try {
      const r = await api('/api/drafts', { method: 'POST', body: JSON.stringify({
        type: 'slide', op: 'add', expires: $('#s-exp').value,
        eyebrow: $('#s-eyebrow').value, title: $('#s-title').value, text: $('#s-text').value,
        ctaLabel: $('#s-cta').value, ctaHref: $('#s-href').value,
        art: $('#s-art').value, burst: $('#s-burst').value,
        image: image || undefined,
      }) });
      say(`Slide submitted (draft #${r.draft_id}) — preview & publish in Pending.`, 'ok');
      loadList();
    } catch (e) { say(e.message, 'error'); }
  };
}

// ---------- PENDING / PUBLISH ----------
async function renderDrafts(root) {
  root.appendChild(el('<div><h2>Pending changes</h2><p class="muted">Preview each change on the live-preview site, then Publish to make it live (~2 min). Refresh if a preview is still building.</p><button id="d-refresh" class="btn ghost">Refresh</button><div id="d-list" class="draft-list">Loading…</div></div>'));
  const say = statusLine(root);
  async function load() {
    try {
      const { drafts } = await api('/api/drafts');
      const list = $('#d-list'); list.innerHTML = '';
      if (!drafts.length) { list.innerHTML = '<p class="muted">Nothing pending.</p>'; return; }
      drafts.forEach((d) => {
        const preview = d.preview_url ? `<a class="btn ghost small" href="${d.preview_url}" target="_blank" rel="noopener">Preview ↗</a>` : '<span class="muted small">preview building…</span>';
        const row = el(`<div class="draft-row"><span><b>${escapeHtml(d.title.replace('[content] ', ''))}</b><br><small class="muted">#${d.draft_id}</small></span><span class="draft-actions">${preview} <button class="btn small pub">Publish</button> <button class="btn ghost small dis">Discard</button></span></div>`);
        row.querySelector('.pub').onclick = async () => { if (!confirm('Publish to the live site?')) return; say('Publishing…'); try { await api(`/api/drafts/${d.draft_id}/publish`, { method: 'POST' }); say(`Published #${d.draft_id} — live in ~2 minutes.`, 'ok'); load(); } catch (e) { say(e.message, 'error'); } };
        row.querySelector('.dis').onclick = async () => { if (!confirm('Discard this draft?')) return; try { await api(`/api/drafts/${d.draft_id}/discard`, { method: 'POST' }); load(); } catch (e) { say(e.message, 'error'); } };
        list.appendChild(row);
      });
    } catch (e) { $('#d-list').textContent = e.message; }
  }
  $('#d-refresh').onclick = load;
  load();
}

// resume session
if (token()) showApp(); else showLogin();
