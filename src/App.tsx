import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Aperture, ArchiveRestore, ArrowDownToLine, ArrowUpRight, Bookmark, BookOpen,
  Check, Cloud, Command, Copy, ExternalLink, Eye, EyeOff, FileText, FolderPlus,
  Grid, Image, Layers, LayoutGrid, Link2, Moon, Palette, Pencil, Play, Plus, Quote,
  RefreshCw, Search, Settings2, SlidersHorizontal, Sparkles, Sun, Trash2,
  Upload, X, Zap
} from 'lucide-react'
import { loadLibrary, persistLibrary, type SyncConfig, type Tombstone } from './storage'
import { syncWithServer } from './sync'
import { createId } from './id'

export type CardKind = 'note' | 'link' | 'image' | 'quote' | 'article' | 'color' | 'todo'
export type Accent = 'moss' | 'lilac' | 'sun' | 'coral' | 'blue'
export type Theme = 'zen' | 'dark' | 'nordic' | 'matcha' | 'terracotta'
export type LayoutMode = 'masonry' | 'grid' | 'stream'
export type TypeMode = 'editorial' | 'modern'

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
  author?: string
  readTime?: string
  colorHex?: string
  fullHtml?: string
  articleText?: string
  favicon?: string
  price?: string
  todos?: { text: string; done: boolean }[]
  isSticky?: boolean
  isVinyl?: boolean
  vinylArtist?: string
  vinylTrack?: string
}

export type Collection = { id: string; name: string; color: string; updatedAt: string }
export type View = 'all' | 'favorites' | string

const STORE = 'mindcraft-library-v3'
const COLLECTION_STORE = 'mindcraft-collections-v2'
const THEME_STORE = 'mindcraft-theme-v2'
const LAYOUT_STORE = 'mindcraft-layout-v2'
const TYPO_STORE = 'mindcraft-typo-v2'
const SHOW_TAGS_STORE = 'mindcraft-show-tags-v2'

const accents: Accent[] = ['moss', 'lilac', 'sun', 'coral', 'blue']

const defaultCollections: Collection[] = [
  { id: 'ideas', name: 'Ideas & Sparks', color: '#4A6B53', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'read', name: 'Quiet Reading', color: '#5B84B1', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'design', name: 'Aesthetics & Space', color: '#C26D53', updatedAt: '2026-01-01T00:00:00.000Z' },
]

