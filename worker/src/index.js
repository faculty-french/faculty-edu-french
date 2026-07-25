const ALLOWED_ORIGINS = new Set([
  'https://faculty-french.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function getCorsHeaders(request) {
  const origin = request ? request.headers.get('Origin') : null;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function responseJSON(data, status = 200, request = null) {
  const headers = getCorsHeaders(request);
  headers['Content-Type'] = 'application/json';
  return new Response(JSON.stringify(data), { status, headers });
}

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// A hard cut (a single line longer than the limit) must not land inside an HTML
// entity produced by esc() — "&amp;" cut into "&am" + "p;" makes Telegram reject
// the message with "can't parse entities" — nor between the two halves of a
// surrogate pair, which would emit a lone surrogate. Walk the cut point back to
// the nearest safe position.
function safeCut(text, start, end) {
  let e = end;

  const code = text.charCodeAt(e - 1);
  if (code >= 0xd800 && code <= 0xdbff) e -= 1; // trailing high surrogate

  const back = Math.max(start, e - 12); // longest entity we emit is "&amp;"
  const window = text.slice(back, e);
  const amp = window.lastIndexOf('&');
  if (amp !== -1 && !window.slice(amp).includes(';')) {
    e = back + amp;
  }

  return e > start ? e : end;
}

export function splitForTelegram(text, limit = 3900) {
  if (!text || text.length === 0) return [];
  if (text.length <= limit) return [text];

  const contentChunks = [];
  let start = 0;

  while (start < text.length) {
    const maxEnd = Math.min(start + limit, text.length);

    if (maxEnd === text.length) {
      contentChunks.push(text.slice(start));
      break;
    }

    const sliceStr = text.slice(start, maxEnd);
    const lastNewline = sliceStr.lastIndexOf('\n');

    if (lastNewline !== -1) {
      const cutIndex = start + lastNewline + 1;
      contentChunks.push(text.slice(start, cutIndex));
      start = cutIndex;
    } else {
      const cutIndex = safeCut(text, start, maxEnd);
      contentChunks.push(text.slice(start, cutIndex));
      start = cutIndex;
    }
  }

  if (contentChunks.length <= 1) {
    return contentChunks;
  }

  const totalParts = contentChunks.length;
  const result = contentChunks.map((chunk, idx) => {
    const marker = `(partie ${idx + 1}/${totalParts})\n`;
    return marker + chunk;
  });

  for (const part of result) {
    if (part.length > 4096) {
      throw new Error(`Chunk length ${part.length} exceeds Telegram maximum limit of 4096`);
    }
  }

  return result;
}

function formatReport(data) {
  const { studentName, lessonTitle, submittedAt, answers } = data;

  let dateStr = '';
  try {
    const d = submittedAt ? new Date(submittedAt) : new Date();
    dateStr = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch (e) {
    dateStr = String(submittedAt || '');
  }

  let report = `📚 <b>Nouvelle soumission</b>\n`;
  report += `👤 Étudiant : <b>${esc(studentName)}</b>\n`;
  report += `📖 Leçon : ${esc(lessonTitle || 'Non spécifiée')}\n`;
  report += `📅 ${esc(dateStr)}\n\n`;

  let graded = 0;
  let correct = 0;

  answers.forEach((ans, i) => {
    const idx = Number.isFinite(ans.index) ? ans.index : i + 1;
    const qText = esc(ans.question);
    const rawAns = (ans.answer || '').trim();
    const ansText = rawAns ? esc(rawAns) : '—';

    // ✍️ written answer · ✅/❌ a graded choice · 📝 a choice with no declared answer
    let emoji = '✍️';
    if (ans.type !== 'open-ended') {
      if (ans.correct === true) { emoji = '✅'; graded++; correct++; }
      else if (ans.correct === false) { emoji = '❌'; graded++; }
      else emoji = '📝';
    }

    report += `<b>${idx}.</b> ${qText}\n`;
    report += `${emoji} ${ansText}\n\n`;
  });

  report += `———\n${answers.length} question(s)`;
  if (graded > 0) report += ` · questions à choix : ${correct}/${graded}`;

  return report;
}

// ---------------------------------------------------------------------------
// Admin content editing.
//
// The site is static (GitHub Pages): anything shipped to the browser is public,
// so neither the GitHub token nor the admin password can live in the bundle.
// Both are Worker secrets; the browser sends the password with each admin call
// and this Worker is the only place it is checked. On save, the Worker commits
// the edited lesson JSON to GitHub with the contents API — to gh-pages
// (content/…, which the deployed app fetches at runtime, so the edit goes live
// without a rebuild) and to the source branch (public/content/…, so the next
// build does not silently revert it).
// ---------------------------------------------------------------------------

const GITHUB_REPO = 'faculty-french/faculty-edu-french';
const CONTENT_TARGETS = [
  { branch: 'gh-pages', prefix: 'content/' },
  { branch: '001-interactive-pdf-webbook', prefix: 'public/content/' },
];
const ADMIN_PATH_RE = /^unit[0-4]\/lesson\d{1,2}\.json$/;
const ADMIN_BODY_LIMIT = 900000; // lesson JSON is ~tens of KB; anything near this is not a lesson

// 10 wrong passwords per IP per hour. Successful logins do not consume the budget.
async function verifyAdmin(env, request, password) {
  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const key = `rlad:${ip}:${Math.floor(Date.now() / 3600000)}`;
  const failures = parseInt((await env.SUBSCRIBERS?.get(key)) || '0', 10);
  if (failures >= 10) {
    return { ok: false, status: 429, error: 'Trop de tentatives. Réessayez dans une heure.' };
  }
  if (!env.ADMIN_PASSWORD || !secureCompare(String(password ?? ''), env.ADMIN_PASSWORD)) {
    await env.SUBSCRIBERS?.put(key, String(failures + 1), { expirationTtl: 3600 });
    return { ok: false, status: 401, error: 'Mot de passe incorrect.' };
  }
  return { ok: true };
}

function validateLessonShape(lesson) {
  if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) return 'leçon invalide';
  if (!Array.isArray(lesson.pages) || lesson.pages.length === 0) return 'pages manquantes';
  if (lesson.questions !== undefined && !Array.isArray(lesson.questions)) return 'questions invalides';

  const questionIds = new Set((lesson.questions || []).map((q) => q && q.id).filter(Boolean));
  const seenPageIds = new Set();
  const usedQuestionIds = new Set();

  for (const p of lesson.pages) {
    if (!p || typeof p.id !== 'string' || !Array.isArray(p.content)) {
      return `page invalide (${(p && p.id) || '?'})`;
    }
    if (seenPageIds.has(p.id)) return `identifiant de page en double (${p.id})`;
    seenPageIds.add(p.id);

    for (const block of p.content) {
      // The editor can move blocks between pages, so every block that arrives
      // here must still be a real block — and a question block must still point
      // at a question that exists, or the page would render a hole.
      if (!block || typeof block !== 'object' || Array.isArray(block) || typeof block.type !== 'string') {
        return `bloc invalide sur ${p.id}`;
      }
      if (block.type === 'question') {
        if (typeof block.questionId !== 'string' || !questionIds.has(block.questionId)) {
          return `question introuvable (${block.questionId || '?'}) sur ${p.id}`;
        }
        if (usedQuestionIds.has(block.questionId)) {
          return `question ${block.questionId} utilisée deux fois`;
        }
        usedQuestionIds.add(block.questionId);
      }
    }
  }
  return null;
}

// btoa only takes latin1; UTF-8 text (the lessons are French) must go through
// bytes, chunked because String.fromCharCode(...bytes) overflows the arg limit.
function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function githubApi(env, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'faculty-bot-relay',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* some responses have no body */ }
  return { status: res.status, data };
}

async function commitFile(env, branch, filePath, base64Content, message) {
  const apiPath = `/repos/${GITHUB_REPO}/contents/${encodeURI(filePath)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const head = await githubApi(env, 'GET', `${apiPath}?ref=${branch}`);
    if (head.status !== 200 || !head.data?.sha) {
      // Only files that already exist may be edited — the admin edits lessons,
      // she does not create arbitrary files in the repository.
      return { ok: false, error: `fichier introuvable sur ${branch} (HTTP ${head.status})` };
    }
    const put = await githubApi(env, 'PUT', apiPath, {
      message,
      content: base64Content,
      sha: head.data.sha,
      branch,
    });
    if (put.status === 200 || put.status === 201) {
      return { ok: true, sha: put.data?.commit?.sha };
    }
    if (put.status !== 409) {
      return { ok: false, error: `échec du commit sur ${branch} (HTTP ${put.status})` };
    }
    // 409 = the sha moved under us (another push landed) — refetch once and retry.
  }
  return { ok: false, error: `conflit persistant sur ${branch}` };
}

async function checkRateLimit(env, ip) {
  if (!env.SUBSCRIBERS) return true;
  const hourBucket = Math.floor(Date.now() / 3600000);
  const key = `rl:${ip || 'unknown'}:${hourBucket}`;
  const current = parseInt((await env.SUBSCRIBERS.get(key)) || '0', 10);
  if (current >= 20) {
    return false;
  }
  await env.SUBSCRIBERS.put(key, String(current + 1), { expirationTtl: 3600 });
  return true;
}

// Subscriber records are written to BOTH the KV value and the key metadata, so a
// single list() returns every subscriber. Reading them with one get() per key
// would burn one subrequest each, and a Worker request is capped at 50 subrequests
// on the free plan — that budget has to be spent on sendMessage calls, not lookups.
async function getAllSubscribers(env) {
  if (!env.SUBSCRIBERS) return [];
  const subscribers = [];
  let cursor = undefined;
  do {
    const listRes = await env.SUBSCRIBERS.list({ prefix: 'sub:', cursor });
    for (const key of listRes.keys) {
      if (key.metadata && key.metadata.chat_id) {
        subscribers.push(key.metadata);
        continue;
      }
      // Fallback for records written before metadata was stored.
      const val = await env.SUBSCRIBERS.get(key.name);
      if (val) {
        try {
          subscribers.push(JSON.parse(val));
        } catch (e) {
          // ignore malformed record
        }
      }
    }
    cursor = listRes.list_complete ? undefined : listRes.cursor;
  } while (cursor);
  return subscribers;
}

async function sendTelegramPart(token, chatId, text, maxAttempts = 3) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (res.ok) {
      return { success: true };
    }

    const errData = await res.json().catch(() => ({}));
    const status = res.status;
    const description = errData.description || '';

    if (status === 403 || (status === 400 && (description.includes('chat not found') || description.includes('bot was blocked')))) {
      return { success: false, removeSubscriber: true, error: description };
    }

    if (status === 429) {
      const retryAfter = (errData.parameters?.retry_after || 1) * 1000 + 250;
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    if (attempt === maxAttempts) {
      return { success: false, error: description || `HTTP ${status}` };
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return { success: false, error: 'Max retries exceeded' };
}

// A Worker request may make at most 50 subrequests on the free plan (1000 on paid),
// and every sendMessage is one. Delivering P parts to S subscribers costs P*S, so a
// class-sized subscriber list would blow the budget in a single invocation. Deliver
// as many subscribers as fit here, then hand the remainder to a fresh invocation of
// this same Worker, which gets its own budget.
const SUBREQUEST_BUDGET = 45;
const MAX_FANOUT_DEPTH = 20;

function batchSizeFor(partCount) {
  return Math.max(1, Math.floor((SUBREQUEST_BUDGET - 3) / Math.max(1, partCount)));
}

async function dispatchRemainder(request, env, parts, subscribers, depth) {
  if (subscribers.length === 0 || depth > MAX_FANOUT_DEPTH) return;
  const selfOrigin = new URL(request.url).origin;
  await fetch(`${selfOrigin}/internal/fanout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Relay-Internal': env.TELEGRAM_WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({ parts, subscribers, depth }),
  }).catch(() => {});
}

