import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Aperture, ArchiveRestore, ArrowDownToLine, ArrowUpRight, Bookmark, BookOpen,
  Check, Cloud, Command, Copy, ExternalLink, FileImage, FileText, FolderPlus,
  Image, Layers, Link2, Moon, Palette, Pencil, Plus, Quote, RefreshCw, Search,
  Settings2, Sparkles, Sun, Trash2, Upload, X
} from 'lucide-react'
import { loadLibrary, persistLibrary, type SyncConfig, type Tombstone } from './storage'
import { syncWithServer } from './sync'
import { createId } from './id'

export type CardKind = 'note' | 'link' | 'image' | 'quote' | 'article' | 'color'
export type Accent = 'moss' | 'lilac' | 'sun' | 'coral' | 'blue'

export type Card = {
  id: string
  title: string
  body: string
  url: string
  source: string
  kind: CardKind
  collection: string
  tags: string[]
  accent: Accent
  image?: string
  favorite: boolean
  createdAt: string
  updatedAt: string
  // mymind rich attributes
  author?: string
  readTime?: string
  colorHex?: string
  fullHtml?: string
  articleText?: string
  favicon?: string
}

export type Collection = { id: string; name: string; color: string; updatedAt: string }
export type View = 'all' | 'favorites' | 'articles' | 'quotes' | 'images' | string

const STORE = 'mindcraft-library-v1'
const COLLECTION_STORE = 'mindcraft-collections-v1'
const THEME_STORE = 'mindcraft-theme-v1'
const accents: Accent[] = ['moss', 'lilac', 'sun', 'coral', 'blue']

const defaultCollections: Collection[] = [
  { id: 'ideas', name: 'Ideas worth making', color: '#4f9f77', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'read', name: 'Read slowly', color: '#7392d2', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'design', name: 'Design & Visuals', color: '#dc9f54', updatedAt: '2026-01-01T00:00:00.000Z' },
]

