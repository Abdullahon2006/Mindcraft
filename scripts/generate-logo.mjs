import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" fill="none">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#244837"/>
      <stop offset="100%" stop-color="#14281E"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE5A4"/>
      <stop offset="50%" stop-color="#E5BA6A"/>
      <stop offset="100%" stop-color="#B88A3C"/>
    </linearGradient>
    <linearGradient id="ribbonLeft" x1="20%" y1="20%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#DCECE4"/>
    </linearGradient>
    <linearGradient id="ribbonRight" x1="80%" y1="20%" x2="20%" y2="100%">
      <stop offset="0%" stop-color="#F5FDF9"/>
      <stop offset="100%" stop-color="#C2DDD2"/>
    </linearGradient>
    <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#07110C" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Premium Squircle Container -->
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <rect x="0.75" y="0.75" width="126.5" height="126.5" rx="27.25" stroke="url(#innerGlow)" stroke-width="1.5"/>
  <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" stroke="#000000" stroke-opacity="0.3"/>

  <!-- Subtle Concentric Mind Ripple (Zen Ring) -->
  <circle cx="64" cy="62" r="42" stroke="#FFFFFF" stroke-opacity="0.04" stroke-width="1.5"/>
  <circle cx="64" cy="62" r="32" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1"/>

  <!-- The Artisanal MindCraft Monogram (Continuous Dual-Hemisphere Ribbon 'M') -->
  <g filter="url(#shadow)">
    <!-- Left Wing (Intuition / Perception) -->
    <path d="M 32 82 C 30 52, 45 36, 64 56 C 54 44, 42 54, 42 78 C 42 82, 38 84, 32 82 Z" fill="url(#ribbonLeft)"/>
    <!-- Right Wing (Craft / Logic) -->
    <path d="M 96 82 C 98 52, 83 36, 64 56 C 74 44, 86 54, 86 78 C 86 82, 90 84, 96 82 Z" fill="url(#ribbonRight)"/>
    <!-- Interlocking Center Bridge with Origami Diamond Fold -->
    <path d="M 46 64 C 54 52, 60 48, 64 54 C 68 48, 74 52, 82 64 C 76 72, 69 77, 64 74 C 59 77, 52 72, 46 64 Z" fill="#EAF5F0"/>
    
    <!-- Central Cognitive Core (Golden Sun Spark) -->
    <circle cx="64" cy="38" r="4" fill="url(#gold)"/>
    <path d="M 64 28 Q 64 36, 71 38 Q 64 40, 64 48 Q 64 40, 57 38 Q 64 36, 64 28 Z" fill="url(#gold)"/>
  </g>
</svg>`

writeFileSync('public/mindcraft-logo.svg', svgContent)
writeFileSync('extension/icons/icon.svg', svgContent)

const sizes = [16, 32, 48, 128, 512]
for (const s of sizes) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;width:${s}px;height:${s}px;">
  <style>svg { width:${s}px; height:${s}px; display:block; }</style>
  ${svgContent}
  </body></html>`
  const htmlPath = `/tmp/icon_${s}.html`
  const outPath = s === 512 ? 'public/icon-512.png' : `extension/icons/icon-${s}.png`
  writeFileSync(htmlPath, html)
  execSync(`TMPDIR=/tmp /opt/helium-browser-bin/chrome --headless --disable-gpu --no-sandbox --user-data-dir=/tmp/c_data --window-size=${s},${s} --screenshot=${outPath} file://${htmlPath}`)
}
console.log('Regenerated refined logo!')
