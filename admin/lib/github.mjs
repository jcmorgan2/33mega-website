/** Minimal GitHub REST client for the content pipeline (no dependencies). */

const API = 'https://api.github.com';

export class GitHub {
  constructor({ token, repo }) {
    this.token = token;
    this.repo = repo; // "owner/name"
  }

  async req(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async defaultBranchSha(branch = 'main') {
    const ref = await this.req('GET', `/repos/${this.repo}/git/ref/heads/${branch}`);
    return ref.object.sha;
  }

  /** Read + decode a file at a ref; returns '' if it doesn't exist. */
  async getFile(path, ref = 'main') {
    try {
      const r = await this.req('GET', `/repos/${this.repo}/contents/${encodeURIComponent(path)}?ref=${ref}`);
      return Buffer.from(r.content, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  /** List files in a directory (non-recursive). Returns [{ name, path }] or []. */
  async listDir(dir, ref = 'main') {
    try {
      const r = await this.req('GET', `/repos/${this.repo}/contents/${encodeURIComponent(dir)}?ref=${ref}`);
      return Array.isArray(r) ? r.filter((e) => e.type === 'file').map((e) => ({ name: e.name, path: e.path })) : [];
    } catch {
      return [];
    }
  }

  async createBranch(name, fromSha) {
    return this.req('POST', `/repos/${this.repo}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: fromSha,
    });
  }

  /** Delete a file on a branch (needs its blob sha). No-op if it doesn't exist. */
  async deleteFile(branch, path, message) {
    let sha;
    try {
      const existing = await this.req('GET', `/repos/${this.repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
      sha = existing.sha;
    } catch {
      return null; // already gone
    }
    return this.req('DELETE', `/repos/${this.repo}/contents/${encodeURIComponent(path)}`, {
      message,
      branch,
      sha,
    });
  }

  async deleteBranch(name) {
    return this.req('DELETE', `/repos/${this.repo}/git/refs/heads/${name}`).catch(() => null);
  }

  /**
   * Create or update a file on a branch.
   * `binary: true` means `content` is already base64 (e.g. an uploaded PNG);
   * otherwise `content` is a UTF-8 string and gets base64-encoded here.
   */
  async putFile(branch, path, content, message, { binary = false } = {}) {
    let sha;
    try {
      const existing = await this.req(
        'GET',
        `/repos/${this.repo}/contents/${encodeURIComponent(path)}?ref=${branch}`
      );
      sha = existing.sha;
    } catch {
      /* new file */
    }
    return this.req('PUT', `/repos/${this.repo}/contents/${encodeURIComponent(path)}`, {
      message,
      branch,
      content: binary ? content : Buffer.from(content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    });
  }

  async createPR({ title, head, base = 'main', body }) {
    const pr = await this.req('POST', `/repos/${this.repo}/pulls`, { title, head, base, body });
    await this.req('POST', `/repos/${this.repo}/issues/${pr.number}/labels`, {
      labels: ['content-draft'],
    }).catch(() => null);
    return pr;
  }

  async listDraftPRs() {
    const prs = await this.req('GET', `/repos/${this.repo}/pulls?state=open&per_page=50`);
    return prs.filter((p) => p.labels?.some((l) => l.name === 'content-draft'));
  }

  async getPR(number) {
    return this.req('GET', `/repos/${this.repo}/pulls/${number}`);
  }

  /** Find the Firebase preview URL posted by the deploy action as a PR comment. */
  async previewUrl(number) {
    const comments = await this.req(
      'GET',
      `/repos/${this.repo}/issues/${number}/comments?per_page=50`
    );
    for (const c of comments.reverse()) {
      const m = c.body?.match(/https:\/\/[\w-]+--[\w-]+\.web\.app[^\s)\]]*/);
      if (m) return m[0];
    }
    return null;
  }

  async mergePR(number) {
    return this.req('PUT', `/repos/${this.repo}/pulls/${number}/merge`, {
      merge_method: 'squash',
    });
  }

  async closePR(number) {
    return this.req('PATCH', `/repos/${this.repo}/pulls/${number}`, { state: 'closed' });
  }
}
