import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Clean, simple, minimalist modern logo:
// A solid forest moss canvas with a pure, timeless, architectural geometric 'M' mark.
// Two serene upward curves meeting in a gentle drop, evoking an open book and two hemispheres.
const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Clean Forest Canvas -->
  <rect width="128" height="128" rx="28" fill="#1C382B"/>
  
  <!-- Minimal Architectural Glyph: Pure, Balanced, Uncluttered -->
  <path d="M 38 86 
           C 38 54, 46 42, 64 60 
           C 82 42, 90 54, 90 86
           C 82 86, 78 58, 64 68
           C 50 58, 46 86, 38 86 Z" 
        fill="#F4F1EA"/>
  
  <!-- Single Calm Aperture Point -->
  <circle cx="64" cy="38" r="5" fill="#E8C574"/>
</svg>`

// Also create an even simpler, pure geometric variant:
// A minimalist line-drawn book/mind icon:
const ultraMinimalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="28" fill="#1A3327"/>
  <!-- Pure, bold, clean geometry -->
  <path d="M 34 82 V 56 C 34 46, 42 38, 52 38 C 58 38, 64 42, 64 48 C 64 42, 70 38, 76 38 C 86 38, 94 46, 94 56 V 82" 
        fill="none" 
        stroke="#FAF8F5" 
        stroke-width="9" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
  <circle cx="64" cy="72" r="5" fill="#D4A352"/>
</svg>`

writeFileSync('public/mindcraft-logo.svg', ultraMinimalSvg)
writeFileSync('extension/icons/icon.svg', ultraMinimalSvg)

const sizes = [16, 32, 48, 128, 512]
for (const s of sizes) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;width:${s}px;height:${s}px;">
  <style>svg { width:${s}px; height:${s}px; display:block; }</style>
  ${ultraMinimalSvg}
  </body></html>`
  const htmlPath = `/tmp/clean_icon_${s}.html`
  const outPath = s === 512 ? 'public/icon-512.png' : `extension/icons/icon-${s}.png`
  writeFileSync(htmlPath, html)
  execSync(`TMPDIR=/tmp /opt/helium-browser-bin/chrome --headless --disable-gpu --no-sandbox --user-data-dir=/tmp/c_data --window-size=${s},${s} --screenshot=${outPath} file://${htmlPath}`)
}
console.log('Clean minimal logo generated!')
