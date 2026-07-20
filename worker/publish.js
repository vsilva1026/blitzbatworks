/**
 * Blitz Bat Publish Worker
 *
 * Receives publish requests from playground.html, verifies a shared passphrase,
 * then commits site.json + uploaded images to GitHub on Eli's behalf.
 *
 * Env vars (set in Cloudflare dashboard):
 *   - GITHUB_TOKEN    (secret) — GitHub PAT with repo write access
 *   - PUBLISH_PASSPHRASE (secret) — shared password Eli types in the playground
 *   - REPO            (plain)  — e.g. "vsilva1026/blitzbatworks"
 *   - BRANCH          (plain)  — e.g. "main"
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function gh(path, opts, env) {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${env.REPO}${path}`, {
    ...opts,
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'blitz-bat-publish',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(opts && opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function b64utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function handlePublish(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.passphrase || body.passphrase !== env.PUBLISH_PASSPHRASE) {
    return json({ error: 'Wrong passphrase.' }, 401);
  }
  if (!body.content) {
    return json({ error: 'Missing content field' }, 400);
  }

  const branch = env.GIT_BRANCH || env.BRANCH || 'main';
  const uploaded = [];

  // Upload images (each: { path, base64 })
  if (Array.isArray(body.images)) {
    for (const img of body.images) {
      if (!img.path || !img.base64) continue;
      // Skip upload if already exists (SHA-based deduplication done client-side)
      let exists = false;
      try {
        await gh(`/contents/${encodeURI(img.path)}?ref=${encodeURIComponent(branch)}`, {}, env);
        exists = true;
      } catch {}
      if (!exists) {
        await gh(`/contents/${encodeURI(img.path)}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `Upload ${img.path}`,
            content: img.base64,
            branch,
          }),
        }, env);
      }
      uploaded.push(img.path);
    }
  }

  // Commit site.json
  let sha;
  try {
    const existing = await gh(`/contents/content/site.json?ref=${encodeURIComponent(branch)}`, {}, env);
    sha = existing.sha;
  } catch {}

  await gh(`/contents/content/site.json`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Update site (via Playground)',
      content: b64utf8(body.content),
      branch,
      sha,
    }),
  }, env);

  return json({ ok: true, uploaded });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalizeEnv(env) {
  const normalized = {};
  for (const k of Object.keys(env)) {
    normalized[k.trim()] = typeof env[k] === 'string' ? env[k].trim() : env[k];
  }
  return normalized;
}

export default {
  async fetch(request, rawEnv) {
    const env = normalizeEnv(rawEnv);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    if (url.pathname === '/api/publish' && request.method === 'POST') {
      try {
        return await handlePublish(request, env);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }
    if (url.pathname === '/api/ping') {
      return json({ ok: true, service: 'blitz-bat-publish' });
    }
    if (url.pathname === '/api/debug') {
      const t = env.GH_TOKEN || env.GITHUB_TOKEN || '';
      return json({
        token_present: !!t,
        token_length: t.length,
        token_prefix: t.slice(0, 4),
        token_source: env.GH_TOKEN ? 'GH_TOKEN' : (env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : null),
        repo: env.REPO || null,
        branch_via_BRANCH: env.BRANCH || null,
        branch_via_GIT_BRANCH: env.GIT_BRANCH || null,
        passphrase_present: !!env.PUBLISH_PASSPHRASE,
        env_keys: Object.keys(env),
      });
    }
    return new Response('Not found', { status: 404, headers: CORS });
  },
};
