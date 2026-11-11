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

    // Color code detection (e.g., if user highlighted #3458db or #3D5A45)
    const hexMatch = selection.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    const colorHex = hexMatch ? hexMatch[0] : undefined

    // Automatic tags
    const tags = new Set()
    const urlLower = canonical.toLowerCase()
    const contentLower = `${title} ${articleText.slice(0, 500)}`.toLowerCase()

    if (colorHex) tags.add('color')
    if (selection) tags.add('quote')
    if (readTime) tags.add('reading')
    if (/design|typography|figma|ui|ux|color|aesthetic/.test(contentLower)) tags.add('design')
    if (/recipe|cooking|food|coffee/.test(contentLower)) tags.add('food')
    if (/code|programming|github|developer|rust|typescript/.test(urlLower + contentLower)) tags.add('dev')
    if (/architecture|interior|furniture|space/.test(contentLower)) tags.add('spaces')

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

  // Floating HUD Toast Component (Elevated Apple-grade wabi-sabi pill)
  function showHudToast(card, syncStatus = 'Saved to your mind', onQuickNote = null) {
    const existing = document.getElementById('mindcraft-hud-root')
    if (existing) existing.remove()

    const host = document.createElement('div')
    host.id = 'mindcraft-hud-root'
    const shadow = host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .hud-toast {
        width: 320px;
        background: rgba(251, 249, 244, 0.95);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border: 1px solid rgba(0, 0, 0, 0.09);
        border-radius: 16px;
        box-shadow: 0 16px 40px -4px rgba(24, 40, 32, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04);
        color: #182820;
        padding: 14px 16px;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        animation: springDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes springDown {
        from { opacity: 0; transform: translateY(-16px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes springUp {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: translateY(-10px) scale(0.96); }
      }
      .hud-top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #244837 0%, #D4A352 100%);
      }
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 2px;
        margin-bottom: 8px;
      }
      .hud-status-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hud-check-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #234636;
        color: #FFFFFF;
        display: grid;
        place-items: center;
        font-size: 11px;
        box-shadow: 0 2px 6px rgba(35, 70, 54, 0.3);
      }
      .hud-status {
        font-size: 13px;
        font-weight: 700;
        color: #182820;
        letter-spacing: -0.015em;
      }
      .hud-actions-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .hud-icon-btn {
        background: transparent;
        border: none;
        color: #728479;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        transition: all 0.15s ease;
      }
      .hud-icon-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #182820;
      }
      .hud-title {
        font-size: 12.5px;
        font-weight: 600;
        color: #2D3E35;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 6px;
      }
      .hud-tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 10px;
      }
      .hud-tag {
        font-size: 10.5px;
        font-weight: 600;
        color: #586B61;
        background: rgba(0, 0, 0, 0.04);
        padding: 2px 7px;
        border-radius: 12px;
      }
      .hud-input-row {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }
      .hud-input {
        width: 100%;
        background: #FFFFFF;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11.5px;
        color: #182820;
        outline: none;
        transition: all 0.15s ease;
      }
      .hud-input:focus {
        border-color: #234636;
        box-shadow: 0 0 0 2px rgba(35, 70, 54, 0.12);
      }
      .hud-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
      }
      .hud-open-link {
        font-size: 11px;
        font-weight: 650;
        color: #234636;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        cursor: pointer;
      }
      .hud-open-link:hover {
        text-decoration: underline;
      }
      .hud-progress-track {
        height: 2px;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 1px;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        overflow: hidden;
      }
      .hud-progress-bar {
        height: 100%;
        background: #234636;
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

    const topBar = document.createElement('div')
    topBar.className = 'hud-top-bar'

    const header = document.createElement('div')
    header.className = 'hud-header'
    header.innerHTML = `
      <div class="hud-status-group">
        <span class="hud-check-icon">✓</span>
        <span class="hud-status">${syncStatus}</span>
      </div>
      <div class="hud-actions-group">
        <button class="hud-icon-btn" id="hud-close-btn" title="Dismiss">✕</button>
      </div>
    `

    const titleDiv = document.createElement('div')
    titleDiv.className = 'hud-title'
    titleDiv.textContent = card.title || 'Untitled memory'

    const tagsRow = document.createElement('div')
    tagsRow.className = 'hud-tags-row'
    tagsRow.innerHTML = (card.tags || []).map(t => `<span class="hud-tag">#${t}</span>`).join('')

    const inputRow = document.createElement('div')
    inputRow.className = 'hud-input-row'
    const noteInput = document.createElement('input')
    noteInput.className = 'hud-input'
    noteInput.placeholder = 'Add a tag or quick reflection… (↵)'
    inputRow.appendChild(noteInput)

    const footer = document.createElement('div')
    footer.className = 'hud-footer'
    footer.innerHTML = `
      <span style="font-size: 10.5px; color: #8C9D93;">MindCraft Local</span>
      <a class="hud-open-link" id="hud-open-library">Open Library ↗</a>
    `

    const progressTrack = document.createElement('div')
    progressTrack.className = 'hud-progress-track'
    const progressBar = document.createElement('div')
    progressBar.className = 'hud-progress-bar'
    progressTrack.appendChild(progressBar)

    container.appendChild(topBar)
    container.appendChild(header)
    container.appendChild(titleDiv)
    if (card.tags && card.tags.length) container.appendChild(tagsRow)
    container.appendChild(inputRow)
    container.appendChild(footer)
    container.appendChild(progressTrack)

    shadow.appendChild(style)
    shadow.appendChild(container)
    document.body.appendChild(host)

    let dismissed = false
    function dismiss() {
      if (dismissed) return
      dismissed = true
      container.style.animation = 'springUp 0.25s ease forwards'
      setTimeout(() => host.remove(), 250)
    }

    header.querySelector('#hud-close-btn').addEventListener('click', dismiss)
    footer.querySelector('#hud-open-library').addEventListener('click', async () => {
      window.open('http://127.0.0.1:8787', '_blank')
      dismiss()
    })

    const timer = setTimeout(dismiss, 4200)

    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (onQuickNote && noteInput.value.trim()) {
          onQuickNote(noteInput.value.trim())
          noteInput.value = '✓ Reflection saved'
          noteInput.disabled = true
          setTimeout(dismiss, 1200)
        }
      }
    })

    noteInput.addEventListener('focus', () => {
      clearTimeout(timer)
      progressBar.style.animation = 'none'
      progressBar.style.width = '100%'
    })
  }

  // Handle messages from background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTEXT') {
      sendResponse(extractPageContext())
      return true
    }
    if (message.type === 'SHOW_HUD_TOAST') {
      showHudToast(message.card, message.status || 'Saved to your mind', (extraNote) => {
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
