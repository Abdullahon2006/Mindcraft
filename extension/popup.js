const form = document.querySelector('#capture-form')
const title = document.querySelector('#title')
const note = document.querySelector('#note')
const collection = document.querySelector('#collection')
const tags = document.querySelector('#tags')
const status = document.querySelector('#status')
const pageHost = document.querySelector('#page-host')
const previewCard = document.querySelector('#preview-card')
const previewImage = document.querySelector('#preview-image')
const previewBadge = document.querySelector('#preview-badge')
const previewInfo = document.querySelector('#preview-info')
const chips = document.querySelectorAll('.chip')

let selectedKind = 'auto'
let pageContext = {}

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('active'))
    chip.classList.add('active')
    selectedKind = chip.dataset.kind
  })
})

function setStatus(message, error = false) {
  status.textContent = message
  status.className = error ? 'error' : ''
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab
}

document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage())
document.querySelector('#open-mindcraft').addEventListener('click', async () => {
  const { syncUrl = 'http://127.0.0.1:8787', syncToken = '' } = await chrome.storage.local.get(['syncUrl', 'syncToken'])
  const base = syncUrl.replace(/\/$/, '')
  const targetUrl = syncToken ? `${base}/#token=${encodeURIComponent(syncToken)}` : base
  chrome.tabs.create({ url: targetUrl })
})

const tab = await getActiveTab()

if (tab?.url) {
  try {
    pageHost.textContent = new URL(tab.url).hostname.replace(/^www\./, '')
  } catch {
    pageHost.textContent = 'Web Page'
  }

  // Ensure content script is injected and get context
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

  title.value = pageContext.title || tab.title || 'Untitled'
  if (pageContext.selectedText) {
    note.value = pageContext.selectedText
    selectedKind = 'quote'
    chips.forEach(c => c.classList.toggle('active', c.dataset.kind === 'quote'))
  }
  if (pageContext.tags?.length) {
    tags.value = pageContext.tags.join(', ')
  }

  if (pageContext.image || pageContext.readTime) {
    previewCard.classList.remove('hidden')
    if (pageContext.image) {
      previewImage.src = pageContext.image
      previewImage.classList.remove('hidden')
    }
    const detected = pageContext.articleText ? 'Article' : pageContext.selectedText ? 'Quote' : 'Link'
    previewBadge.textContent = detected
    previewInfo.textContent = pageContext.readTime || pageHost.textContent
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const saveButton = document.querySelector('#save')
  const { syncUrl = 'http://127.0.0.1:8787', syncToken = '' } = await chrome.storage.local.get(['syncUrl', 'syncToken'])

  saveButton.disabled = true
  saveButton.textContent = 'Saving…'

  const effectiveKind = selectedKind === 'auto'
    ? (pageContext.articleText ? 'article' : pageContext.selectedText ? 'quote' : pageContext.image ? 'image' : 'link')
    : selectedKind

  const payload = {
    ...pageContext,
    title: title.value.trim() || 'Untitled',
    body: note.value.trim(),
    collection: collection.value.trim() || 'Inbox',
    tags: tags.value.split(',').map((v) => v.trim()).filter(Boolean),
    kind: effectiveKind,
    url: tab?.url ?? '',
  }

  const endpoint = `${syncUrl.replace(/\/$/, '')}/v1/capture`
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(syncToken ? { authorization: `Bearer ${syncToken}` } : {})
      },
      body: JSON.stringify(payload)
    })
    const resData = await response.json().catch(() => ({}))
    if (!response.ok || !resData.ok) throw new Error(resData.error ?? 'Capture failed')
    setStatus('Saved to your private library.')

    // Notify active tab to show the toast
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_HUD_TOAST',
        card: resData.card,
        status: 'Saved to MindCraft'
      }).catch(() => {})
    }

    setTimeout(() => window.close(), 650)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not reach sync server.', true)
    saveButton.disabled = false
    saveButton.textContent = 'Save to MindCraft'
  }
})
