const form = document.querySelector('#capture-form')
const title = document.querySelector('#title')
const note = document.querySelector('#note')
const collection = document.querySelector('#collection')
const tags = document.querySelector('#tags')
const status = document.querySelector('#status')
const pageHost = document.querySelector('#page-host')
const statusDot = document.querySelector('#status-dot')
const previewCard = document.querySelector('#preview-card')
const previewImage = document.querySelector('#preview-image')
const previewColor = document.querySelector('#preview-color')
const previewBadge = document.querySelector('#preview-badge')
const previewInfo = document.querySelector('#preview-info')
const previewSnippet = document.querySelector('#preview-snippet')
const chips = document.querySelectorAll('.chip')

let selectedKind = 'auto'
let pageContext = {}

// Kind chip selection
chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('active'))
    chip.classList.add('active')
    selectedKind = chip.dataset.kind
  })
})

function setStatus(message, type = 'info') {
  status.textContent = message
  status.className = `status-msg ${type}`
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab
}

async function getSyncConfig() {
  let { syncUrl, syncToken = '' } = await chrome.storage.local.get(['syncUrl', 'syncToken'])
  // Normalize localhost URLs: if pointing to obsolete 5173 or empty, point to 8787
  if (!syncUrl || syncUrl.includes(':5173') || syncUrl.trim() === '') {
    syncUrl = 'http://127.0.0.1:8787'
    await chrome.storage.local.set({ syncUrl })
  }
  return { syncUrl: syncUrl.replace(/\/$/, ''), syncToken }
}

const displayTitle = document.querySelector('#display-title')

// Open settings page if button present
document.querySelector('#settings')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage?.()
})

// Open MindCraft web application
document.querySelector('#open-mindcraft')?.addEventListener('click', async () => {
  const { syncUrl, syncToken } = await getSyncConfig()
  const targetUrl = syncToken ? `${syncUrl}/#token=${encodeURIComponent(syncToken)}` : syncUrl
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: targetUrl })
  } else {
    window.open(targetUrl, '_blank')
  }
})

// Check connection to local MindCraft server
async function checkServerHealth() {
  try {
    const { syncUrl } = await getSyncConfig()
    const res = await fetch(`${syncUrl}/v1/health`, { signal: AbortSignal.timeout(1500) })
    if (res.ok) {
      statusDot.className = 'status-dot connected'
      statusDot.title = 'Connected to MindCraft Local Sanctuary'
    } else {
      statusDot.className = 'status-dot disconnected'
      statusDot.title = 'MindCraft server offline'
    }
  } catch {
    statusDot.className = 'status-dot disconnected'
    statusDot.title = 'MindCraft server offline'
  }
}

void checkServerHealth()

let tab = null
try {
  tab = await getActiveTab()
} catch {}

if (tab?.url && tab.url.startsWith('http')) {
  try {
    const urlObj = new URL(tab.url)
    pageHost.textContent = urlObj.hostname.replace(/^www\./, '')
  } catch {
    pageHost.textContent = 'Web Page'
  }

  // Ensure content script is injected and extract page context
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    pageContext = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' })
  } catch {
    pageContext = {
      title: tab.title ?? 'Untitled page',
      url: tab.url,
      selectedText: '',
      tags: ['reference']
    }
  }

  if (pageContext.title || tab.title) {
    title.value = pageContext.title || tab.title
    if (displayTitle) displayTitle.textContent = title.value
  }
  
  // Highlight or quote detection
  if (pageContext.selectedText) {
    note.value = pageContext.selectedText
    selectedKind = 'quote'
    chips.forEach(c => c.classList.toggle('active', c.dataset.kind === 'quote'))
  }
} else {
  pageHost.textContent = 'vitsoe.com'
  if (!title.value) title.value = 'Dieter Rams — Good Design is as Little Design as Possible'
  if (displayTitle) displayTitle.textContent = title.value
  if (!note.value) note.value = 'Less, but better – because it concentrates on the essential aspects.'
  if (!collection.value) collection.value = 'Aesthetics & Space'
  if (!tags.value) tags.value = 'design, principles, wellness'
}

  // Color hex detection
  if (pageContext.colorHex) {
    selectedKind = 'color'
    chips.forEach(c => c.classList.toggle('active', c.dataset.kind === 'color'))
  }

  if (pageContext.tags?.length) {
    tags.value = pageContext.tags.join(', ')
  }

  // Rich Live Preview
  if (pageContext.image || pageContext.readTime || pageContext.colorHex || pageContext.selectedText) {
    previewCard.classList.remove('hidden')
    
    if (pageContext.colorHex) {
      previewColor.classList.remove('hidden')
      previewColor.style.backgroundColor = pageContext.colorHex
      previewBadge.textContent = 'Color'
      previewInfo.textContent = pageContext.colorHex
      previewSnippet.textContent = `Captured swatch ${pageContext.colorHex}`
    } else if (pageContext.image) {
      previewImage.src = pageContext.image
      previewImage.classList.remove('hidden')
      const detected = pageContext.articleText ? 'Article' : pageContext.selectedText ? 'Quote' : 'Image'
      previewBadge.textContent = detected
      previewInfo.textContent = pageContext.readTime || pageHost.textContent
      previewSnippet.textContent = pageContext.selectedText || pageContext.title
    } else {
      const detected = pageContext.selectedText ? 'Quote' : 'Note'
      previewBadge.textContent = detected
      previewInfo.textContent = pageHost.textContent
      previewSnippet.textContent = pageContext.selectedText || pageContext.title
    }
  }
}

// Shortcut: Cmd+Enter or Ctrl+Enter to save
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    form.requestSubmit()
  }
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const saveButton = document.querySelector('#save')
  const { syncUrl, syncToken } = await getSyncConfig()

  saveButton.disabled = true
  saveButton.innerHTML = '<span>Remembering…</span>'

  const effectiveKind = selectedKind === 'auto'
    ? (pageContext.colorHex ? 'color' : pageContext.articleText ? 'article' : pageContext.selectedText ? 'quote' : pageContext.image ? 'image' : 'link')
    : selectedKind

  const payload = {
    ...pageContext,
    title: title.value.trim(),
    body: note.value.trim(),
    collection: collection.value.trim() || 'Inbox',
    tags: tags.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
    kind: effectiveKind,
    colorHex: pageContext.colorHex,
    updatedAt: new Date().toISOString()
  }

  try {
    const res = await fetch(`${syncUrl}/v1/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(syncToken ? { Authorization: `Bearer ${syncToken}` } : {})
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Server responded with ${res.status}`)
    }

    setStatus('Saved to your mind ✨', 'success')
    saveButton.innerHTML = '<span>Saved!</span>'
    setTimeout(() => window.close(), 750)
  } catch (err) {
    console.error('Capture failed:', err)
    // Fallback: save to local extension queue
    const { queue = [] } = await chrome.storage.local.get('queue')
    queue.push(payload)
    await chrome.storage.local.set({ queue })
    setStatus('Stored offline (will sync on connection)', 'info')
    setTimeout(() => window.close(), 1200)
  }
})
