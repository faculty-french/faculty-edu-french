// Tests for the admin editing endpoints: /admin/login and /admin/save.
// Mocks KV and the GitHub contents API. Run: node worker/test-admin.mjs
import assert from 'assert';
import worker from './src/index.js';

const ORIGIN = 'https://faculty-french.github.io';
const PASSWORD = 'test-admin-password';

function makeKV() {
  const store = new Map();
  return {
    _store: store,
    async get(key) { return store.has(key) ? store.get(key).value : null; },
    async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null }); },
    async delete(key) { store.delete(key); },
    async list({ prefix = '' } = {}) {
      const keys = [...store.entries()].filter(([k]) => k.startsWith(prefix))
        .map(([name, v]) => ({ name, metadata: v.metadata }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

function makeEnv() {
  return {
    SUBSCRIBERS: makeKV(),
    ADMIN_PASSWORD: PASSWORD,
    GITHUB_TOKEN: 'test-github-token',
    TELEGRAM_BOT_TOKEN: 'x',
    TELEGRAM_WEBHOOK_SECRET: 'x',
  };
}

const ctx = { waitUntil(p) { ctx.pending.push(p); }, pending: [] };

// GitHub API mock: an in-memory file tree per branch. `putFailures` makes the
// first N PUTs to a path answer 409, to exercise the sha-refresh retry.
function installGithubMock(files, { putFailures = 0 } = {}) {
  const calls = [];
  let remainingFailures = putFailures;
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    const method = init.method || 'GET';
    calls.push({ href, method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    assert.ok(href.startsWith('https://api.github.com/'), `unexpected outbound call: ${href}`);
    assert.strictEqual(init.headers['Authorization'], 'Bearer test-github-token');
    assert.ok(init.headers['User-Agent'], 'GitHub API requires a User-Agent');

    if (method === 'POST' && href.endsWith('/pages/builds')) {
      return new Response(JSON.stringify({ status: 'queued' }), { status: 201 });
    }

    const m = href.match(/\/contents\/(.+?)(?:\?ref=(.+))?$/);
    if (!m) return new Response('{}', { status: 404 });
    const path = decodeURI(m[1]);

    if (method === 'GET') {
      const branch = m[2];
      const key = `${branch}:${path}`;
      if (!files.has(key)) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      return new Response(JSON.stringify({ sha: files.get(key).sha }), { status: 200 });
    }

    if (method === 'PUT') {
      const body = calls[calls.length - 1].body;
      const key = `${body.branch}:${path}`;
      if (!files.has(key)) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      if (remainingFailures > 0) {
        remainingFailures--;
        return new Response(JSON.stringify({ message: 'is at ... but expected ...' }), { status: 409 });
      }
      assert.strictEqual(body.sha, files.get(key).sha, `stale sha for ${key}`);
      const newSha = `sha-${Math.random().toString(36).slice(2, 10)}`;
      files.set(key, { sha: newSha, content: body.content });
      return new Response(JSON.stringify({ commit: { sha: `commit-${newSha}` } }), { status: 200 });
    }
    return new Response('{}', { status: 405 });
  };
  return calls;
}

function post(path, body, { origin = ORIGIN, ip = '1.2.3.4' } = {}) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
  if (origin) headers['Origin'] = origin;
  return new Request(`https://relay.test${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

const LESSON = {
  id: 'lesson3',
  title: 'Leçon 3',
  pages: [
    { id: 'lesson3-p01', type: 'content', title: 'T', content: [{ type: 'paragraph', text: 'Économies d’essence — «été»' }] },
  ],
  questions: [{ id: 'l3-q1', type: 'open-ended', text: 'Pourquoi ?' }],
};

function seedFiles() {
  return new Map([
    ['gh-pages:content/unit1/lesson3.json', { sha: 'sha-live-1', content: null }],
    ['001-interactive-pdf-webbook:public/content/unit1/lesson3.json', { sha: 'sha-src-1', content: null }],
  ]);
}

// ---- 1. login: wrong password 401, right password ok, rate limit at 10 failures
{
  const env = makeEnv();
  installGithubMock(seedFiles());

  let res = await worker.fetch(post('/admin/login', { password: 'nope' }), env, ctx);
  assert.strictEqual(res.status, 401);

  res = await worker.fetch(post('/admin/login', { password: PASSWORD }), env, ctx);
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).ok, true);

  for (let i = 0; i < 9; i++) await worker.fetch(post('/admin/login', { password: 'nope' }), env, ctx);
  res = await worker.fetch(post('/admin/login', { password: PASSWORD }), env, ctx);
  assert.strictEqual(res.status, 429, 'the 10th failure must lock the hour bucket, even for the right password');

  // A different IP is unaffected.
  res = await worker.fetch(post('/admin/login', { password: PASSWORD }, { ip: '5.6.7.8' }), env, ctx);
  assert.strictEqual(res.status, 200);
  console.log('OK 1: login auth + per-IP failure rate limit');
}

// ---- 2. origin enforcement
{
  const env = makeEnv();
  installGithubMock(seedFiles());
  const res = await worker.fetch(post('/admin/login', { password: PASSWORD }, { origin: 'https://evil.example' }), env, ctx);
  assert.strictEqual(res.status, 403);
  const res2 = await worker.fetch(post('/admin/login', { password: PASSWORD }, { origin: null }), env, ctx);
  assert.strictEqual(res2.status, 403);
  console.log('OK 2: non-allowlisted and missing origins are rejected');
}

// ---- 3. save: path allowlist
{
  const env = makeEnv();
  installGithubMock(seedFiles());
  for (const path of ['../workflows/x.yml', 'unit1/../../.github/x', 'unit9/lesson1.json',
    'unit1/lesson3.json.bak', '/etc/passwd', 'book.json', 'unit1\\lesson3.json']) {
    const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path, lesson: LESSON }), env, ctx);
    assert.strictEqual(res.status, 400, `path must be rejected: ${path}`);
  }
  console.log('OK 3: only unitN/lessonN.json paths are accepted');
}

// ---- 4. save: shape validation + wrong password
{
  const env = makeEnv();
  installGithubMock(seedFiles());
  for (const lesson of [null, [], {}, { pages: [] }, { pages: [{ id: 1, content: [] }] },
    { pages: LESSON.pages, questions: 'x' }]) {
    const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson }), env, ctx);
    assert.strictEqual(res.status, 400, `lesson shape must be rejected: ${JSON.stringify(lesson)}`);
  }
  const res = await worker.fetch(post('/admin/save', { password: 'nope', path: 'unit1/lesson3.json', lesson: LESSON }), env, ctx);
  assert.strictEqual(res.status, 401);
  console.log('OK 4: bad lesson shapes and bad passwords are rejected');
}

// ---- 4b. structural guards for moved blocks
{
  const env = makeEnv();
  installGithubMock(seedFiles());
  const withBlocks = (content, questions = LESSON.questions) => ({
    ...LESSON,
    questions,
    pages: [{ id: 'lesson3-p01', type: 'content', title: 'T', content }],
  });
  const bad = [
    ['bloc nul', withBlocks([null])],
    ['bloc sans type', withBlocks([{ text: 'x' }])],
    ['tableau au lieu de bloc', withBlocks([['heading']])],
    ['question orpheline', withBlocks([{ type: 'question', questionId: 'l3-does-not-exist' }])],
    ['question dupliquée', withBlocks([
      { type: 'question', questionId: 'l3-q1' },
      { type: 'question', questionId: 'l3-q1' },
    ])],
  ];
  for (const [name, lesson] of bad) {
    const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson }), env, ctx);
    assert.strictEqual(res.status, 400, `must be rejected: ${name}`);
  }
  // duplicate page ids would break page addressing
  const dupPages = { ...LESSON, pages: [LESSON.pages[0], { ...LESSON.pages[0], content: [] }] };
  const dupRes = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson: dupPages }), env, ctx);
  assert.strictEqual(dupRes.status, 400, 'duplicate page ids must be rejected');

  // a legitimately moved question block (page 2 now owns it) is accepted
  const movedOk = {
    ...LESSON,
    pages: [
      { id: 'lesson3-p01', type: 'content', title: 'T', content: [] },
      { id: 'lesson3-p02', type: 'content', title: 'T2', content: [{ type: 'question', questionId: 'l3-q1' }] },
    ],
  };
  const okRes = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson: movedOk }), env, ctx);
  assert.strictEqual(okRes.status, 200, 'a moved question block must be accepted');
  console.log('OK 4b: broken blocks, orphan/duplicate questions and duplicate page ids rejected; a real move accepted');
}

// ---- 5. successful save commits to both branches, UTF-8 survives base64
{
  const env = makeEnv();
  const files = seedFiles();
  const calls = installGithubMock(files);
  ctx.pending = [];

  const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson: LESSON }), env, ctx);
  assert.strictEqual(res.status, 200);
  const out = await res.json();
  assert.strictEqual(out.ok, true);
  assert.deepStrictEqual(out.commits.map(c => c.branch), ['gh-pages', '001-interactive-pdf-webbook']);

  for (const key of ['gh-pages:content/unit1/lesson3.json', '001-interactive-pdf-webbook:public/content/unit1/lesson3.json']) {
    const stored = files.get(key);
    assert.ok(stored.content, `nothing committed for ${key}`);
    const text = Buffer.from(stored.content, 'base64').toString('utf8');
    const parsed = JSON.parse(text);
    assert.strictEqual(parsed.pages[0].content[0].text, 'Économies d’essence — «été»', 'UTF-8 mangled in transit');
    assert.ok(text.endsWith('\n'), 'file should end with a newline');
  }

  await Promise.all(ctx.pending);
  assert.ok(calls.some(c => c.method === 'POST' && c.href.endsWith('/pages/builds')), 'Pages build not nudged');
  console.log('OK 5: save commits to gh-pages + source branch, UTF-8 intact, Pages build nudged');
}

// ---- 6. PUT 409 → refetch sha and retry once
{
  const env = makeEnv();
  const files = seedFiles();
  installGithubMock(files, { putFailures: 1 });
  const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson: LESSON }), env, ctx);
  assert.strictEqual(res.status, 200);
  console.log('OK 6: a 409 race is retried with a fresh sha');
}

// ---- 7. missing file → 502, no partial-silent success
{
  const env = makeEnv();
  const files = seedFiles();
  files.delete('001-interactive-pdf-webbook:public/content/unit1/lesson3.json');
  installGithubMock(files);
  const res = await worker.fetch(post('/admin/save', { password: PASSWORD, path: 'unit1/lesson3.json', lesson: LESSON }), env, ctx);
  assert.strictEqual(res.status, 502);
  const out = await res.json();
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.commits.length, 1, 'the partial gh-pages commit must be reported');
  console.log('OK 7: a failed branch reports the partial state instead of pretending success');
}

console.log('\nPASS: admin endpoints behave.');
