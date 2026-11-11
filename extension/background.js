const DEFAULT_SERVER_URL = 'http://127.0.0.1:8787'

// Setup context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mindcraft-save-page',
    title: 'Save to MindCraft',
    contexts: ['page']
  })
  chrome.contextMenus.create({
    id: 'mindcraft-save-selection',
    title: 'Save Quote to MindCraft',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    id: 'mindcraft-save-image',
    title: 'Save Image to MindCraft',
    contexts: ['image']
  })
})

async function getCredentials() {
  const stored = await chrome.storage.local.get(['syncUrl', 'syncToken'])
  return {
    syncUrl: stored.syncUrl || DEFAULT_SERVER_URL,
    syncToken: stored.syncToken || ''
  }
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    })
  } catch (err) {
    console.warn('Could not inject content script:', err)
  }
}

async function captureTab(tab, overrides = {}) {
  if (!tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    return
  }

  await ensureContentScript(tab.id)

  let context = {}
  try {
    context = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' })
  } catch {
    context = {
      title: tab.title || 'Untitled page',
      url: tab.url,
      tags: ['reference']
    }
  }

  const payload = {
    ...context,
    ...overrides,
    url: overrides.url || context.url || tab.url,
    title: overrides.title || context.title || tab.title || 'Untitled'
  }

  const { syncUrl, syncToken } = await getCredentials()

  try {
    const response = await fetch(`${syncUrl.replace(/\/$/, '')}/v1/capture`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(syncToken ? { authorization: `Bearer ${syncToken}` } : {})
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Server rejected capture')
    }

    // Display HUD Toast inside the webpage
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_HUD_TOAST',
      card: data.card,
      status: 'Saved to MindCraft'
    }).catch(() => {})

  } catch (error) {
    console.error('Capture failed:', error)
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_HUD_TOAST',
      card: { title: payload.title, kind: payload.kind || 'link', tags: [] },
      status: error instanceof Error ? `Error: ${error.message}` : 'Could not reach MindCraft'
    }).catch(() => {})
  }
}

// Handle context menus
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'mindcraft-save-selection') {
    await captureTab(tab, {
      selectedText: info.selectionText,
      kind: 'quote',
      tags: ['quote']
    })
  } else if (info.menuItemId === 'mindcraft-save-image') {
    await captureTab(tab, {
      image: info.srcUrl,
      kind: 'image',
      tags: ['image', 'visual']
    })
  } else if (info.menuItemId === 'mindcraft-save-page') {
    await captureTab(tab)
  }
})

// Handle keyboard command (e.g. Cmd+Shift+S / Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-page') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (tab) await captureTab(tab)
  }
})

// Handle card note updates from HUD Toast
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'UPDATE_CARD_NOTE' && message.cardId) {
    const { syncUrl, syncToken } = await getCredentials()
    try {
      await fetch(`${syncUrl.replace(/\/$/, '')}/v1/capture`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(syncToken ? { authorization: `Bearer ${syncToken}` } : {})
        },
        body: JSON.stringify({
          id: message.cardId,
          body: message.note,
          tags: message.note.startsWith('#') ? [message.note.replace(/^#/, '')] : undefined
        })
      })
    } catch (err) {
      console.error('Failed to update card note:', err)
    }
  }
})