async function fanOut(env, parts, subscribers) {
  if (subscribers.length === 0) {
    return { recipients: 0, warning: 'no subscribers' };
  }

  let recipientsCount = 0;

  for (const sub of subscribers) {
    let recipientOk = true;
    for (const part of parts) {
      if (part.length > 4096) {
        recipientOk = false;
        break;
      }

      const res = await sendTelegramPart(env.TELEGRAM_BOT_TOKEN, sub.chat_id, part);
      if (!res.success) {
        if (res.removeSubscriber && env.SUBSCRIBERS) {
          await env.SUBSCRIBERS.delete(`sub:${sub.chat_id}`).catch(() => {});
        }
        recipientOk = false;
        break;
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    if (recipientOk) {
      recipientsCount++;
    }
  }

  return { recipients: recipientsCount };
}

async function replyTelegramCommand(token, chatId, text) {
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  }).catch(() => {});
}

async function handleWebhookUpdate(update, env) {
  if (!update || !update.message || !update.message.chat) return;

  const chat = update.message.chat;
  const chatId = chat.id;
  const rawText = update.message.text ? update.message.text.trim() : '';

  if (!rawText) return;

  const command = rawText.split(' ')[0].split('@')[0];

  if (command === '/start') {
    if (env.SUBSCRIBERS) {
      const record = {
        chat_id: chatId,
        first_name: chat.first_name || '',
        username: chat.username || '',
        joined_at: new Date().toISOString()
      };
      await env.SUBSCRIBERS.put(`sub:${chatId}`, JSON.stringify(record), { metadata: record });
    }
    await replyTelegramCommand(env.TELEGRAM_BOT_TOKEN, chatId,
      '<b>Bonjour !</b> Vous êtes maintenant inscrit. Vous recevrez toutes les soumissions de devoirs des étudiants.'
    );
  } else if (command === '/stop') {
    if (env.SUBSCRIBERS) {
      await env.SUBSCRIBERS.delete(`sub:${chatId}`).catch(() => {});
    }
    await replyTelegramCommand(env.TELEGRAM_BOT_TOKEN, chatId,
      '<b>Désabonnement confirmé.</b> Vous ne recevrez plus les soumissions des étudiants.'
    );
  } else if (command === '/status') {
    const subs = await getAllSubscribers(env);
    await replyTelegramCommand(env.TELEGRAM_BOT_TOKEN, chatId,
      `<b>Statut du relais :</b>\nNombre d'abonnés actifs : <b>${subs.length}</b>`
    );
  } else {
    await replyTelegramCommand(env.TELEGRAM_BOT_TOKEN, chatId,
      '<b>Relais des devoirs</b>\n\nCommandes disponibles :\n/start - S\'abonner aux soumissions\n/stop - Se désabonner\n/status - Voir le nombre d\'abonnés'
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      const subscribers = await getAllSubscribers(env);
      return responseJSON({ ok: true, subscribers: subscribers.length }, 200, request);
    }

    if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (!secureCompare(secretHeader, env.TELEGRAM_WEBHOOK_SECRET)) {
        return responseJSON({ error: 'Unauthorized' }, 401, request);
      }

      const update = await request.json().catch(() => null);
      if (update && ctx && ctx.waitUntil) {
        ctx.waitUntil(handleWebhookUpdate(update, env));
      } else if (update) {
        await handleWebhookUpdate(update, env);
      }

      return new Response('OK', { status: 200 });
    }

    // Continuation of a fan-out too large for one subrequest budget. Only reachable
    // with the webhook secret, which never leaves the Worker.
    if (request.method === 'POST' && url.pathname === '/internal/fanout') {
      if (!secureCompare(request.headers.get('X-Relay-Internal'), env.TELEGRAM_WEBHOOK_SECRET)) {
        return new Response('Unauthorized', { status: 401 });
      }
      const job = await request.json().catch(() => null);
      if (!job || !Array.isArray(job.parts) || !Array.isArray(job.subscribers)) {
        return new Response('Bad Request', { status: 400 });
      }

      const depth = Number(job.depth) || 1;
      const batch = batchSizeFor(job.parts.length);
      const head = job.subscribers.slice(0, batch);
      const tail = job.subscribers.slice(batch);

      const result = await fanOut(env, job.parts, head);
      if (tail.length && ctx && ctx.waitUntil) {
        ctx.waitUntil(dispatchRemainder(request, env, job.parts, tail, depth + 1));
      }
      return responseJSON({ ok: true, recipients: result.recipients || 0, queued: tail.length }, 200);
    }

    if (request.method === 'POST' && url.pathname === '/submit') {
      // CORS only constrains browsers after the fact; enforce the allowlist here too
      // so another site's JavaScript cannot use this relay to spam the subscribers.
      const origin = request.headers.get('Origin');
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return responseJSON({ ok: false, error: 'Origine non autorisée.' }, 403, request);
      }

      const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
      if (contentLength > 262144) {
        return responseJSON({ ok: false, error: 'Taille de requête trop grande (max 256 KB).' }, 400, request);
      }

      const rawBody = await request.text();
      if (rawBody.length > 262144) {
        return responseJSON({ ok: false, error: 'Taille de requête trop grande (max 256 KB).' }, 400, request);
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return responseJSON({ ok: false, error: 'Format JSON invalide.' }, 400, request);
      }

      const { studentName, answers } = body;
      if (
        typeof studentName !== 'string' ||
        studentName.trim().length < 1 ||
        studentName.length > 120
      ) {
        return responseJSON({ ok: false, error: 'Nom de l\'étudiant invalide (1-120 caractères requis).' }, 400, request);
      }

      if (
        !Array.isArray(answers) ||
        answers.length < 1 ||
        answers.length > 200
      ) {
        return responseJSON({ ok: false, error: 'Liste de réponses invalide (1-200 éléments requis).' }, 400, request);
      }

      for (const item of answers) {
        if (!item || typeof item !== 'object') {
          return responseJSON({ ok: false, error: 'Structure de réponse invalide.' }, 400, request);
        }
        if (typeof item.question !== 'string' || typeof item.answer !== 'string') {
          return responseJSON({ ok: false, error: 'Les champs de question et réponse doivent être des chaînes de caractères.' }, 400, request);
        }
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
      const isAllowed = await checkRateLimit(env, clientIp);
      if (!isAllowed) {
        return responseJSON(
          { ok: false, error: 'Trop de soumissions depuis cette adresse IP. Veuillez réessayer plus tard.' },
          429,
          request
        );
      }

      const reportText = formatReport(body);
      const parts = splitForTelegram(reportText, 3900);

      const subscribers = await getAllSubscribers(env);
      const batch = batchSizeFor(parts.length);
      const head = subscribers.slice(0, batch);
      const tail = subscribers.slice(batch);

      const result = await fanOut(env, parts, head);
      if (tail.length && ctx && ctx.waitUntil) {
        ctx.waitUntil(dispatchRemainder(request, env, parts, tail, 1));
      }

      if (result.warning) {
        return responseJSON({
          ok: true,
          recipients: 0,
          parts: parts.length,
          warning: result.warning
        }, 200, request);
      }

      return responseJSON({
        ok: true,
        recipients: result.recipients,
        queued: tail.length,
        parts: parts.length
      }, 200, request);
    }

    if (request.method === 'POST' && (url.pathname === '/admin/login' || url.pathname === '/admin/save')) {
      // Same server-side origin enforcement as /submit.
      const origin = request.headers.get('Origin');
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return responseJSON({ ok: false, error: 'Origine non autorisée.' }, 403, request);
      }

      const rawBody = await request.text();
      if (rawBody.length > ADMIN_BODY_LIMIT) {
        return responseJSON({ ok: false, error: 'Requête trop volumineuse.' }, 400, request);
      }
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return responseJSON({ ok: false, error: 'Format JSON invalide.' }, 400, request);
      }

      const auth = await verifyAdmin(env, request, body.password);
      if (!auth.ok) {
        return responseJSON({ ok: false, error: auth.error }, auth.status, request);
      }

      if (url.pathname === '/admin/login') {
        return responseJSON({ ok: true }, 200, request);
      }

      // /admin/save
      if (typeof body.path !== 'string' || !ADMIN_PATH_RE.test(body.path)) {
        return responseJSON({ ok: false, error: 'Chemin de leçon non autorisé.' }, 400, request);
      }
      const shapeError = validateLessonShape(body.lesson);
      if (shapeError) {
        return responseJSON({ ok: false, error: `Contenu invalide : ${shapeError}.` }, 400, request);
      }

      const serialized = JSON.stringify(body.lesson, null, 2) + '\n';
      const base64 = b64EncodeUtf8(serialized);
      const message = `Admin edit: ${body.path} (éditeur du site)`;

      const commits = [];
      for (const target of CONTENT_TARGETS) {
        const result = await commitFile(env, target.branch, target.prefix + body.path, base64, message);
        if (!result.ok) {
          return responseJSON({
            ok: false,
            error: `Échec de publication : ${result.error}.`,
            commits, // whatever already landed, so a partial state is visible
          }, 502, request);
        }
        commits.push({ branch: target.branch, sha: result.sha });
      }

      // GitHub Pages sometimes skips the automatic build after an API push —
      // nudge it explicitly, best-effort.
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(
          githubApi(env, 'POST', `/repos/${GITHUB_REPO}/pages/builds`).catch(() => {})
        );
      }

      return responseJSON({ ok: true, commits }, 200, request);
    }

    return responseJSON({ error: 'Not Found' }, 404, request);
  }
};
