import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(':memory:')
db.exec(`
  CREATE TABLE records (kind TEXT, id TEXT, payload TEXT, updated_at TEXT, deleted INTEGER, PRIMARY KEY(kind, id));
  CREATE VIRTUAL TABLE records_fts USING fts5(id UNINDEXED, title, body, tags, url, tokenize = 'porter unicode61');
`)

const put = db.prepare(`INSERT INTO records VALUES (?, ?, ?, ?, ?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at, deleted=excluded.deleted WHERE excluded.updated_at > records.updated_at`)
put.run('card', 'c1', '{"title":"first"}', '2026-01-01T00:00:00.000Z', 0)
put.run('card', 'c1', '{"title":"stale"}', '2025-12-31T00:00:00.000Z', 0)
put.run('card', 'c1', '{"title":"Dieter Rams principles"}', '2026-01-02T00:00:00.000Z', 0)

const result = db.prepare('SELECT payload FROM records WHERE kind = ? AND id = ?').get('card', 'c1')
if (result.payload !== '{"title":"Dieter Rams principles"}') throw new Error('Last-write-wins conflict handling failed')

// Test FTS5 indexing & search
db.prepare('INSERT INTO records_fts(id, title, body, tags, url) VALUES (?, ?, ?, ?, ?)').run('c1', 'Dieter Rams principles', 'minimalist typography and industrial design', 'design minimal', 'https://example.com/dieter')

const ftsSearch = db.prepare(`
  SELECT r.payload, bm25(records_fts) as rank
  FROM records_fts f
  JOIN records r ON r.kind = 'card' AND r.id = f.id AND r.deleted = 0
  WHERE records_fts MATCH ?
  ORDER BY rank ASC
`).all('minimalist*')

if (!ftsSearch.length || !ftsSearch[0].payload.includes('Dieter Rams')) {
  throw new Error('FTS5 search failed')
}

console.log('Sync persistence and FTS5 search self-tests passed!')
