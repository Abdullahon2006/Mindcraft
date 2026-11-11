const form = document.querySelector('#settings-form')
const syncUrl = document.querySelector('#sync-url')
const syncToken = document.querySelector('#sync-token')
const status = document.querySelector('#status')
const stored = await chrome.storage.local.get(['syncUrl', 'syncToken'])
syncUrl.value = stored.syncUrl ?? ''
syncToken.value = stored.syncToken ?? ''

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  let url
  try { url = new URL(syncUrl.value.trim()) } catch { status.textContent = 'Enter a valid sync server URL.'; return }
  if (!['http:', 'https:'].includes(url.protocol)) { status.textContent = 'Use an http or https URL.'; return }
  if (syncToken.value.trim().length < 16) { status.textContent = 'Use the private sync token (at least 16 characters).'; return }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) { status.textContent = 'Use HTTPS for a server outside this device.'; return }
  const granted = await chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] })
  if (!granted) { status.textContent = 'MindCraft needs permission to contact your chosen sync server.'; return }
  try {
    const response = await fetch(`${url.origin}/v1/health`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.ok) throw new Error('This is not a MindCraft sync server.')
    await chrome.storage.local.set({ syncUrl: url.origin, syncToken: syncToken.value.trim() })
    status.textContent = 'Connection checked and saved.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not reach that server.'
  }
})
