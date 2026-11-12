const form = document.querySelector('#settings-form')
const syncUrl = document.querySelector('#sync-url')
const syncToken = document.querySelector('#sync-token')
const status = document.querySelector('#status')
const bannerDot = document.querySelector('#banner-dot')
const bannerTitle = document.querySelector('#banner-title')
const bannerDesc = document.querySelector('#banner-desc')
const autodetectBtn = document.querySelector('#autodetect-btn')
const openLink = document.querySelector('#open-library-link')

let stored = await chrome.storage.local.get(['syncUrl', 'syncToken'])
let currentUrl = stored.syncUrl || 'http://127.0.0.1:8787'
if (currentUrl.includes(':5173')) currentUrl = 'http://127.0.0.1:8787'

syncUrl.value = currentUrl
syncToken.value = stored.syncToken || ''
openLink.href = currentUrl

async function checkConnection(urlStr) {
  bannerDot.className = 'status-dot'
  bannerTitle.textContent = 'Checking connection…'
  bannerDesc.textContent = `Pinging ${urlStr}…`

  try {
    const res = await fetch(`${urlStr.replace(/\/$/, '')}/v1/health`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const data = await res.json()
      bannerDot.className = 'status-dot connected'
      bannerTitle.textContent = 'Connected & Operational'
      bannerDesc.textContent = `MindCraft Daemon Active (SQLite + FTS5 Search Enabled)`
      return true
    }
  } catch {}

  bannerDot.className = 'status-dot disconnected'
  bannerTitle.textContent = 'Daemon Disconnected'
  bannerDesc.textContent = 'Make sure the local MindCraft server is running on port 8787.'
  return false
}

void checkConnection(currentUrl)

autodetectBtn.addEventListener('click', async () => {
  autodetectBtn.textContent = 'Probing…'
  try {
    const res = await fetch('http://127.0.0.1:8787/v1/config', { signal: AbortSignal.timeout(1500) })
    if (res.ok) {
      const data = await res.json()
      if (data.ok) {
        syncUrl.value = data.syncUrl || 'http://127.0.0.1:8787'
        if (data.token) syncToken.value = data.token
        await chrome.storage.local.set({ syncUrl: syncUrl.value, syncToken: syncToken.value })
        status.textContent = 'Local daemon successfully detected and configured! ✨'
        status.className = 'status-text success'
        openLink.href = syncUrl.value
        void checkConnection(syncUrl.value)
        autodetectBtn.textContent = 'Detected!'
        setTimeout(() => { autodetectBtn.textContent = 'Auto-Detect' }, 2000)
        return
      }
    }
  } catch {}
  status.textContent = 'Could not auto-detect on http://127.0.0.1:8787. Check if server.mjs is running.'
  status.className = 'status-text error'
  autodetectBtn.textContent = 'Auto-Detect'
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  let url
  try {
    url = new URL(syncUrl.value.trim())
  } catch {
    status.textContent = 'Enter a valid sync server URL.'
    status.className = 'status-text error'
    return
  }

  const cleanOrigin = url.origin
  const tokenVal = syncToken.value.trim()

  status.textContent = 'Testing connection…'
  status.className = 'status-text'

  try {
    const response = await fetch(`${cleanOrigin}/v1/health`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.ok) throw new Error('Not a recognized MindCraft sync server.')

    await chrome.storage.local.set({ syncUrl: cleanOrigin, syncToken: tokenVal })
    status.textContent = 'Connection verified and saved! ✨'
    status.className = 'status-text success'
    openLink.href = cleanOrigin
    void checkConnection(cleanOrigin)
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not reach server.'
    status.className = 'status-text error'
  }
})
