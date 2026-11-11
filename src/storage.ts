const DB_NAME = 'mindcraft'
const DB_VERSION = 1
let writeQueue: Promise<void> = Promise.resolve()

export type SyncConfig = { url: string; token: string }
export type Tombstone = { kind: 'card' | 'collection'; id: string; updatedAt: string; deleted: true }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('collections')) db.createObjectStore('collections', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}

export async function loadLibrary<Card extends { id: string }, Collection extends { id: string }>() {
  const db = await openDb()
  const transaction = db.transaction(['cards', 'collections', 'meta'], 'readonly')
  const [cards, collections, initialized, tombstones, lastSync, syncConfig] = await Promise.all([
    requestValue(transaction.objectStore('cards').getAll()) as Promise<Card[]>,
    requestValue(transaction.objectStore('collections').getAll()) as Promise<Collection[]>,
    requestValue(transaction.objectStore('meta').get('initialized')) as Promise<boolean | undefined>,
    requestValue(transaction.objectStore('meta').get('tombstones')) as Promise<Tombstone[] | undefined>,
    requestValue(transaction.objectStore('meta').get('lastSync')) as Promise<string | undefined>,
    requestValue(transaction.objectStore('meta').get('syncConfig')) as Promise<SyncConfig | undefined>,
  ])
  db.close()
  return { cards, collections, initialized: Boolean(initialized), tombstones: tombstones ?? [], lastSync: lastSync ?? '1970-01-01T00:00:00.000Z', syncConfig: syncConfig ?? { url: '', token: '' } }
}

export async function persistLibrary<Card extends { id: string }, Collection extends { id: string }>(cards: Card[], collections: Collection[], meta: { tombstones: Tombstone[]; lastSync: string; syncConfig: SyncConfig }) {
  // Effects can fire in rapid succession. Queue them so an older snapshot
  // cannot finish after a newer one and erase a just-created card.
  const write = writeQueue.then(async () => {
    const db = await openDb()
    try {
      const transaction = db.transaction(['cards', 'collections', 'meta'], 'readwrite')
      const cardStore = transaction.objectStore('cards')
      const collectionStore = transaction.objectStore('collections')
      cardStore.clear(); collectionStore.clear()
      cards.forEach((card) => cardStore.put(card))
      collections.forEach((collection) => collectionStore.put(collection))
      const metaStore = transaction.objectStore('meta')
      metaStore.put(true, 'initialized')
      metaStore.put(meta.tombstones, 'tombstones')
      metaStore.put(meta.lastSync, 'lastSync')
      metaStore.put(meta.syncConfig, 'syncConfig')
      await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error ?? new Error('Could not save library')) })
    } finally {
      db.close()
    }
  })
  // Keep the queue usable after an error, while returning the real result to
  // the caller so the UI can tell the user that storage failed.
  writeQueue = write.catch(() => undefined)
  return write
}
