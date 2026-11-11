# MindCraft Capture extension

This Manifest V3 extension saves the title, URL, and selected text from the current page to your self-hosted MindCraft Sync server.

## Install in Chrome, Edge, Brave, or another Chromium browser

1. Run your MindCraft sync server and make it reachable from the browser.
2. Open `chrome://extensions`, enable **Developer mode**, then choose **Load unpacked**.
3. Select `/home/simple/MindCraft/extension`.
4. Open the extension’s **Details** page, then **Extension options**.
5. Enter the sync URL and the same `MINDCRAFT_SYNC_TOKEN` used by the server. The settings page checks that the server responds before storing the connection.

When you return to a connected MindCraft tab after saving from the extension, it pulls the capture automatically. You can also use the **Sync** button at any time.

The extension requests host access only for the server URL you enter. It uses temporary active-tab access to read the current page’s title, URL, and explicitly selected text when you click it. It does not run in the background on websites and does not send browsing history.
