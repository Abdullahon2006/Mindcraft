import { createServer } from 'node:http'
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, resolve, extname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { timingSafeEqual, createHash } from 'node:crypto'

const port = Number(process.env.PORT ?? 8787)
const dbPath = resolve(process.env.MINDCRAFT_DB ?? './data/mindcraft.sqlite')
const vaultDir = resolve(process.env.MINDCRAFT_VAULT ?? './data/vault')
const cacheDir = resolve(process.env.MINDCRAFT_CACHE ?? './data/cache')
const distDir = resolve('./dist')
const token = process.env.MINDCRAFT_SYNC_TOKEN

if (!token || token.length < 16) {
  console.error('Set MINDCRAFT_SYNC_TOKEN to a private value of at least 16 characters.')
  process.exit(1)
}

mkdirSync(dirname(dbPath), { recursive: true })
mkdirSync(vaultDir, { recursive: true })
mkdirSync(cacheDir, { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS records (
    kind TEXT NOT NULL CHECK(kind IN ('card', 'collection')),
    id TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (kind, id)
  );
  CREATE INDEX IF NOT EXISTS records_updated_at ON records(updated_at);

  CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
    id UNINDEXED,
    title,
    body,
    tags,
    url,
    tokenize = 'porter unicode61'
  );
`)

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
    ...headers,
  })
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

function authorized(request) {
  const value = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  if (!value) {
    const remote = request.socket?.remoteAddress ?? ''
    if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) {
      return true
    }
  }
  const expected = Buffer.from(token)
  const received = Buffer.from(value)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

async function parseJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 25_000_000) throw new Error('Request body is too large')
  }
  return raw ? JSON.parse(raw) : {}
}

function isRecord(value) {
  return value && (value.kind === 'card' || value.kind === 'collection') && typeof value.id === 'string' && typeof value.updatedAt === 'string' && typeof value.deleted === 'boolean'
}

function updateFts(cardId, data, deleted) {
  try {
    db.prepare('DELETE FROM records_fts WHERE id = ?').run(cardId)
    if (!deleted && data) {
      const title = data.title ?? ''
      const body = `${data.body ?? ''} ${data.articleText ?? ''} ${data.author ?? ''}`
      const tags = Array.isArray(data.tags) ? data.tags.join(' ') : ''
      const url = data.url ?? ''
      db.prepare('INSERT INTO records_fts(id, title, body, tags, url) VALUES (?, ?, ?, ?, ?)').run(cardId, title, body, tags, url)
    }
  } catch (err) {
    console.error('FTS update error:', err)
  }
}

function changedSince(since) {
  return db.prepare('SELECT kind, id, payload, updated_at AS updatedAt, deleted FROM records WHERE updated_at > ? ORDER BY updated_at ASC').all(since)
    .map((row) => ({ kind: row.kind, id: row.id, data: JSON.parse(row.payload), updatedAt: row.updatedAt, deleted: Boolean(row.deleted) }))
}

const upsert = db.prepare(`
  INSERT INTO records(kind, id, payload, updated_at, deleted) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(kind, id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, deleted = excluded.deleted
  WHERE excluded.updated_at > records.updated_at
`)

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  // Public health check
  if (request.method === 'GET' && url.pathname === '/v1/health') {
    return send(response, 200, { ok: true, service: 'mindcraft-sync', fts: true, version: '0.2.0' })
  }

  // Local bootstrap config
  if (request.method === 'GET' && url.pathname === '/v1/config') {
    const remote = request.socket?.remoteAddress ?? ''
    const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
    if (isLoopback || authorized(request)) {
      return send(response, 200, { ok: true, syncUrl: `http://127.0.0.1:${port}`, token })
    }
    return send(response, 401, { ok: false, error: 'Unauthorized' })
  }

  // Serve media vault files
  if (request.method === 'GET' && url.pathname.startsWith('/v1/media/')) {
    const filename = url.pathname.replace(/^\/v1\/media\//, '').replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = join(vaultDir, filename)
    if (!existsSync(filePath)) return send(response, 404, { ok: false, error: 'File not found' })
    const ext = extname(filePath).toLowerCase()
    const contentType = mimeTypes[ext] ?? 'application/octet-stream'
    return send(response, 200, readFileSync(filePath), { 'content-type': contentType, 'cache-control': 'public, max-age=31536000' })
  }

  // Cached image proxy to bypass CORS / hotlinking
  if (request.method === 'GET' && url.pathname === '/v1/proxy-image') {
    const targetUrl = url.searchParams.get('url')
    if (!targetUrl) return send(response, 400, { ok: false, error: 'Missing url query param' })
    try {
      const hash = createHash('sha256').update(targetUrl).digest('hex')
      const cachedFile = join(cacheDir, `${hash}.bin`)
      const metaFile = join(cacheDir, `${hash}.json`)
      if (existsSync(cachedFile) && existsSync(metaFile)) {
        const meta = JSON.parse(readFileSync(metaFile, 'utf8'))
        return send(response, 200, readFileSync(cachedFile), { 'content-type': meta.contentType, 'cache-control': 'public, max-age=86400' })
      }
      const fetchRes = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      })
      if (!fetchRes.ok) return send(response, 502, { ok: false, error: 'Failed to fetch image' })
      const buffer = Buffer.from(await fetchRes.arrayBuffer())
      const contentType = fetchRes.headers.get('content-type') || 'image/jpeg'
      writeFileSync(cachedFile, buffer)
      writeFileSync(metaFile, JSON.stringify({ contentType, url: targetUrl }))
      return send(response, 200, buffer, { 'content-type': contentType, 'cache-control': 'public, max-age=86400' })
    } catch (err) {
      return send(response, 500, { ok: false, error: err instanceof Error ? err.message : 'Proxy failed' })
    }
  }

  // API endpoints requiring authorization
  if (url.pathname.startsWith('/v1/')) {
    if (!authorized(request)) return send(response, 401, { ok: false, error: 'Unauthorized' })

    try {
      // 1-Click Fast Capture endpoint
      if (request.method === 'POST' && url.pathname === '/v1/capture') {
        const data = await parseJson(request)
        const now = new Date().toISOString()
        const id = data.id || `mc_${createHash('sha256').update(now + Math.random()).digest('hex').slice(0, 16)}`
        
        const card = {
          id,
          title: data.title?.trim() || 'Untitled find',
          body: data.body?.trim() || data.selectedText?.trim() || '',
          url: data.url?.trim() || '',
          source: data.source || (data.url ? (() => { try { return new URL(data.url).hostname.replace(/^www\./, '') } catch { return 'Web' } })() : 'MindCraft'),
          kind: data.kind || (data.colorHex ? 'color' : data.image ? 'image' : data.articleText ? 'article' : data.selectedText ? 'quote' : data.url ? 'link' : 'note'),
          collection: data.collection?.trim() || 'Inbox',
          tags: Array.isArray(data.tags) ? data.tags : [],
          accent: data.accent || 'blue',
          image: data.image || undefined,
          favorite: Boolean(data.favorite),
          createdAt: now,
          updatedAt: now,
          author: data.author || undefined,
          readTime: data.readTime || undefined,
          colorHex: data.colorHex || undefined,
          fullHtml: data.fullHtml || undefined,
          articleText: data.articleText || undefined,
          favicon: data.favicon || undefined,
        }

        upsert.run('card', id, JSON.stringify(card), now, 0)
        updateFts(id, card, false)

        return send(response, 200, { ok: true, card })
      }

      // High-speed FTS5 search
      if (request.method === 'GET' && url.pathname === '/v1/search') {
        const q = url.searchParams.get('q')?.trim()
        if (!q) return send(response, 200, { ok: true, results: [] })
        
        const tokens = q.replace(/[^a-zA-Z0-9_\u00C0-\u017F\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
        if (!tokens.length) return send(response, 200, { ok: true, results: [] })
        const matchQuery = tokens.map((token) => `"${token}"*`).join(' AND ')

        const rows = db.prepare(`
          SELECT r.payload, bm25(records_fts) as rank
          FROM records_fts f
          JOIN records r ON r.kind = 'card' AND r.id = f.id AND r.deleted = 0
          WHERE records_fts MATCH ?
          ORDER BY rank ASC
          LIMIT 50
        `).all(matchQuery)

        const results = rows.map((row) => JSON.parse(row.payload))
        return send(response, 200, { ok: true, count: results.length, results })
      }

      // Standard sync protocol
      if (request.method === 'GET' && url.pathname === '/v1/sync') {
        const since = url.searchParams.get('since') ?? '1970-01-01T00:00:00.000Z'
        return send(response, 200, { ok: true, serverTime: new Date().toISOString(), changes: changedSince(since) })
      }

      if (request.method === 'POST' && url.pathname === '/v1/sync') {
        const payload = await parseJson(request)
        const changes = Array.isArray(payload.changes) ? payload.changes : []
        if (changes.length > 500) return send(response, 413, { ok: false, error: 'Send at most 500 changes at a time' })
        for (const record of changes) {
          if (!isRecord(record)) return send(response, 400, { ok: false, error: 'Invalid change record' })
          const updated = new Date(record.updatedAt)
          if (Number.isNaN(updated.getTime())) return send(response, 400, { ok: false, error: 'Invalid updatedAt timestamp' })
          upsert.run(record.kind, record.id, JSON.stringify(record.data ?? {}), updated.toISOString(), record.deleted ? 1 : 0)
          if (record.kind === 'card') {
            updateFts(record.id, record.data, record.deleted)
          }
        }
        const since = typeof payload.since === 'string' ? payload.since : '1970-01-01T00:00:00.000Z'
        return send(response, 200, { ok: true, serverTime: new Date().toISOString(), changes: changedSince(since) })
      }

      return send(response, 404, { ok: false, error: 'Not found' })
    } catch (error) {
      console.error(error)
      return send(response, 400, { ok: false, error: error instanceof Error ? error.message : 'Bad request' })
    }
  }

  // Serve Built Frontend (SPA)
  if (request.method === 'GET' || request.method === 'HEAD') {
    const rawPath = url.pathname === '/' ? '/index.html' : url.pathname
    const safePath = join(distDir, rawPath.replace(/(\.\.[\/\\])+/g, ''))
    
    if (existsSync(safePath) && statSync(safePath).isFile()) {
      const ext = extname(safePath).toLowerCase()
      const contentType = mimeTypes[ext] ?? 'application/octet-stream'
      const headers = { 'content-type': contentType }
      if (ext !== '.html') {
        headers['cache-control'] = 'public, max-age=31536000, immutable'
      }
      return send(response, 200, readFileSync(safePath), headers)
    }

    // SPA fallback to index.html
    const indexPath = join(distDir, 'index.html')
    if (existsSync(indexPath)) {
      return send(response, 200, readFileSync(indexPath), { 'content-type': 'text/html; charset=utf-8' })
    }
  }

  return send(response, 404, { ok: false, error: 'Not found' })
})

server.listen(port, '0.0.0.0', () => console.log(`MindCraft Sync listening on http://0.0.0.0:${port}`))
