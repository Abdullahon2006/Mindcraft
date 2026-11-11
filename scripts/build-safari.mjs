#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve('.')
const extDir = resolve(rootDir, 'extension')
const safariOutDir = resolve(rootDir, 'safari')

console.log('📦 MindCraft Safari Web Extension Builder')
console.log(`Source directory: ${extDir}`)

let hasXcodeTools = false
try {
  execSync('which xcrun', { stdio: 'ignore' })
  hasXcodeTools = true
} catch {}

if (hasXcodeTools) {
  console.log('🍏 Apple Xcode Developer Tools detected.')
  try {
    mkdirSync(safariOutDir, { recursive: true })
    console.log('Running safari-web-extension-converter...')
    execSync(
      `xcrun safari-web-extension-converter "${extDir}" --project-location "${safariOutDir}" --app-name "MindCraft" --bundle-identifier "com.mindcraft.safari" --swift --no-prompt --no-open`,
      { stdio: 'inherit' }
    )
    console.log('✅ Safari Extension Xcode project generated in ./safari/MindCraft')
  } catch (err) {
    console.error('Xcode converter error:', err.message)
  }
} else {
  console.log('ℹ️ Non-macOS environment detected. Preparing universal Safari Extension package...')
  mkdirSync(safariOutDir, { recursive: true })
  cpSync(extDir, resolve(safariOutDir, 'extension'), { recursive: true })

  const runnerScript = `#!/usr/bin/env bash
# Run this script on a Mac with Xcode installed to generate the Safari App Extension
set -e
echo "Building Safari Extension for MindCraft..."
xcrun safari-web-extension-converter ./safari/extension \\
  --project-location ./safari \\
  --app-name "MindCraft" \\
  --bundle-identifier "com.mindcraft.safari" \\
  --swift \\
  --no-prompt
echo "Opening Xcode project..."
open ./safari/MindCraft/MindCraft.xcodeproj
`
  writeFileSync(resolve(safariOutDir, 'build-mac.sh'), runnerScript, { mode: 0o755 })
  console.log('✅ Safari bundle prepared in ./safari with build-mac.sh')
}
