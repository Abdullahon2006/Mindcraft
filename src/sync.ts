import type { SyncConfig, Tombstone } from './storage'

export type RemoteChange<T> = { kind: 'card' | 'collection'; id: string; data: T; updatedAt: string; deleted: boolean }
type SyncResponse<T> = { ok: true; serverTime: string; changes: RemoteChange<T>[] } | { ok: false; error?: string }

export async function syncWithServer<T extends { id: string; updatedAt: string }>(config: SyncConfig, since: string, cards: T[], collections: T[], tombstones: Tombstone[]) {
  if (!config.url) throw new Error('Add a sync server URL first.')
  const changes: RemoteChange<T>[] = [
    ...cards.filter((card) => card.updatedAt > since).map((card) => ({ kind: 'card' as const, id: card.id, data: card, updatedAt: card.updatedAt, deleted: false })),
    ...collections.filter((collection) => collection.updatedAt > since).map((collection) => ({ kind: 'collection' as const, id: collection.id, data: collection, updatedAt: collection.updatedAt, deleted: false })),
    ...tombstones.filter((record) => record.updatedAt > since).map((record) => ({ kind: record.kind, id: record.id, data: {} as T, updatedAt: record.updatedAt, deleted: true })),
  ]
  if (changes.length > 500) throw new Error('Sync the library in smaller batches: this server accepts up to 500 changed records at a time.')
  const response = await fetch(`${config.url.replace(/\/$/, '')}/v1/sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.token ? { authorization: `Bearer ${config.token}` } : {})
    },
    body: JSON.stringify({ since, changes }),
  })
  const payload = await response.json() as SyncResponse<T>
  if (!response.ok || !payload.ok) throw new Error('error' in payload ? payload.error ?? 'Sync failed' : 'Sync failed')
  return payload
}
