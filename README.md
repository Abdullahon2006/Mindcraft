# MindCraft

MindCraft is a private, local-first personal library and cognitive archive — designed as a zero-cloud alternative to **mymind**. It has no account requirement, advertising, telemetry, or subscription lock-in. Everything is stored locally in SQLite and browser storage on your own machine.

---

## Features (mymind Parity)

- **Content-Adaptive Cards:** Dedicated visual cards matching each archetype:
  - **Quotes:** Elegant serif typography with quotation marks, citation, and paper tint styling.
  - **Articles:** Domain badge, read-time calculation, and an instant **Distraction-Free Reader Mode** overlay.
  - **Images:** Aspect-ratio preserving masonry grid tiles with dominant color backgrounds.
  - **Color Swatches:** Extracted HEX and RGB tiles with 1-click clipboard copy.
  - **Notes & Bookmarks:** Clean paper note typography and OpenGraph visual links.
- **Cross-Browser Capture Extensions:**
  - **Chromium:** Manifest V3 extension for Chrome, Brave, Arc, and Edge with 1-click capture, context menus, and shortcut (`⌘+Shift+S` / `Alt+Shift+S`).
  - **Apple Safari:** Safari Web Extension with automated Xcode converter script (`pnpm build:safari`) and step-by-step macOS packaging guide.
- **Floating In-Page HUD Toast:** Saves immediately in 1 click without popup friction, displaying a 4-second unobtrusive in-page HUD toast to confirm tags or append notes.
- **Zero-CPU Local Search:** Built-in SQLite FTS5 (BM25 ranking) provides instant recall across thousands of cards with 0% CPU and zero RAM overhead.
- **Local Media Vault & Proxy:** Self-contained daemon with an on-demand image caching proxy to bypass anti-hotlinking/CORS failures.

---

## Quick Start

### 1. Run the Web Application

```bash
cd /home/simple/MindCraft
pnpm install
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173).

### 2. Start the Local Daemon (Sync & FTS5 Search)

```bash
export MINDCRAFT_SYNC_TOKEN='your-long-random-private-token-here'
pnpm sync-server
```
Runs on `http://127.0.0.1:8787` with SQLite database in `./data/mindcraft.sqlite`.

---

## Installing the Capture Extensions

### A. Chromium Browsers (Chrome, Brave, Arc, Edge)
1. Go to `chrome://extensions/` (or `brave://extensions/`).
2. Enable **Developer mode** (toggle in upper right).
3. Click **Load unpacked** and select the directory:
   `/home/simple/MindCraft/extension`
4. Click the extension icon, open **Settings**, and confirm your local server (`http://127.0.0.1:8787`) and token.
5. Use `⌘+Shift+S` (or `Alt+Shift+S`) or right-click any page, selection, or image to capture instantly.

### B. Apple Safari (macOS & iOS)
1. Run the Safari builder:
   ```bash
   pnpm build:safari
   ```
2. Open `./safari/MindCraft/MindCraft.xcodeproj` in Xcode on macOS.
3. In **Safari > Settings > Advanced**, enable **Show features for web developers**.
4. In **Develop > Allow Unsigned Extensions**, enable developer extensions.
5. In **Safari > Settings > Extensions**, check **MindCraft Capture** and select **Always Allow on Every Website**.
6. Full details in [extension/SAFARI.md](extension/SAFARI.md).

---

## Keyboard Shortcuts
- `⌘ / Ctrl + K`: Focus Omnibar search
- `⌘ / Ctrl + N`: Open Quick Capture composer
- `⌘ + Shift + S` (in browser): 1-Click instant save to MindCraft
- `Esc`: Close reader view or modals