const initialCards: Card[] = [
  {
    id: 'seed-quote-1',
    title: 'Good design is as little design as possible',
    body: 'Less, but better – because it concentrates on the essential aspects, and the products are not burdened with non-essentials. Back to purity, back to simplicity.',
    url: 'https://vitsoe.com/us/about/good-design',
    source: 'vitsoe.com',
    kind: 'quote',
    collection: 'Aesthetics & Space',
    tags: ['design', 'principles', 'wellness'],
    accent: 'moss',
    favorite: true,
    author: 'Dieter Rams',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'seed-color-1',
    title: 'Kyoto Wabi Moss',
    body: 'A restorative, mineral shade of forest moss. Eases cognitive fatigue and creates visual calm.',
    url: '',
    source: 'Palette Sanctuary',
    kind: 'color',
    collection: 'Aesthetics & Space',
    tags: ['color', 'harmony', 'swatch'],
    colorHex: '#3D5A45',
    accent: 'moss',
    favorite: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'seed-article-1',
    title: 'The Solitude of an Uncluttered Mind',
    body: 'Why modern thinkers are abandoning noisy hierarchical bookmark trees for tranquil, associative memory. When capture friction drops to zero, the mind regains its natural creative posture.',
    url: 'https://archival.review/solitude-of-mind',
    source: 'archival.review',
    kind: 'article',
    collection: 'Quiet Reading',
    tags: ['mindfulness', 'reflection', 'knowledge'],
    accent: 'lilac',
    favorite: true,
    author: 'Elena Vance',
    readTime: '4 min read',
    articleText: `The filing cabinet was invented for clerks in the late 19th century. Yet for over forty years of computing, we forced human memories into rigid nested digital folders.\n\nWhen you see a painting, read an evocative quote, or admire a chair, your mind does not assign it to /Documents/Work/Research/2026/Drafts. Your mind remembers a sensation: 'that warm mustard chair with oak armrests' or 'that thought on silence from autumn.'\n\nBy uniting visual recall, full article extraction, and zero-overhead local indexing, MindCraft restores our natural cognitive instincts. You capture the spark effortlessly; the system keeps the thread without ever intruding on your peace.`,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'seed-image-1',
    title: 'Bauhaus Architectural Study',
    body: 'Clean lines, honest materials, and spatial harmony in Dessau.',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    source: 'unsplash.com',
    kind: 'image',
    collection: 'Aesthetics & Space',
    tags: ['architecture', 'minimalism', 'form'],
    accent: 'sun',
    favorite: false,
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date(Date.now() - 28800000).toISOString(),
  },
  {
    id: 'chair-roly-poly',
    title: 'Faye Toogood Roly Poly Armchair',
    body: 'Monobloc polyethylene dining armchair featuring a scooped bowl seat on four robust cylindrical legs.',
    url: 'https://driade.com/roly-poly',
    source: 'driade.com',
    kind: 'image',
    image: '/chair.jpg',
    price: '$350',
    collection: 'Aesthetics & Space',
    tags: ['furniture', 'design', 'sculpture'],
    accent: 'coral',
    favorite: false,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    updatedAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'cat-wiki',
    title: 'Felis catus — The Domestic Cat',
    body: 'A small carnivorous mammal characterized by flexibility, silent curiosity, and intimate domestic companionship across human civilization.',
    url: 'https://en.wikipedia.org/wiki/Cat',
    source: 'en.wikipedia.org',
    kind: 'image',
    image: '/feline.jpg',
    collection: 'Ideas & Sparks',
    tags: ['nature', 'curiosity', 'species'],
    accent: 'sun',
    favorite: true,
    createdAt: new Date(Date.now() - 36000000).toISOString(),
    updatedAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: 'seed-quote-2',
    title: 'The Poetics of Intimate Space',
    body: 'Space that has been seized upon by the imagination cannot remain indifferent space subject to the measures and estimates of the surveyor. It has been lived in, not in its positivity, but with all the partiality of the imagination.',
    url: '',
    source: 'Gaston Bachelard',
    kind: 'quote',
    collection: 'Aesthetics & Space',
    tags: ['space', 'philosophy', 'poetry'],
    accent: 'moss',
    favorite: false,
    author: 'Gaston Bachelard',
    createdAt: new Date(Date.now() - 50400000).toISOString(),
    updatedAt: new Date(Date.now() - 50400000).toISOString(),
  },
  {
    id: 'seed-note-1',
    title: 'The Local-First Manifesto',
    body: 'Zero cloud lock-in, zero telemetry, zero monthly subscriptions. Everything lives in SQLite and browser storage right on your machine, always responsive and completely private.',
    url: '',
    source: 'Personal note',
    kind: 'note',
    collection: 'Ideas & Sparks',
    tags: ['local-first', 'privacy', 'freedom'],
    accent: 'sun',
    favorite: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'seed-todo-1',
    title: 'Daily Mindful Rituals',
    body: 'Three intentional anchors for sustained cognitive peace and creative depth.',
    url: '',
    source: 'Daily intentions',
    kind: 'todo',
    collection: 'Ideas & Sparks',
    tags: ['rituals', 'clarity', 'intentions'],
    accent: 'moss',
    favorite: true,
    todos: [
      { text: 'Morning tea in silence without screens', done: true },
      { text: 'Uninterrupted deep design sanctuary', done: true },
      { text: 'Evening stroll beneath cedar trees', done: false },
    ],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'seed-sticky-1',
    title: 'The Architecture of Silence',
    body: 'True luxury in the modern digital age is not having access to more information, but preserving the spacious freedom to forget everything non-essential.',
    url: '',
    source: 'Studio Desk Note',
    kind: 'note',
    collection: 'Ideas & Sparks',
    tags: ['silence', 'clarity', 'thought'],
    accent: 'sun',
    favorite: true,
    isSticky: true,
    author: 'Studio Observation',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'seed-vinyl-1',
    title: 'Music for Airports • 1/1',
    body: 'Brian Eno • 1978. Ambient music designed to tint the acoustic atmosphere and induce cognitive calm, rather than demanding direct attention.',
    url: 'https://en.wikipedia.org/wiki/Ambient_1:_Music_for_Airports',
    source: 'Ambient Soundscape',
    kind: 'link',
    collection: 'Quiet Reading',
    tags: ['sound', 'ambient', 'focus'],
    accent: 'moss',
    favorite: false,
    isVinyl: true,
    vinylArtist: 'Brian Eno',
    vinylTrack: 'Ambient 1 • Acoustic Sanctuary',
    createdAt: new Date(Date.now() - 9000000).toISOString(),
    updatedAt: new Date(Date.now() - 9000000).toISOString(),
  },
]

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
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

