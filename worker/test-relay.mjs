// Integration test for the relay Worker: mocks Cloudflare KV and the Telegram API
// so the whole request path (validation -> formatting -> splitting -> fan-out ->
// subscriber pruning) can be exercised without deploying. Run: node worker/test-relay.mjs
import assert from 'assert';
import { AsyncLocalStorage } from 'node:async_hooks';
import worker from './src/index.js';

// Each Worker invocation gets its own subrequest budget. AsyncLocalStorage attributes
// every mocked fetch to the invocation that issued it, even across the deferred
// ctx.waitUntil continuations, which a mutable "current invocation" variable cannot do.
const als = new AsyncLocalStorage();

const ORIGIN = 'https://faculty-french.github.io';
const WEBHOOK_SECRET = 'test-webhook-secret';

function makeKV() {
  const store = new Map(); // key -> { value, metadata }
  return {
    _store: store,
    async get(key) { return store.has(key) ? store.get(key).value : null; },
    async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null }); },
    async delete(key) { store.delete(key); },
    async list({ prefix = '', cursor } = {}) {
      const keys = [...store.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([name, v]) => ({ name, metadata: v.metadata }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

// Captures outbound Telegram calls. `failFor` maps chat_id -> {status, description}.
// Self-calls to /internal/fanout are routed back into the Worker so that the batched
// fan-out is genuinely exercised, and per-invocation subrequest counts are tracked so
// the test can assert the Cloudflare free-plan budget is respected.
function installFetchMock(failFor = new Map(), getEnv = () => null) {
  const sent = [];
  const rootCount = { count: 0 };
  const invocationCounts = [rootCount];

  globalThis.fetch = async (url, init) => {
    (als.getStore() || rootCount).count++;
    const href = String(url);

    if (href.includes('/internal/fanout')) {
      const child = { count: 0 };
      invocationCounts.push(child);
      return als.run(child, () => worker.fetch(
        new Request(href, { method: 'POST', headers: init.headers, body: init.body }),
        getEnv(),
        makeCtx.last,
      ));
    }

    const body = JSON.parse(init.body);
    sent.push({ method: href.split('/').pop(), chat_id: body.chat_id, text: body.text, parse_mode: body.parse_mode });
    const fail = failFor.get(body.chat_id);
    if (fail) {
      return new Response(JSON.stringify({ ok: false, description: fail.description }), {
        status: fail.status, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  sent.invocationCounts = invocationCounts;
  return sent;
}

// ctx.waitUntil work must be awaited explicitly, otherwise a test would finish before
// the queued continuation batches have run.
function makeCtx() {
  const pending = [];
  const c = {
    waitUntil: (p) => { pending.push(p); },
    async drain() { while (pending.length) await Promise.all(pending.splice(0)); },
  };
  makeCtx.last = c;
  return c;
}
const ctx = makeCtx();
const envFor = (kv) => ({
  SUBSCRIBERS: kv,
  TELEGRAM_BOT_TOKEN: '123:FAKE',
  TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
});

const submitReq = (payload, origin = ORIGIN) =>
  new Request('https://relay.test/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '203.0.113.' + Math.floor(Math.random() * 250) },
    body: JSON.stringify(payload),
  });

const webhookReq = (update, secret = WEBHOOK_SECRET) =>
  new Request('https://relay.test/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: JSON.stringify(update),
  });

const subscribe = async (kv, env, chatId, name) =>
  worker.fetch(webhookReq({ message: { chat: { id: chatId, first_name: name }, text: '/start' } }), env, ctx);

let passed = 0;
try {
  // ---- Test 1: /start subscribes, and the record is readable from list() metadata
  {
    const kv = makeKV(); const env = envFor(kv); installFetchMock();
    const res = await subscribe(kv, env, 111, 'Prof');
    assert.strictEqual(res.status, 200);
    const listed = await kv.list({ prefix: 'sub:' });
    assert.strictEqual(listed.keys.length, 1, 'one subscriber expected');
    assert.strictEqual(listed.keys[0].metadata.chat_id, 111, 'chat_id must be in KV metadata (avoids one get() per subscriber)');
    console.log('[PASS] Test 1: /start stores a subscriber with list()-readable metadata.');
    passed++;
  }

  // ---- Test 2: wrong webhook secret is rejected
  {
    const kv = makeKV(); const env = envFor(kv); installFetchMock();
    const res = await worker.fetch(webhookReq({ message: { chat: { id: 9 }, text: '/start' } }, 'wrong'), env, ctx);
    assert.strictEqual(res.status, 401, 'bad webhook secret must be 401');
    assert.strictEqual((await kv.list({ prefix: 'sub:' })).keys.length, 0, 'no subscriber may be created');
    console.log('[PASS] Test 2: webhook rejects a bad secret token.');
    passed++;
  }

  // ---- Test 3: fan-out — every subscriber gets every part, all parts <= 4096
  {
    const kv = makeKV(); const env = envFor(kv);
    installFetchMock();
    for (const [id, n] of [[111, 'A'], [222, 'B'], [333, 'C']]) await subscribe(kv, env, id, n);

    const c = makeCtx();
    const sent = installFetchMock(new Map(), () => env); // reset capture after the /start confirmations
    const answers = Array.from({ length: 30 }, (_, i) => ({
      index: i + 1, type: i % 2 ? 'mcq' : 'open-ended',
      question: `Question ${i + 1} : pourquoi <les> arbres & la nature ?`,
      answer: 'Réponse détaillée de l\'étudiant. '.repeat(40),
    }));
    const res = await worker.fetch(submitReq({
      studentName: 'Marie <Dupont> & Cie', lessonTitle: 'Leçon 1 : L\'environnement',
      submittedAt: new Date().toISOString(), answers,
    }), env, c);
    await c.drain();

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.ok, true);
    assert.strictEqual(json.recipients + (json.queued || 0), 3, 'all three subscribers must be covered');
    assert(json.parts > 1, 'this payload must span multiple messages');

    for (const m of sent) {
      assert(m.text.length <= 4096, `a sent message exceeded 4096 chars (${m.text.length})`);
      assert.strictEqual(m.parse_mode, 'HTML');
      assert(!m.text.includes('<les>'), 'raw angle brackets must be escaped');
    }
    assert.strictEqual(sent.length, json.parts * 3, 'each subscriber gets each part exactly once');
    for (const id of [111, 222, 333]) {
      assert.strictEqual(sent.filter((m) => m.chat_id === id).length, json.parts, `chat ${id} part count`);
    }
    assert(sent[0].text.includes('Marie &lt;Dupont&gt; &amp; Cie'), 'student name must be HTML-escaped');
    console.log(`[PASS] Test 3: fan-out to 3 subscribers x ${json.parts} parts, all escaped and <= 4096.`);
    passed++;
  }

  // ---- Test 4: a blocked subscriber is pruned; the others still receive
  {
    const kv = makeKV(); const env = envFor(kv);
    installFetchMock();
    for (const id of [111, 222]) await subscribe(kv, env, id, 'X');

    const sent = installFetchMock(new Map([[111, { status: 403, description: 'Forbidden: bot was blocked by the user' }]]));
    const res = await worker.fetch(submitReq({
      studentName: 'Ali', lessonTitle: 'Leçon 2', submittedAt: new Date().toISOString(),
      answers: [{ index: 1, type: 'open-ended', question: 'Q', answer: 'A' }],
    }), env, ctx);

    const json = await res.json();
    assert.strictEqual(json.recipients, 1, 'the working subscriber must still be counted');
    assert.strictEqual(await kv.get('sub:111'), null, 'the blocking subscriber must be pruned from KV');
    assert(sent.some((m) => m.chat_id === 222), 'the other subscriber must still receive the report');
    console.log('[PASS] Test 4: blocked subscriber pruned, delivery to others unaffected.');
    passed++;
  }

  // ---- Test 5: zero subscribers is a success for the student, not an error
  {
    const kv = makeKV(); const env = envFor(kv); installFetchMock();
    const res = await worker.fetch(submitReq({
      studentName: 'Sara', lessonTitle: 'Leçon 3', submittedAt: new Date().toISOString(),
      answers: [{ index: 1, type: 'mcq', question: 'Q', answer: 'B' }],
    }), env, ctx);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.ok, true);
    assert.strictEqual(json.recipients, 0);
    assert.strictEqual(json.warning, 'no subscribers');
    console.log('[PASS] Test 5: no subscribers -> student still sees success.');
    passed++;
  }

  // ---- Test 6: origin allowlist and payload validation
  {
    const kv = makeKV(); const env = envFor(kv); installFetchMock();
    const good = { studentName: 'X', lessonTitle: 'L', submittedAt: '', answers: [{ index: 1, type: 'mcq', question: 'Q', answer: 'A' }] };

    let res = await worker.fetch(submitReq(good, 'https://evil.example.com'), env, ctx);
    assert.strictEqual(res.status, 403, 'a foreign origin must be refused');

    res = await worker.fetch(submitReq({ ...good, studentName: '' }), env, ctx);
    assert.strictEqual(res.status, 400, 'empty student name must be refused');

    res = await worker.fetch(submitReq({ ...good, answers: [] }), env, ctx);
    assert.strictEqual(res.status, 400, 'empty answer list must be refused');

    res = await worker.fetch(submitReq({ ...good, answers: [{ index: 1, question: 'Q', answer: 42 }] }), env, ctx);
    assert.strictEqual(res.status, 400, 'non-string answer must be refused');
    console.log('[PASS] Test 6: origin allowlist + payload validation reject bad input.');
    passed++;
  }

  // ---- Test 7: CORS headers only for allowlisted origins
  {
    const kv = makeKV(); const env = envFor(kv); installFetchMock();
    const pre = (origin) => worker.fetch(new Request('https://relay.test/submit', { method: 'OPTIONS', headers: { Origin: origin } }), env, ctx);
    assert.strictEqual((await pre(ORIGIN)).headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.strictEqual((await pre('https://evil.example.com')).headers.get('Access-Control-Allow-Origin'), null);
    console.log('[PASS] Test 7: CORS echoes only allowlisted origins.');
    passed++;
  }

  // ---- Test 8: a class-sized subscriber list is delivered in full, and no single
  // Worker invocation exceeds the Cloudflare free-plan subrequest budget of 50.
  {
    const kv = makeKV(); const env = envFor(kv);
    installFetchMock(new Map(), () => env);
    const ids = Array.from({ length: 60 }, (_, i) => 1000 + i);
    for (const id of ids) await subscribe(kv, env, id, `Sub${id}`);

    const c = makeCtx();
    const sent = installFetchMock(new Map(), () => env);
    const answers = Array.from({ length: 12 }, (_, i) => ({
      index: i + 1, type: 'open-ended',
      question: `Question ${i + 1} ?`,
      answer: 'Une réponse d\'étudiant assez longue. '.repeat(20),
    }));
    const rootInvocation = sent.invocationCounts[0];
    const res = await als.run(rootInvocation, () => worker.fetch(submitReq({
      studentName: 'Youssef', lessonTitle: 'Leçon 5', submittedAt: new Date().toISOString(), answers,
    }), env, c));
    await c.drain();

    const json = await res.json();
    assert.strictEqual(json.ok, true);

    for (const id of ids) {
      assert.strictEqual(
        sent.filter((m) => m.chat_id === id).length, json.parts,
        `subscriber ${id} must receive all ${json.parts} part(s)`,
      );
    }
    assert.strictEqual(sent.length, json.parts * ids.length, 'exactly one delivery per part per subscriber');

    const worst = Math.max(...sent.invocationCounts.map((i) => i.count));
    assert(worst <= 50, `an invocation made ${worst} subrequests, over the free-plan limit of 50`);
    console.log(`[PASS] Test 8: ${ids.length} subscribers x ${json.parts} part(s) = ${sent.length} messages delivered; worst invocation used ${worst}/50 subrequests.`);
    passed++;
  }

  console.log(`\nALL ${passed} RELAY TESTS PASSED!`);
} catch (err) {
  console.error(`\n[FAIL] after ${passed} passing test(s):`, err);
  process.exit(1);
}
