(() => {
  // Prevent duplicate injection
  if (window.__MINDCRAFT_CONTENT_INJECTED__) return
  window.__MINDCRAFT_CONTENT_INJECTED__ = true

  // Helper to extract clean article text and metadata
  function extractPageContext() {
    const selection = window.getSelection()?.toString()?.trim() || ''
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || window.location.href
    const title = (
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
      document.title ||
      'Untitled Page'
    ).trim()

    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
      ''

    const author = (
      document.querySelector('meta[name="author"]')?.getAttribute('content') ||
      document.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
      document.querySelector('[rel="author"]')?.textContent ||
      ''
    ).trim()

    const favicon = document.querySelector('link[rel~="icon"]')?.getAttribute('href') || '/favicon.ico'
    const fullFavicon = (() => {
      try { return new URL(favicon, window.location.href).href } catch { return '' }
    })()

    // Article text extraction
    const articleElem = document.querySelector('article') || document.querySelector('main') || document.body
    const paragraphs = Array.from(articleElem.querySelectorAll('p, blockquote, h1, h2, h3, h4'))
      .map(p => p.textContent.trim())
      .filter(t => t.length > 25)

    const articleText = paragraphs.join('\n\n')
    const wordCount = articleText.split(/\s+/).filter(Boolean).length
    const readTime = wordCount > 150 ? `${Math.ceil(wordCount / 220)} min read` : undefined

    // Color code detection (e.g., if user highlighted #3458db)
    const hexMatch = selection.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    const colorHex = hexMatch ? hexMatch[0] : undefined

    // Automatic tags
    const tags = new Set()
    const urlLower = canonical.toLowerCase()
    const contentLower = `${title} ${articleText.slice(0, 500)}`.toLowerCase()

    if (colorHex) tags.add('color')
    if (selection) tags.add('quote')
    if (readTime) tags.add('reading')
    if (/design|typography|figma|ui|ux|color/.test(contentLower)) tags.add('design')
    if (/recipe|cooking|food/.test(contentLower)) tags.add('food')
    if (/code|programming|github|developer|rust|typescript/.test(urlLower + contentLower)) tags.add('dev')
    if (/architecture|interior|furniture/.test(contentLower)) tags.add('spaces')

    return {
      title,
      url: canonical,
      selectedText: selection,
      articleText: wordCount > 120 ? articleText : undefined,
      author: author || undefined,
      readTime,
      colorHex,
      image: ogImage || undefined,
      favicon: fullFavicon,
      tags: Array.from(tags).slice(0, 4)
    }
  }

  // Floating HUD Toast Component
  function showHudToast(card, syncStatus = 'Saved to MindCraft', onQuickNote = null) {
    const existing = document.getElementById('mindcraft-hud-root')
    if (existing) existing.remove()

    const host = document.createElement('div')
    host.id = 'mindcraft-hud-root'
    const shadow = host.attachShadow({ mode: 'open' })

    const kindIcons = {
      article: '📄',
      quote: '❝',
      image: '🖼️',
      color: '🎨',
      link: '🔗',
      note: '📝'
    }

    const icon = kindIcons[card.kind] || '✨'

    const style = document.createElement('style')
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      }
      .hud-toast {
        width: 320px;
        background: rgba(18, 27, 44, 0.94);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        color: #f0f4f8;
        padding: 14px 16px;
        box-sizing: border-box;
        animation: slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(16px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: translateY(8px) scale(0.96); }
      }
      .hud-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .hud-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: #3458db;
        font-size: 11px;
      }
      .hud-status {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: #ffffff;
        flex: 1;
      }
      .hud-close {
        background: transparent;
        border: 0;
        color: #8b9bb4;
        cursor: pointer;
        padding: 4px;
        font-size: 14px;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      .hud-close:hover { color: #ffffff; }
      .hud-title {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.35;
        margin-bottom: 6px;
        color: #e2e8f0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .hud-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 10px;
      }
      .hud-tag {
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
        color: #cbd5e1;
      }
      .hud-input {
        width: 100%;
        box-sizing: border-box;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        padding: 6px 10px;
        color: #f1f5f9;
        font-size: 12px;
        outline: none;
      }
      .hud-input:focus {
        border-color: #3458db;
        background: rgba(255, 255, 255, 0.1);
      }
      .hud-progress {
        height: 2px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 1px;
        margin-top: 10px;
        overflow: hidden;
      }
      .hud-progress-bar {
        height: 100%;
        background: #3458db;
        width: 100%;
        animation: progress 4s linear forwards;
      }
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
    `

    const container = document.createElement('div')
    container.className = 'hud-toast'

    const header = document.createElement('div')
    header.className = 'hud-header'
    header.innerHTML = `
      <span class="hud-badge">${icon}</span>
      <span class="hud-status">${syncStatus}</span>
      <button class="hud-close" id="hud-close-btn" title="Close">✕</button>
    `

    const titleDiv = document.createElement('div')
    titleDiv.className = 'hud-title'
    titleDiv.textContent = card.title || 'Untitled item'

    const metaDiv = document.createElement('div')
    metaDiv.className = 'hud-meta'
    const kindLabel = card.kind.charAt(0).toUpperCase() + card.kind.slice(1)
    metaDiv.innerHTML = `
      <span>${kindLabel}</span>
      ${card.readTime ? `<span>• ${card.readTime}</span>` : ''}
      ${(card.tags || []).map(t => `<span class="hud-tag">#${t}</span>`).join('')}
    `

    const noteInput = document.createElement('input')
    noteInput.className = 'hud-input'
    noteInput.placeholder = 'Add a quick note or tag… (press Enter)'
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (onQuickNote && noteInput.value.trim()) {
          onQuickNote(noteInput.value.trim())
          noteInput.value = '✓ Note added'
          noteInput.disabled = true
        }
      }
    })

    const progress = document.createElement('div')
    progress.className = 'hud-progress'
    const bar = document.createElement('div')
    bar.className = 'hud-progress-bar'
    progress.appendChild(bar)

    container.appendChild(header)
    container.appendChild(titleDiv)
    container.appendChild(metaDiv)
    container.appendChild(noteInput)
    container.appendChild(progress)

    shadow.appendChild(style)
    shadow.appendChild(container)
    document.body.appendChild(host)

    let dismissed = false
    function dismiss() {
      if (dismissed) return
      dismissed = true
      container.style.animation = 'fadeOut 0.22s ease forwards'
      setTimeout(() => host.remove(), 220)
    }

    header.querySelector('#hud-close-btn').addEventListener('click', dismiss)
    const timer = setTimeout(dismiss, 4000)

    // Reset timer if user focuses input
    noteInput.addEventListener('focus', () => {
      clearTimeout(timer)
      bar.style.animation = 'none'
      bar.style.width = '100%'
    })
    noteInput.addEventListener('blur', () => {
      setTimeout(dismiss, 2500)
    })
  }

  // Handle messages from background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTEXT') {
      sendResponse(extractPageContext())
      return true
    }
    if (message.type === 'SHOW_HUD_TOAST') {
      showHudToast(message.card, message.status || 'Saved to MindCraft', (extraNote) => {
        chrome.runtime.sendMessage({
          type: 'UPDATE_CARD_NOTE',
          cardId: message.card.id,
          note: extraNote
        })
      })
      sendResponse({ ok: true })
      return true
    }
  })
})()
