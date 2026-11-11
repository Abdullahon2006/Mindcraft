# MindCraft Safari Extension Guide

The MindCraft Web Extension uses standard WebExtensions APIs, making it 100% compatible with Apple Safari on macOS and iOS/iPadOS.

## How Safari Web Extensions Work

Unlike Chromium browsers (which can load raw directories in Developer mode), Apple requires Safari Web Extensions to be packaged inside a lightweight native macOS App bundle (`.appex` / `.xcodeproj`).

## Building the Safari Extension

### Automated Build (from Mac terminal)
From the repository root:
```bash
pnpm build:safari
```
Or directly run:
```bash
./safari/build-mac.sh
```

This invokes Apple's official `xcrun safari-web-extension-converter`, which:
1. Validates the `manifest.json` and extension assets.
2. Generates an Xcode project located at `./safari/MindCraft/MindCraft.xcodeproj`.
3. Sets up the Swift container app and Safari Web Extension handler.

---

## Enabling in Safari (Step-by-Step)

1. Open `./safari/MindCraft/MindCraft.xcodeproj` in Xcode.
2. In Xcode's project settings, select your personal team under **Signing & Capabilities** (free Apple ID works for local testing).
3. Click **Run** (`⌘R`). This builds and launches the MindCraft companion app.
4. Open **Safari**:
   - Go to **Safari > Settings (or Preferences) > Advanced**.
   - Check **Show features for web developers** (or **Show Develop menu in menu bar**).
   - In the menu bar, open **Develop** and check **Allow Unsigned Extensions**.
5. Go to **Safari > Settings > Extensions**:
   - Find **MindCraft Capture**.
   - Check the checkbox to enable it.
   - Click **Always Allow on Every Website** (so the 1-click capture toast and context menus work across pages).
6. Click the MindCraft icon in Safari's toolbar, open **Settings**, and ensure your local sync URL (`http://127.0.0.1:8787`) is configured.

## Keyboard Shortcut in Safari
- Press `⌘ + Shift + S` on any page to trigger instant 1-click capture with the floating HUD toast.