const initialCards: Card[] = [
  {
    id: 'seed-quote-1',
    title: 'Dieter Rams on Good Design',
    body: 'Good design is as little design as possible. Less, but better – because it concentrates on the essential aspects, and the products are not burdened with non-essentials.',
    url: 'https://vitsoe.com/us/about/good-design',
    source: 'vitsoe.com',
    kind: 'quote',
    collection: 'Design & Visuals',
    tags: ['design', 'principles', 'minimalism'],
    accent: 'moss',
    favorite: true,
    author: 'Dieter Rams',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'seed-color-1',
    title: 'Nordic Deep Cobalt',
    body: 'Primary brand accent for tranquil workspaces and midnight visual recall.',
    url: '',
    source: 'Palette',
    kind: 'color',
    collection: 'Design & Visuals',
    tags: ['color', 'palette', 'swatch'],
    colorHex: '#3458DB',
    accent: 'blue',
    favorite: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'seed-article-1',
    title: 'The Architecture of Personal Memory',
    body: 'Why modern thinkers are abandoning rigid hierarchical folders in favor of associative visual archives. When capture friction drops to zero, the brain retains spatial awareness.',
    url: 'https://example.com/architecture-of-memory',
    source: 'archival.review',
    kind: 'article',
    collection: 'Read slowly',
    tags: ['memory', 'thinking', 'tools-for-thought'],
    accent: 'lilac',
    favorite: false,
    author: 'Elena Vance',
    readTime: '4 min read',
    articleText: `The file cabinet was invented for clerks in the late 19th century. Yet for over forty years of personal computing, we forced our non-linear thoughts into identical nested desktop folders.\n\nWhen you read an article or see a chair, your mind does not assign it to /Documents/Work/Research/2026/Drafts/. Your mind remembers a feeling: 'that warm mustard chair with oak armrests' or 'that quote about typography from last spring.'\n\nBy uniting visual recall, full article extraction, and zero-overhead local indexing, personal libraries like MindCraft restore our natural cognitive instincts. You capture the spark effortlessly; the system keeps the thread.`,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'seed-note-1',
    title: 'Local-First Manifesto',
    body: 'No account requirement, no tracking pixels, zero subscription lock-in. Everything resides in SQLite and browser storage, backed up on your own machine.',
    url: '',
    source: 'Personal note',
    kind: 'note',
    collection: 'Ideas worth making',
    tags: ['local-first', 'privacy', 'architecture'],
    accent: 'sun',
    favorite: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}

function dateLabel(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(date))
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function titleFromUrl(url: string) {
  try {
    const path = new URL(url).pathname.split('/').filter(Boolean).pop()
    return path ? decodeURIComponent(path).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : `A find from ${host(url)}`
  } catch { return 'Untitled link' }
}

function iconFor(kind: CardKind, size = 16) {
  switch (kind) {
    case 'quote': return <Quote size={size} />
    case 'article': return <BookOpen size={size} />
    case 'image': return <Image size={size} />
    case 'color': return <Palette size={size} />
    case 'link': return <Link2 size={size} />
    case 'note':
    default: return <FileText size={size} />
  }
}

function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [tombstones, setTombstones] = useState<Tombstone[]>([])
  const [lastSync, setLastSync] = useState('1970-01-01T00:00:00.000Z')
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ url: 'http://127.0.0.1:8787', token: '' })
  const [hydrated, setHydrated] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | CardKind>('all')
  const [composerOpen, setComposerOpen] = useState(false)
  const [selected, setSelected] = useState<Card | null>(null)
  const [readingCard, setReadingCard] = useState<Card | null>(null)
  const [wanderOpen, setWanderOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readStored(THEME_STORE, 'light'))
  const [collectionDialog, setCollectionDialog] = useState(false)
  const [syncDialog, setSyncDialog] = useState(false)
  const [notice, setNotice] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadLibrary<Card, Collection>().then((saved) => {
      if (saved.initialized && saved.cards.length > 0) {
        setCards(saved.cards)
        setCollections(saved.collections.map((col) => ({ ...col, updatedAt: col.updatedAt ?? new Date().toISOString() })))
        setTombstones(saved.tombstones)
        setLastSync(saved.lastSync)
        setSyncConfig(saved.syncConfig.url ? saved.syncConfig : { url: 'http://127.0.0.1:8787', token: '' })
      } else {
        setCards(readStored(STORE, initialCards))
        setCollections(readStored<Collection[]>(COLLECTION_STORE, defaultCollections))
      }
      setHydrated(true)
    }).catch(() => {
      setCards(initialCards)
      setCollections(defaultCollections)
      setHydrated(true)
      setNotice('Running in browser sandbox mode')
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    let active = true
    void persistLibrary(cards, collections, { tombstones, lastSync, syncConfig }).catch(() => {
      if (active) setNotice('Local persistence warning: storage limit reached')
    })
    return () => { active = false }
  }, [cards, collections, tombstones, lastSync, syncConfig, hydrated])

  useEffect(() => {
    localStorage.setItem(THEME_STORE, JSON.stringify(theme))
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setComposerOpen(true)
      }
      if (event.key === 'Escape') {
        setComposerOpen(false)
        setSelected(null)
        setReadingCard(null)
        setWanderOpen(false)
        setCollectionDialog(false)
        setSyncDialog(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  // Auto-sync whenever user returns to window (e.g. after using browser extension)
  useEffect(() => {
    if (!hydrated || !syncConfig.url) return
    const pullCaptures = () => { void synchronize() }
    window.addEventListener('focus', pullCaptures)
    return () => window.removeEventListener('focus', pullCaptures)
  }, [cards, collections, hydrated, lastSync, syncConfig, tombstones])

  // Omnibar Natural Syntax + BM25-like search
  const filtered = useMemo(() => {
    let rawQuery = query.trim()
    let filterKind = kindFilter

    // Parse syntax queries like "type:article" or "type:quote"
    const typeMatch = rawQuery.match(/\btype:(article|quote|image|note|color|link)\b/i)
    if (typeMatch) {
      filterKind = typeMatch[1].toLowerCase() as CardKind
      rawQuery = rawQuery.replace(typeMatch[0], '').trim()
    }

    const isFavOnly = view === 'favorites' || /\bfav:true\b/i.test(rawQuery)
    if (/\bfav:true\b/i.test(rawQuery)) {
      rawQuery = rawQuery.replace(/\bfav:true\b/i, '').trim()
    }

    const terms = rawQuery.toLowerCase().split(/\s+/).filter(Boolean)

    return cards.filter((card) => {
      const inView = view === 'all' || view === 'favorites' ? true : card.collection === view
      const inFav = isFavOnly ? card.favorite : true
      const inKind = filterKind === 'all' || card.kind === filterKind
      if (!inView || !inFav || !inKind) return false

      if (!terms.length) return true
      const haystack = `${card.title} ${card.body} ${card.source} ${card.author ?? ''} ${card.articleText ?? ''} ${card.collection} ${card.tags.join(' ')}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }, [cards, kindFilter, query, view])

  const viewTitle = view === 'all' ? 'All cards' : view === 'favorites' ? 'Favorites' : view
  const randomCard = cards[Math.floor(Math.random() * cards.length)]

  function addCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'accent'>) {
    const now = new Date().toISOString()
    const newCard: Card = {
      ...card,
      id: createId(),
      accent: accents[cards.length % accents.length],
      createdAt: now,
      updatedAt: now,
    }
    setCards((current) => [newCard, ...current])
    setComposerOpen(false)
    setNotice('Saved to your MindCraft library')
  }

  function updateCard(next: Card) {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    setCards((current) => current.map((c) => c.id === updated.id ? updated : c))
    setSelected(updated)
    setNotice('Card updated')
  }

  function removeCard(id: string) {
    setCards((current) => current.filter((c) => c.id !== id))
    setTombstones((current) => [
      ...current.filter((rec) => !(rec.kind === 'card' && rec.id === id)),
      { kind: 'card', id, updatedAt: new Date().toISOString(), deleted: true }
    ])
    setSelected(null)
    setReadingCard(null)
    setNotice('Card deleted')
  }

  function toggleFavorite(id: string) {
    setCards((current) => current.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c))
    setSelected((current) => current?.id === id ? { ...current, favorite: !current.favorite } : current)
  }

  function addCollection(name: string, color: string) {
    const clean = name.trim()
    if (!clean || collections.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return
    setCollections((current) => [...current, { id: createId(), name: clean, color, updatedAt: new Date().toISOString() }])
    setCollectionDialog(false)
    setView(clean)
    setNotice(`Created collection #${clean}`)
  }

  function exportLibrary() {
    const payload = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards, collections }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mindcraft-library-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Library backup exported')
  }

  function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as { cards?: Card[]; collections?: Collection[] }
        if (!Array.isArray(payload.cards) || !Array.isArray(payload.collections)) throw new Error('Invalid backup file')
        setCards(payload.cards)
        setCollections(payload.collections.map((item) => ({ ...item, updatedAt: item.updatedAt ?? new Date().toISOString() })))
        setTombstones([])
        setNotice('Library successfully restored')
      } catch {
        setNotice('Invalid MindCraft backup file')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function synchronize(config = syncConfig) {
    if (!config.url) return
    setSyncing(true)
    try {
      const result = await syncWithServer<Card | Collection>(config, lastSync, cards, collections, tombstones)
      const nextCards = new Map(cards.map((card) => [card.id, card]))
      const nextCollections = new Map(collections.map((col) => [col.id, col]))

      for (const change of result.changes) {
        if (change.kind === 'card') {
          const existing = nextCards.get(change.id)
          if (change.deleted) {
            if (!existing || change.updatedAt >= existing.updatedAt) nextCards.delete(change.id)
          } else if (!existing || change.updatedAt > existing.updatedAt) {
            nextCards.set(change.id, change.data as Card)
          }
        } else {
          const existing = nextCollections.get(change.id)
          if (change.deleted) {
            if (!existing || change.updatedAt >= existing.updatedAt) nextCollections.delete(change.id)
          } else if (!existing || change.updatedAt > existing.updatedAt) {
            nextCollections.set(change.id, change.data as Collection)
          }
        }
      }

      setCards([...nextCards.values()])
      setCollections([...nextCollections.values()])
      setTombstones([])
      setLastSync(result.serverTime)
      setNotice('Synced with local server')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Sync check failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="app-shell">
      {/* Top Header / Bar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-orbit"><span /></span>
          <span>MindCraft</span>
        </div>

        <button className="capture-button" onClick={() => setComposerOpen(true)}>
          <Plus size={16} /> Capture <kbd>⌘N</kbd>
        </button>

        <nav className="main-nav" aria-label="Library views">
          <button className={view === 'all' ? 'nav-button active' : 'nav-button'} onClick={() => setView('all')}>
            <ArchiveRestore size={16} /> All <span>{cards.length}</span>
          </button>
          <button className={view === 'favorites' ? 'nav-button active' : 'nav-button'} onClick={() => setView('favorites')}>
            <Bookmark size={16} /> Favorites <span>{cards.filter((c) => c.favorite).length}</span>
          </button>
          <button className="nav-button" onClick={() => setWanderOpen(true)}>
            <Aperture size={16} /> Wander
          </button>
        </nav>

        <div className="collection-nav" aria-label="Collections">
          {collections.map((col) => (
            <button
              key={col.id}
              className={view === col.name ? 'nav-button active' : 'nav-button'}
              onClick={() => setView(col.name)}
            >
              <i style={{ background: col.color }} />
              {col.name}
            </button>
          ))}
          <button className="nav-button add-col-btn" onClick={() => setCollectionDialog(true)} title="Add collection">
            <Plus size={14} />
          </button>
        </div>

        <div className="sidebar-bottom">
          <button onClick={exportLibrary} title="Export library JSON"><ArrowDownToLine size={15} /> Export</button>
          <button onClick={() => importRef.current?.click()} title="Import backup"><Upload size={15} /> Import</button>
          <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={importLibrary} />
        </div>
      </aside>

      <main className="workspace">
        {/* Omnibar / Command Header */}
        <header className="topbar">
          <div className="toolbar">
            <label className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ideas, quotes, articles, or type:quote…"
              />
              <kbd><Command size={11} />K</kbd>
            </label>

            <button
              className="icon-button"
              aria-label={`Toggle theme`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title="Toggle dark/light mode"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <button
              className={syncConfig.url ? 'sync-button connected' : 'sync-button'}
              onClick={() => syncConfig.url ? void synchronize() : setSyncDialog(true)}
              disabled={syncing}
              title="Sync with local server"
            >
              <Cloud size={15} /> {syncing ? 'Syncing…' : 'Sync'}
            </button>

            <button className="icon-button" aria-label="Sync Settings" onClick={() => setSyncDialog(true)}>
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <section className="content">
          {/* Filter Pills */}
          <div className="library-head">
            <div>
              <h2>{viewTitle}</h2>
              <p>{filtered.length} {filtered.length === 1 ? 'item' : 'items'} in mind</p>
            </div>
            <div className="kind-filters" aria-label="Filter content type">
              {(['all', 'article', 'quote', 'image', 'color', 'note', 'link'] as const).map((k) => (
                <button
                  key={k}
                  className={kindFilter === k ? 'selected' : ''}
                  onClick={() => setKindFilter(k as any)}
                >
                  {k === 'all' ? 'Everything' : <>{iconFor(k, 13)} {k.charAt(0).toUpperCase() + k.slice(1)}s</>}
                </button>
              ))}
            </div>
          </div>

          {/* mymind-Style Masonry Grid */}
          {filtered.length ? (
            <div className="masonry-grid">
              {filtered.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  onOpen={() => setSelected(card)}
                  onRead={() => setReadingCard(card)}
                  onFavorite={() => toggleFavorite(card.id)}
                  onCopyColor={() => {
                    if (card.colorHex) {
                      navigator.clipboard.writeText(card.colorHex)
                      setNotice(`Copied ${card.colorHex} to clipboard`)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={32} />
              <h2>No memories found</h2>
              <p>Try searching for a different concept, or capture a new idea.</p>
              <button onClick={() => setComposerOpen(true)}>Capture a thought</button>
            </div>
          )}
        </section>
      </main>

      {/* Overlays & Modals */}
      {composerOpen && (
        <Composer collections={collections} onClose={() => setComposerOpen(false)} onSave={addCard} />
      )}
      {selected && (
        <Detail
          card={selected}
          collections={collections}
          onClose={() => setSelected(null)}
          onSave={updateCard}
          onDelete={() => removeCard(selected.id)}
          onFavorite={() => toggleFavorite(selected.id)}
          onRead={() => { setSelected(null); setReadingCard(selected) }}
        />
      )}
      {readingCard && (
        <ReaderModal card={readingCard} onClose={() => setReadingCard(null)} />
      )}
      {wanderOpen && randomCard && (
        <Wander
          card={randomCard}
          onClose={() => setWanderOpen(false)}
          onOpen={() => { setWanderOpen(false); setSelected(randomCard) }}
        />
      )}
      {collectionDialog && (
        <CollectionComposer onClose={() => setCollectionDialog(false)} onSave={addCollection} />
      )}
      {syncDialog && (
        <SyncDialog
          initial={syncConfig}
          syncing={syncing}
          onClose={() => setSyncDialog(false)}
          onSave={(config) => { setSyncConfig(config); setSyncDialog(false); setNotice('Server connection saved') }}
          onSync={(config) => { setSyncConfig(config); setSyncDialog(false); void synchronize(config) }}
        />
      )}
      {notice && (
        <div className="toast"><Check size={15} /> {notice}</div>
      )}
    </div>
  )
}

// Content-Adaptive Card Tile (mymind Archetypes)
function CardTile({
  card,
  onOpen,
  onRead,
  onFavorite,
  onCopyColor
}: {
  card: Card
  onOpen: () => void
  onRead: () => void
  onFavorite: () => void
  onCopyColor: () => void
}) {
  const isQuote = card.kind === 'quote'
  const isColor = card.kind === 'color' && card.colorHex
  const isArticle = card.kind === 'article'
  const isImage = card.kind === 'image' && card.image

  return (
    <article
      className={`memory-card card-${card.kind} accent-${card.accent}`}
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
    >
      {/* Visual Header / Media */}
      {isColor ? (
        <div
          className="card-color-swatch"
          style={{ backgroundColor: card.colorHex }}
          onClick={(e) => { e.stopPropagation(); onCopyColor() }}
          title="Click to copy HEX"
        >
          <span className="color-hex-tag">{card.colorHex}</span>
          <Copy size={14} className="copy-icon" />
        </div>
      ) : isImage ? (
        <div className="card-image-wrapper">
          <img src={card.image} alt={card.title} loading="lazy" />
        </div>
      ) : isQuote ? (
        <div className="card-quote-mark">“</div>
      ) : null}

      <div className="card-content">
        {/* Source / Meta Bar */}
        <div className="card-meta">
          <div className="card-source-badge">
            {iconFor(card.kind, 12)}
            <span>{card.source || card.collection}</span>
          </div>
          <button
            className={`fav-btn ${card.favorite ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onFavorite() }}
            aria-label="Toggle favorite"
          >
            <Bookmark size={15} fill={card.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Headline */}
        <h3 className={`card-title ${isQuote ? 'quote-text' : ''}`}>
          {isQuote ? `"${card.body || card.title}"` : card.title}
        </h3>

        {/* Body snippet */}
        {!isQuote && card.body && (
          <p className="card-excerpt">{card.body}</p>
        )}

        {/* Author / Quote Citation */}
        {card.author && (
          <div className="quote-author">— {card.author}</div>
        )}

        {/* Reader Mode Action for Articles */}
        {isArticle && (
          <button
            className="reader-action-btn"
            onClick={(e) => { e.stopPropagation(); onRead() }}
          >
            <BookOpen size={13} /> Read Article {card.readTime ? `(${card.readTime})` : ''}
          </button>
        )}

        {/* Tags & Actions Footer */}
        <div className="card-footer">
          <div className="tags-row">
            {card.tags.slice(0, 3).map((tag) => (
              <span className="tag" key={tag}>#{tag}</span>
            ))}
          </div>
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="external-link"
              title="Open source link"
            >
              <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

// Distraction-Free Article Reader Mode
function ReaderModal({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div className="backdrop reader-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <article className="reader-view" role="dialog" aria-modal="true">
        <header className="reader-header">
          <div className="reader-meta">
            <span>{card.source}</span>
            {card.readTime && <span>• {card.readTime}</span>}
            {card.author && <span>• By {card.author}</span>}
          </div>
          <button className="plain-icon" onClick={onClose} aria-label="Close reader view">
            <X size={20} />
          </button>
        </header>

        <h1 className="reader-title">{card.title}</h1>

        {card.image && (
          <img src={card.image} alt={card.title} className="reader-hero-image" />
        )}

        <div className="reader-body">
          {card.articleText ? (
            card.articleText.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          ) : (
            <p>{card.body || 'No full article text preserved.'}</p>
          )}
        </div>

        <footer className="reader-footer">
          {card.url && (
            <a href={card.url} target="_blank" rel="noreferrer" className="reader-source-link">
              Read original on {card.source} <ExternalLink size={14} />
            </a>
          )}
        </footer>
      </article>
    </div>
  )
}

function Composer({ collections, onClose, onSave }: {
  collections: Collection[]
  onClose: () => void
  onSave: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'accent'>) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [collection, setCollection] = useState(collections[0]?.name ?? 'Inbox')
  const [kind, setKind] = useState<CardKind>('note')
  const [colorHex, setColorHex] = useState('')
  const [image, setImage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const save = () => {
    if (!title.trim() && !body.trim() && !url.trim() && !image && !colorHex) return
    const effectiveKind = colorHex ? 'color' : image ? 'image' : kind === 'quote' ? 'quote' : url ? 'link' : 'note'
    onSave({
      title: title.trim() || (url ? titleFromUrl(url) : colorHex ? `Swatch ${colorHex}` : 'Untitled thought'),
      body: body.trim(),
      url: url.trim(),
      source: url ? host(url) : 'Personal note',
      kind: effectiveKind,
      collection,
      tags: [effectiveKind],
      image: image || undefined,
      colorHex: colorHex || undefined,
      favorite: false
    })
  }

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="composer" role="dialog" aria-modal="true">
        <header>
          <div className="brand-header">
            <span className="dialog-mark"><Sparkles size={18} /></span>
            <div>
              <p>Quick Capture</p>
              <h2>Add to your mind</h2>
            </div>
          </div>
          <button className="plain-icon" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="kind-select-row">
          {(['note', 'quote', 'link', 'color'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`chip ${kind === k ? 'active' : ''}`}
              onClick={() => setKind(k)}
            >
              {iconFor(k, 13)} {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {kind === 'color' ? (
          <label className="compose-row">
            <span>HEX Color Code</span>
            <input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#3458DB"
            />
          </label>
        ) : (
          <label className="url-field">
            <Link2 size={17} />
            <div>
              <span>Web Link (optional)</span>
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </label>
        )}

        <label className="compose-row">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'quote' ? 'Source or Author' : 'A spark or headline'}
          />
        </label>

        <label className="compose-note">
          <span>{kind === 'quote' ? 'Quote' : 'Note'}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === 'quote' ? '"Words worth keeping…"' : 'Write freely…'}
            rows={4}
          />
        </label>

        <footer>
          <button className="text-button" onClick={onClose}>Cancel</button>
          <button className="save-button" onClick={save}>Save to MindCraft <kbd>⌘↵</kbd></button>
        </footer>
      </section>
    </div>
  )
}

function Detail({
  card,
  collections,
  onClose,
  onSave,
  onDelete,
  onFavorite,
  onRead
}: {
  card: Card
  collections: Collection[]
  onClose: () => void
  onSave: (card: Card) => void
  onDelete: () => void
  onFavorite: () => void
  onRead: () => void
}) {
  const [draft, setDraft] = useState(card)
  const [editing, setEditing] = useState(false)

  return (
    <div className="backdrop detail-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="detail" role="dialog" aria-modal="true">
        <header>
          <span className="type-pill dark">{iconFor(card.kind, 14)} {card.kind}</span>
          <div>
            {card.kind === 'article' && (
              <button className="reader-pill-btn" onClick={onRead}>
                <BookOpen size={14} /> Open Reader
              </button>
            )}
            <button className={`plain-icon ${card.favorite ? 'favorited' : ''}`} onClick={onFavorite}>
              <Bookmark size={17} fill={card.favorite ? 'currentColor' : 'none'} />
            </button>
            <button className="plain-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        {card.image && <img className="detail-image" src={card.image} alt={card.title} />}

        {editing ? (
          <div className="edit-fields">
            <label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label>Body / Excerpt<textarea rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></label>
            <label>Link<input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
          </div>
        ) : (
          <div className="detail-copy">
            <p className="collection-name">{card.collection}</p>
            <h2>{card.title}</h2>
            <p className="detail-body">{card.body || 'No notes added.'}</p>
            {card.author && <p className="detail-author">Author: {card.author}</p>}
            {card.url && (
              <a href={card.url} target="_blank" rel="noreferrer" className="detail-ext-link">
                Visit {card.source || 'original'} <ArrowUpRight size={15} />
              </a>
            )}
            <div className="detail-tags">
              {card.tags.map((t) => <span className="tag" key={t}>#{t}</span>)}
            </div>
            <small>Saved {dateLabel(card.createdAt)} · Stored locally on this device</small>
          </div>
        )}

        <footer>
          <button className="delete-button" onClick={onDelete}><Trash2 size={15} /> Delete</button>
          {editing ? (
            <div>
              <button className="text-button" onClick={() => setEditing(false)}>Cancel</button>
              <button className="save-button" onClick={() => { onSave(draft); setEditing(false) }}>Save changes</button>
            </div>
          ) : (
            <button className="edit-button" onClick={() => setEditing(true)}><Pencil size={15} /> Edit card</button>
          )}
        </footer>
      </section>
    </div>
  )
}

function Wander({ card, onClose, onOpen }: { card: Card; onClose: () => void; onOpen: () => void }) {
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className={`wander accent-${card.accent}`} role="dialog" aria-modal="true">
        <button className="plain-icon close-wander" onClick={onClose}><X size={18} /></button>
        <Aperture size={26} />
        <p>Resurfaced from your archive</p>
        <h2>{card.title}</h2>
        <div className="wander-note">{card.body || card.source}</div>
        <button onClick={onOpen}>Open this memory <ArrowUpRight size={15} /></button>
      </section>
    </div>
  )
}

function CollectionComposer({ onClose, onSave }: { onClose: () => void; onSave: (name: string, color: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="collection-dialog" onSubmit={(e) => { e.preventDefault(); onSave(name, '#5a67d8') }}>
        <header>
          <div className="brand-header">
            <span className="dialog-mark"><FolderPlus size={18} /></span>
            <div><p>New Collection</p><h2>Group your memories</h2></div>
          </div>
          <button className="plain-icon" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <label>
          Name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Architecture, Research" />
        </label>
        <footer>
          <button type="button" className="text-button" onClick={onClose}>Cancel</button>
          <button className="save-button">Create collection</button>
        </footer>
      </form>
    </div>
  )
}

function SyncDialog({
  initial,
  syncing,
  onClose,
  onSave,
  onSync
}: {
  initial: SyncConfig
  syncing: boolean
  onClose: () => void
  onSave: (config: SyncConfig) => void
  onSync: (config: SyncConfig) => void
}) {
  const [url, setUrl] = useState(initial.url || 'http://127.0.0.1:8787')
  const [token, setToken] = useState(initial.token)

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="collection-dialog sync-dialog" role="dialog" aria-modal="true">
        <header>
          <div className="brand-header">
            <span className="dialog-mark"><Cloud size={18} /></span>
            <div><p>Local Daemon Sync</p><h2>Connect your library</h2></div>
          </div>
          <button className="plain-icon" onClick={onClose}><X size={18} /></button>
        </header>
        <label>
          Server URL
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8787" />
        </label>
        <label>
          Private Token
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Secret token" />
        </label>
        <p className="sync-note">
          Point to your local MindCraft daemon. Both Chrome and Safari extensions connect here for instant capture.
        </p>
        <footer>
          <button className="text-button" onClick={onClose}>Cancel</button>
          <div>
            <button className="text-button" onClick={() => onSave({ url, token })}>Save</button>
            <button className="save-button" disabled={syncing} onClick={() => onSync({ url, token })}>
              <RefreshCw size={14} /> {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default App