function iconFor(kind: 'all' | CardKind, size = 15) {
  switch (kind) {
    case 'all': return <Sparkles size={size} />
    case 'quote': return <Quote size={size} />
    case 'article': return <BookOpen size={size} />
    case 'image': return <Image size={size} />
    case 'color': return <Palette size={size} />
    case 'link': return <Link2 size={size} />
    case 'todo': return <Check size={size} />
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
  const [readingCard, setReadingCard] = useState<Card | null>(() => {
    try {
      const readId = new URLSearchParams(window.location.search).get('read')
      if (readId) {
        const found = initialCards.find((c) => c.id === readId)
        if (found) return found
      }
    } catch {}
    return null
  })
  const [wanderOpen, setWanderOpen] = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [collectionDialog, setCollectionDialog] = useState(false)
  const [syncDialog, setSyncDialog] = useState(false)
  const [notice, setNotice] = useState('')

  // Customization State
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const urlTheme = new URLSearchParams(window.location.search).get('theme') as Theme | null
      if (urlTheme && ['zen', 'dark', 'nordic', 'matcha', 'terracotta'].includes(urlTheme)) return urlTheme
    } catch {}
    return readStored<Theme>(THEME_STORE, 'zen')
  })
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => readStored<LayoutMode>(LAYOUT_STORE, 'masonry'))
  const [typeMode, setTypeMode] = useState<TypeMode>(() => readStored<TypeMode>(TYPO_STORE, 'editorial'))
  const [showTags, setShowTags] = useState<boolean>(() => readStored<boolean>(SHOW_TAGS_STORE, true))

  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let urlToken = ''
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const searchParams = new URLSearchParams(window.location.search)
      urlToken = hashParams.get('token') || searchParams.get('token') || ''
      if (urlToken) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch {}

    loadLibrary<Card, Collection>().then(async (saved) => {
      let cfg: SyncConfig = saved.syncConfig?.url
        ? saved.syncConfig
        : { url: window.location.origin.includes(':5173') ? 'http://127.0.0.1:8787' : (window.location.origin || 'http://127.0.0.1:8787'), token: '' }

      if (urlToken) {
        cfg = { ...cfg, token: urlToken }
      }

      if (!cfg.token) {
        try {
          const configRes = await fetch(`${cfg.url.replace(/\/$/, '')}/v1/config`)
          const configData = await configRes.json()
          if (configData.ok && configData.token) {
            cfg = { url: configData.syncUrl || cfg.url, token: configData.token }
          }
        } catch {}
      }

      setSyncConfig(cfg)
      setTombstones(saved.tombstones)

      let initialCardList = (saved.initialized && saved.cards.length > 0) ? saved.cards : initialCards
      let initialColList = (saved.initialized && saved.collections.length > 0)
        ? saved.collections.map((col) => ({ ...col, updatedAt: col.updatedAt ?? new Date().toISOString() }))
        : defaultCollections
      let syncTime = saved.lastSync

      if (cfg.url) {
        try {
          const result = await syncWithServer<Card | Collection>(cfg, saved.lastSync, saved.cards, saved.collections, saved.tombstones)
          const nextCards = new Map(saved.cards.map((c) => [c.id, c]))
          const nextCollections = new Map(saved.collections.map((col) => [col.id, col]))

          for (const change of result.changes) {
            if (change.kind === 'card') {
              if (change.deleted) nextCards.delete(change.id)
              else nextCards.set(change.id, change.data as Card)
            } else {
              if (change.deleted) nextCollections.delete(change.id)
              else nextCollections.set(change.id, change.data as Collection)
            }
          }

          if (nextCards.size > 0) {
            initialCardList = [...nextCards.values()]
          }
          if (nextCollections.size > 0) {
            initialColList = [...nextCollections.values()]
          }
          syncTime = result.serverTime
        } catch (err) {
          console.warn('Initial sync skipped:', err)
        }
      }

      setCards(initialCardList)
      setCollections(initialColList)
      setLastSync(syncTime)
      setHydrated(true)
    }).catch(() => {
      setCards(initialCards)
      setCollections(defaultCollections)
      setHydrated(true)
      setNotice('Running in tranquil local mode')
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    let active = true
    void persistLibrary(cards, collections, { tombstones, lastSync, syncConfig }).catch(() => {
      if (active) setNotice('Storage notice: running in local volatile mode')
    })
    return () => { active = false }
  }, [cards, collections, tombstones, lastSync, syncConfig, hydrated])

  // Synchronize themes and options to HTML attributes
  useEffect(() => {
    localStorage.setItem(THEME_STORE, JSON.stringify(theme))
    document.documentElement.dataset.theme = theme
    document.documentElement.className = `theme-${theme}`
    document.body.className = `theme-${theme}`
  }, [theme])

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORE, JSON.stringify(layoutMode))
  }, [layoutMode])

  useEffect(() => {
    localStorage.setItem(TYPO_STORE, JSON.stringify(typeMode))
    document.documentElement.dataset.typography = typeMode
  }, [typeMode])

  useEffect(() => {
    localStorage.setItem(SHOW_TAGS_STORE, JSON.stringify(showTags))
  }, [showTags])

  // Global Keyboard Shortcuts
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setZenMode((prev) => !prev)
      }
      if (event.key === 'Escape') {
        setComposerOpen(false)
        setSelected(null)
        setReadingCard(null)
        setWanderOpen(false)
        setCustomizerOpen(false)
        setCollectionDialog(false)
        setSyncDialog(false)
        if (zenMode) setZenMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zenMode])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  // Window Focus Refresh
  useEffect(() => {
    if (!hydrated || !syncConfig.url) return
    const pullCaptures = () => { void synchronize() }
    window.addEventListener('focus', pullCaptures)
    return () => window.removeEventListener('focus', pullCaptures)
  }, [cards, collections, hydrated, lastSync, syncConfig, tombstones])

  // Filtered Cards Engine
  const filtered = useMemo(() => {
    let rawQuery = query.trim()
    let filterKind = kindFilter

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

  const viewTitle = view === 'all' ? 'Everything' : view === 'favorites' ? 'Favorites' : view
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
    setNotice('Remembered in your mind')
  }

  function updateCard(next: Card) {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    setCards((current) => current.map((c) => c.id === updated.id ? updated : c))
    setSelected(updated)
    setNotice('Memory refined')
  }

  function removeCard(id: string) {
    setCards((current) => current.filter((c) => c.id !== id))
    setTombstones((current) => [
      ...current.filter((rec) => !(rec.kind === 'card' && rec.id === id)),
      { kind: 'card', id, updatedAt: new Date().toISOString(), deleted: true }
    ])
    setSelected(null)
    setReadingCard(null)
    setNotice('Memory released')
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
    setNotice(`Created space: ${clean}`)
  }

  function exportLibrary() {
    const payload = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards, collections }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mindcraft-library-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Private archive exported')
  }

  function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as { cards?: Card[]; collections?: Collection[] }
        if (!Array.isArray(payload.cards) || !Array.isArray(payload.collections)) throw new Error('Invalid archive')
        setCards(payload.cards)
        setCollections(payload.collections.map((item) => ({ ...item, updatedAt: item.updatedAt ?? new Date().toISOString() })))
        setTombstones([])
        setNotice('Archive restored successfully')
      } catch {
        setNotice('Unrecognized archive format')
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
      setNotice('Refreshed in sync')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Sync check complete')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={`app-shell theme-${theme} layout-${layoutMode} typo-${typeMode} ${zenMode ? 'zen-active' : ''}`}>
      {/* Background Ambient Glow */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-orb orb-primary" />
        <div className="ambient-orb orb-secondary" />
      </div>

      {/* Signature Floating Utility Rail (mymind dock) */}
      <nav className="dock-rail" aria-label="Quick Actions">
        <button
          className="dock-icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'zen' : 'dark')}
          title="Toggle Nocturne / Zen Theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          className="dock-icon-btn"
          onClick={() => setWanderOpen(true)}
          title="Wander (Serendipity)"
        >
          <Sparkles size={15} />
        </button>
        <button
          className="dock-icon-btn"
          onClick={() => setLayoutMode(layoutMode === 'masonry' ? 'grid' : 'masonry')}
          title="Toggle Grid / Masonry"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          className={`dock-icon-btn ${customizerOpen ? 'active' : ''}`}
          onClick={() => setCustomizerOpen((prev) => !prev)}
          title="Design Settings"
        >
          <SlidersHorizontal size={15} />
        </button>
      </nav>

      {/* Floating Zen Header Bar */}
      <header className="zen-header">
        <div className="header-left">
          <div className="brand" onClick={() => { setView('all'); setKindFilter('all'); setQuery('') }}>
            <div className="brand-logo-wrap">
              <img src="/mindcraft-logo.svg" alt="MindCraft" className="brand-logo-img" />
            </div>
            <span className="brand-name">MindCraft</span>
          </div>

          <nav className="header-spaces" aria-label="Collections">
            <button
              className={`space-pill ${view === 'all' ? 'active' : ''}`}
              onClick={() => setView('all')}
            >
              All Memories <span className="space-count">{cards.length}</span>
            </button>
            <button
              className={`space-pill ${view === 'favorites' ? 'active' : ''}`}
              onClick={() => setView('favorites')}
            >
              <Bookmark size={13} fill={view === 'favorites' ? 'currentColor' : 'none'} />
              <span>Favorites</span>
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                className={`space-pill ${view === col.name ? 'active' : ''}`}
                onClick={() => setView(col.name)}
              >
                <span className="col-dot" style={{ backgroundColor: col.color }} />
                <span>{col.name}</span>
              </button>
            ))}
            <button
              className="space-pill add-space-btn"
              onClick={() => setCollectionDialog(true)}
              title="Create Space"
            >
              <Plus size={14} />
            </button>
          </nav>
        </div>

        <div className="header-actions">
          {/* Quick Capture Button */}
          <button
            className="capture-cta"
            onClick={() => setComposerOpen(true)}
            title="Quick Capture (⌘N)"
          >
            <Plus size={15} />
            <span>Remember</span>
            <kbd>⌘N</kbd>
          </button>

          {/* Serendipity / Wander */}
          <button
            className="header-icon-btn"
            onClick={() => setWanderOpen(true)}
            title="Wander (Resurface Inspiration)"
          >
            <Aperture size={16} />
          </button>

          {/* Customizer / Settings Drawer */}
          <button
            className={`header-icon-btn ${customizerOpen ? 'active' : ''}`}
            onClick={() => setCustomizerOpen((prev) => !prev)}
            title="Design & Palette Settings"
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* Zen Mode Toggle */}
          <button
            className={`header-icon-btn zen-btn ${zenMode ? 'active' : ''}`}
            onClick={() => setZenMode((prev) => !prev)}
            title="Zen Focus Mode (⌘Z)"
          >
            <Zap size={15} />
          </button>
        </div>
      </header>

      {/* Heroic Floating Omnibar */}
      <section className="omnibar-container">
        <div className="omnibar">
          <Search size={18} className="omnibar-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your mind, quotes, colors, thoughts…"
            className="omnibar-input"
          />
          {query ? (
            <button className="omnibar-clear" onClick={() => setQuery('')} title="Clear search">
              <X size={15} />
            </button>
          ) : (
            <div className="omnibar-badge">
              <kbd><Command size={11} />K</kbd>
            </div>
          )}
        </div>

        {/* Tactile Category Filter Chips */}
        <div className="filter-chips-row">
          {(['all', 'quote', 'article', 'image', 'color', 'note', 'link'] as const).map((k) => (
            <button
              key={k}
              className={`filter-chip ${kindFilter === k ? 'active' : ''}`}
              onClick={() => setKindFilter(k as any)}
            >
              {iconFor(k, 13)}
              <span>{k === 'all' ? 'All Types' : k.charAt(0).toUpperCase() + k.slice(1) + 's'}</span>
            </button>
          ))}
          <span className="filter-count-badge">
            {filtered.length} {filtered.length === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </section>

      {/* Main Canvas View */}
      <main className="content-canvas">
        {filtered.length ? (
          <div className={`cards-feed layout-${layoutMode}`}>
            {filtered.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                showTags={showTags}
                onOpen={() => setSelected(card)}
                onRead={() => setReadingCard(card)}
                onFavorite={() => toggleFavorite(card.id)}
                onCopyColor={() => {
                  if (card.colorHex) {
                    navigator.clipboard.writeText(card.colorHex)
                    setNotice(`Copied ${card.colorHex}`)
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-sanctuary">
            <Sparkles size={36} className="empty-icon" />
            <h2>Your mind is clear & peaceful</h2>
            <p>No thoughts match this perspective. Capture a new spark whenever inspiration strikes.</p>
            <button className="empty-capture-btn" onClick={() => setComposerOpen(true)}>
              <Plus size={16} /> Capture a Thought
            </button>
          </div>
        )}
      </main>

      {/* Floating Ambient Serendipity Dock */}
      <aside className="serendipity-dock-bar">
        <div className="serendipity-aura-icon">
          <Sparkles size={13} />
        </div>
        <div className="serendipity-dock-text">
          <span className="serendipity-prefix">Daily Serendipity</span>
          <span className="serendipity-sep">•</span>
          <span className="serendipity-thought">“The Solitude of an Uncluttered Mind”</span>
        </div>
        <div className="serendipity-dock-actions">
          <button
            className="serendipity-dock-btn reflect-btn"
            onClick={() => {
              const art = cards.find((c) => c.kind === 'article')
              if (art) setReadingCard(art)
            }}
          >
            Reflect
          </button>
          <button
            className="serendipity-dock-btn keep-btn"
            onClick={() => setNotice('Kept in daily focus')}
          >
            Keep
          </button>
        </div>
      </aside>

      {/* Floating Zen Mode Exit Hint */}
      {zenMode && (
        <button className="zen-exit-pill" onClick={() => setZenMode(false)}>
          <Eye size={14} /> Exit Zen Mode <kbd>Esc</kbd>
        </button>
      )}

      {/* Customizer Slide-Over Palette */}
      {customizerOpen && (
        <CustomizerDrawer
          theme={theme}
          setTheme={setTheme}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          typeMode={typeMode}
          setTypeMode={setTypeMode}
          showTags={showTags}
          setShowTags={setShowTags}
          onExport={exportLibrary}
          onImport={() => importRef.current?.click()}
          onSyncConfig={() => setSyncDialog(true)}
          onClose={() => setCustomizerOpen(false)}
        />
      )}

      {/* Modals & Overlays */}
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

      <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={importLibrary} />
      {notice && (
        <div className="toast"><Check size={15} /> {notice}</div>
      )}
    </div>
  )
}

// Content-Adaptive Card Tile (High-Craft mymind Archetypes)
function CardTile({
  card,
  showTags,
  onOpen,
  onRead,
  onFavorite,
  onCopyColor
}: {
  card: Card
  showTags: boolean
  onOpen: () => void
  onRead: () => void
  onFavorite: () => void
  onCopyColor: () => void
}) {
  const isQuote = card.kind === 'quote'
  const isColor = card.kind === 'color' && card.colorHex
  const isArticle = card.kind === 'article'
  const isImage = card.kind === 'image' && card.image
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopyColor()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <article
      className={`memory-card card-${card.kind} accent-${card.accent} ${card.isSticky ? 'card-sticky' : ''} ${card.isVinyl ? 'card-vinyl' : ''}`}
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
    >
      {card.isSticky && <div className="sticky-tape-strip" />}

      {/* Archetype 1: Color Swatch Card */}
      {isColor ? (
        <div
          className="swatch-hero"
          style={{ backgroundColor: card.colorHex }}
          onClick={handleCopy}
          title="Click to copy HEX color"
        >
          <div className="swatch-pill">
            <span className="swatch-hex">{card.colorHex}</span>
            <button className="swatch-copy-btn" aria-label="Copy color">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      ) : isImage ? (
        /* Archetype 2: Image Card with Fluid Aspect Ratio */
        <div className="image-hero">
          <img src={card.image} alt={card.title} loading="lazy" />
          {card.price && (
            <div className="card-price-badge">
              {card.price.startsWith('$') ? card.price : `$${card.price}`}
            </div>
          )}
          {card.id === 'seed-image-1' && (
            <div className="card-video-pill">
              <Play size={10} fill="currentColor" />
              <span>02:40 • 4K Film</span>
            </div>
          )}
          <div className="image-hover-scrim">
            <button
              className={`image-fav-btn ${card.favorite ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onFavorite() }}
              title="Bookmark"
            >
              <Bookmark size={15} fill={card.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      ) : card.isVinyl ? (
        /* Archetype: Vinyl Record in Textured Matte Jacket */
        <div className="vinyl-hero">
          <div className="vinyl-sleeve-frame">
            <div className="vinyl-jacket">
              <span className="vinyl-jacket-label">STEREO ARCHIVE</span>
              <span className="vinyl-jacket-artist">{card.vinylArtist || 'Brian Eno'}</span>
              <span className="vinyl-jacket-album">{card.title}</span>
            </div>
            <div className="vinyl-disc-peeking">
              <div className="vinyl-grooves">
                <div className="vinyl-center-sticker">
                  <span className="vinyl-rpm">33⅓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isQuote ? (
        /* Archetype 3: Quote Card with Editorial Display Typography */
        <div className="quote-ornament">
          <span className="quote-glyph">“</span>
        </div>
      ) : null}

      <div className="card-body">
        {/* Source & Timestamp Header */}
        <div className="card-header-meta">
          <span className="source-label">
            {iconFor(card.kind, 11)}
            <span>{card.source || card.collection}</span>
          </span>
          {!isImage && (
            <button
              className={`fav-toggle ${card.favorite ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onFavorite() }}
              aria-label="Toggle favorite"
            >
              <Bookmark size={14} fill={card.favorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* TL;DR Summary badge with delicate sunset gradient border */}
        {isArticle && (
          <div className="tldr-pill">
            <Sparkles size={10} />
            <span>AI TL;DR • Editorial</span>
          </div>
        )}

        {/* Card Title */}
        <h3 className={`card-headline ${isQuote ? 'headline-quote' : ''}`}>
          {isQuote ? `${card.body || card.title}` : card.title}
        </h3>

        {/* Excerpt */}
        {!isQuote && card.body && card.kind !== 'todo' && (
          <p className="card-excerpt">{card.body}</p>
        )}

        {/* Archetype 5: Mindful Checklist */}
        {card.kind === 'todo' && card.todos && (
          <div className="checklist-container">
            {card.todos.map((item, idx) => (
              <div key={idx} className={`checklist-item ${item.done ? 'done' : ''}`}>
                <div className="checklist-box">
                  {item.done && <Check size={11} strokeWidth={2.8} />}
                </div>
                <span className="checklist-text">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quote Attribution */}
        {isQuote && card.author && (
          <div className="quote-byline">— {card.author}</div>
        )}

        {/* Archetype 4: Article Reader Action */}
        {isArticle && (
          <button
            className="reader-cta"
            onClick={(e) => { e.stopPropagation(); onRead() }}
          >
            <BookOpen size={13} />
            <span>Read in Focus Mode</span>
            {card.readTime && <span className="read-time-badge">{card.readTime}</span>}
          </button>
        )}

        {/* Footer Tags (Subtle cluster without distracting external arrow buttons) */}
        {showTags && card.tags.length > 0 && (
          <div className="card-footer-meta">
            <div className="tags-cluster">
              {card.tags.slice(0, 3).map((tag) => (
                <span className="tag-pill" key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

// Distraction-Free Luxury Reader Mode
function ReaderModal({ card, onClose }: { card: Card; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="backdrop reader-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <article className="reader-modal-sheet" role="dialog" aria-modal="true">
        <header className="reader-sheet-header">
          <div className="reader-breadcrumbs">
            <span className="source-domain">{card.source}</span>
            {card.readTime && <span>• {card.readTime}</span>}
            {card.author && <span>• By {card.author}</span>}
          </div>
          <button className="plain-icon-btn" onClick={onClose} aria-label="Close reader">
            <X size={18} />
          </button>
        </header>

        <h1 className="reader-hero-title">{card.title}</h1>

        {card.image && (
          <img src={card.image} alt={card.title} className="reader-featured-art" />
        )}

        <div className="reader-prose">
          {card.articleText ? (
            card.articleText.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          ) : (
            <p>{card.body || 'No extracted full text available for this memory.'}</p>
          )}
        </div>

        <footer className="reader-sheet-footer">
          {card.url && (
            <a href={card.url} target="_blank" rel="noreferrer" className="reader-original-link">
              Read original publication on {card.source} <ExternalLink size={13} />
            </a>
          )}
        </footer>
      </article>
    </div>
  )
}

// Customizer Slide-Over Palette
function CustomizerDrawer({
  theme,
  setTheme,
  layoutMode,
  setLayoutMode,
  typeMode,
  setTypeMode,
  showTags,
  setShowTags,
  onExport,
  onImport,
  onSyncConfig,
  onClose
}: {
  theme: Theme
  setTheme: (t: Theme) => void
  layoutMode: LayoutMode
  setLayoutMode: (l: LayoutMode) => void
  typeMode: TypeMode
  setTypeMode: (t: TypeMode) => void
  showTags: boolean
  setShowTags: (s: boolean) => void
  onExport: () => void
  onImport: () => void
  onSyncConfig: () => void
  onClose: () => void
}) {
  const themes: { id: Theme; name: string; bg: string; accent: string }[] = [
    { id: 'zen', name: 'Wabi-Sabi Paper', bg: '#F8F6F0', accent: '#4A6B53' },
    { id: 'dark', name: 'Nocturne Obsidian', bg: '#0E1013', accent: '#D4A373' },
    { id: 'nordic', name: 'Nordic Mist', bg: '#F3F5F7', accent: '#5B84B1' },
    { id: 'matcha', name: 'Kyoto Matcha', bg: '#F2F5EE', accent: '#3D5A45' },
    { id: 'terracotta', name: 'Tuscan Clay', bg: '#FAF6F2', accent: '#C26D53' },
  ]

  return (
    <div className="customizer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="customizer-panel">
        <header className="customizer-header">
          <div>
            <h3>Sanctuary Preferences</h3>
            <p>Customize aesthetics, typography & space</p>
          </div>
          <button className="plain-icon-btn" onClick={onClose}><X size={17} /></button>
        </header>

        {/* Color Palette Selector */}
        <section className="pref-section">
          <label className="pref-label">Atmosphere & Palette</label>
          <div className="theme-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`theme-card ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
              >
                <div className="theme-preview" style={{ backgroundColor: t.bg }}>
                  <span className="preview-dot" style={{ backgroundColor: t.accent }} />
                </div>
                <span className="theme-title">{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Layout Mode */}
        <section className="pref-section">
          <label className="pref-label">Library Layout</label>
          <div className="segment-control">
            <button
              className={layoutMode === 'masonry' ? 'active' : ''}
              onClick={() => setLayoutMode('masonry')}
            >
              <LayoutGrid size={14} /> Moodboard
            </button>
            <button
              className={layoutMode === 'grid' ? 'active' : ''}
              onClick={() => setLayoutMode('grid')}
            >
              <Grid size={14} /> Balanced
            </button>
            <button
              className={layoutMode === 'stream' ? 'active' : ''}
              onClick={() => setLayoutMode('stream')}
            >
              <Layers size={14} /> Stream
            </button>
          </div>
        </section>

        {/* Typography Mode */}
        <section className="pref-section">
          <label className="pref-label">Typography Character</label>
          <div className="segment-control">
            <button
              className={typeMode === 'editorial' ? 'active' : ''}
              onClick={() => setTypeMode('editorial')}
            >
              Instrument Serif
            </button>
            <button
              className={typeMode === 'modern' ? 'active' : ''}
              onClick={() => setTypeMode('modern')}
            >
              Clean Sans
            </button>
          </div>
        </section>

        {/* Tag Display */}
        <section className="pref-section">
          <label className="pref-label">Visual Density</label>
          <button
            className="toggle-row-btn"
            onClick={() => setShowTags(!showTags)}
          >
            <span>Show Categorization Tags</span>
            {showTags ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </section>

        {/* Data & Backup */}
        <section className="pref-section border-top">
          <label className="pref-label">Local Data & Sync</label>
          <div className="data-actions-row">
            <button onClick={onExport}><ArrowDownToLine size={14} /> Export Archive</button>
            <button onClick={onImport}><Upload size={14} /> Restore Backup</button>
            <button onClick={onSyncConfig}><Cloud size={14} /> Sync Server</button>
          </div>
        </section>
      </aside>
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
  const [collection, setCollection] = useState(collections[0]?.name ?? 'Ideas & Sparks')
  const [kind, setKind] = useState<CardKind>('note')
  const [colorHex, setColorHex] = useState('')
  const [image, setImage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const save = () => {
    if (!title.trim() && !body.trim() && !url.trim() && !image && !colorHex) return
    const effectiveKind = colorHex ? 'color' : image ? 'image' : kind === 'quote' ? 'quote' : url ? 'link' : 'note'
    onSave({
      title: title.trim() || (url ? titleFromUrl(url) : colorHex ? `Swatch ${colorHex}` : 'Untitled spark'),
      body: body.trim(),
      url: url.trim(),
      source: url ? host(url) : 'Personal memory',
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
      <section className="composer-modal" role="dialog" aria-modal="true">
        <header className="composer-header">
          <div className="composer-title-group">
            <span className="composer-badge"><Sparkles size={16} /></span>
            <div>
              <h3>Capture Thought</h3>
              <p>Saved instantly on this machine</p>
            </div>
          </div>
          <button className="plain-icon-btn" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="composer-kinds">
          {(['note', 'quote', 'link', 'color'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`composer-chip ${kind === k ? 'active' : ''}`}
              onClick={() => setKind(k)}
            >
              {iconFor(k, 13)} {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {kind === 'color' ? (
          <label className="field-group">
            <span>HEX Color Code</span>
            <input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#3D5A45"
            />
          </label>
        ) : (
          <label className="field-group">
            <span>Web Link (optional)</span>
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        )}

        <label className="field-group">
          <span>{kind === 'quote' ? 'Author / Context' : 'Title or Headline'}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'quote' ? 'e.g. Marcus Aurelius' : 'A spark or memory'}
          />
        </label>

        <label className="field-group">
          <span>{kind === 'quote' ? 'Quote' : 'Reflection'}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === 'quote' ? '"Words worth keeping close…"' : 'Write your thought freely…'}
            rows={4}
          />
        </label>

        <footer className="composer-footer">
          <button className="text-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="action-save-btn" onClick={save}>
            Remember in MindCraft <kbd>⌘↵</kbd>
          </button>
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
      <section className="detail-modal" role="dialog" aria-modal="true">
        <header className="detail-header">
          <span className="type-badge-pill">{iconFor(card.kind, 13)} {card.kind}</span>
          <div className="detail-header-actions">
            {card.kind === 'article' && (
              <button className="reader-pill-action" onClick={onRead}>
                <BookOpen size={13} /> Open Reader
              </button>
            )}
            <button className={`plain-icon-btn ${card.favorite ? 'favorited' : ''}`} onClick={onFavorite}>
              <Bookmark size={16} fill={card.favorite ? 'currentColor' : 'none'} />
            </button>
            <button className="plain-icon-btn" onClick={onClose}><X size={17} /></button>
          </div>
        </header>

        {card.image && <img className="detail-hero-media" src={card.image} alt={card.title} />}

        {editing ? (
          <div className="edit-form-stack">
            <label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label>Content<textarea rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></label>
            <label>Link<input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
          </div>
        ) : (
          <div className="detail-narrative">
            <p className="detail-collection-crumb">{card.collection}</p>
            <h2 className="detail-headline">{card.title}</h2>
            <p className="detail-text-body">{card.body || 'No notes added to this memory.'}</p>
            {card.author && <p className="detail-author-tag">— {card.author}</p>}
            {card.url && (
              <a href={card.url} target="_blank" rel="noreferrer" className="detail-link-cta">
                Visit {card.source || 'original link'} <ArrowUpRight size={14} />
              </a>
            )}
            <div className="detail-tags-row">
              {card.tags.map((t) => <span className="tag-pill" key={t}>#{t}</span>)}
            </div>
            <small className="detail-date-stamp">Saved {dateLabel(card.createdAt)} · Completely private</small>
          </div>
        )}

        <footer className="detail-footer">
          <button className="danger-delete-btn" onClick={onDelete}><Trash2 size={14} /> Delete</button>
          {editing ? (
            <div className="edit-actions">
              <button className="text-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="action-save-btn" onClick={() => { onSave(draft); setEditing(false) }}>Save Changes</button>
            </div>
          ) : (
            <button className="edit-outline-btn" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
          )}
        </footer>
      </section>
    </div>
  )
}

function Wander({ card, onClose, onOpen }: { card: Card; onClose: () => void; onOpen: () => void }) {
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="wander-tarot" role="dialog" aria-modal="true">
        <button className="plain-icon-btn close-wander-btn" onClick={onClose}><X size={17} /></button>
        <Aperture size={30} className="wander-sparkle" />
        <p className="wander-kicker">Resurfaced Inspiration</p>
        <h2 className="wander-title">{card.title}</h2>
        <p className="wander-quote">{card.body || card.source}</p>
        <button className="wander-open-btn" onClick={onOpen}>
          Explore this memory <ArrowUpRight size={15} />
        </button>
      </section>
    </div>
  )
}

function CollectionComposer({ onClose, onSave }: { onClose: () => void; onSave: (name: string, color: string) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4A6B53')

  const colors = ['#4A6B53', '#5B84B1', '#C26D53', '#8E7CC3', '#D4A373']

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="space-creator-modal" onSubmit={(e) => { e.preventDefault(); onSave(name, color) }}>
        <header className="space-creator-header">
          <div className="space-header-title">
            <span className="space-icon-badge"><FolderPlus size={16} /></span>
            <div><h3>Create Space</h3><p>A serene cluster for related thoughts</p></div>
          </div>
          <button className="plain-icon-btn" type="button" onClick={onClose}><X size={17} /></button>
        </header>

        <label className="field-group">
          <span>Space Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Architecture, Poems, Botany"
          />
        </label>

        <div className="field-group">
          <span>Accent Color</span>
          <div className="color-dots-row">
            {colors.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-dot-choice ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <footer className="space-creator-footer">
          <button type="button" className="text-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="action-save-btn">Create Space</button>
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
      <section className="space-creator-modal" role="dialog" aria-modal="true">
        <header className="space-creator-header">
          <div className="space-header-title">
            <span className="space-icon-badge"><Cloud size={16} /></span>
            <div><h3>Local Sync Daemon</h3><p>Private SQLite vault synchronization</p></div>
          </div>
          <button className="plain-icon-btn" onClick={onClose}><X size={17} /></button>
        </header>

        <label className="field-group">
          <span>Server URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8787" />
        </label>

        <label className="field-group">
          <span>Private Token</span>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Private token" />
        </label>

        <p className="sync-explainer">
          Connects the MindCraft extension on Chrome and Safari directly to this SQLite database.
        </p>

        <footer className="space-creator-footer">
          <button className="text-cancel-btn" onClick={onClose}>Cancel</button>
          <div className="sync-action-group">
            <button className="edit-outline-btn" onClick={() => onSave({ url, token })}>Save</button>
            <button className="action-save-btn" disabled={syncing} onClick={() => onSync({ url, token })}>
              <RefreshCw size={13} /> {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default App
