# MindCraft Sync Server

This is a small self-hosted SQLite service for syncing your own MindCraft library and browser extension. It stores opaque card and collection JSON records. It does not include analytics, users, advertising, or payments.

## Start locally

```bash
cd /home/simple/MindCraft
export MINDCRAFT_SYNC_TOKEN='replace-this-with-a-long-random-private-token'
pnpm sync-server
```

The default database is `data/mindcraft.sqlite` and the default port is `8787`.

To use it on a private network, run it on a machine reachable by your devices and configure MindCraft and the extension with that machine's HTTPS URL and the same token. For internet access, place it behind a reverse proxy with HTTPS. Never put the token in a public repository or URL.

## Protocol

- `GET /v1/health` verifies that the server is running.
- `GET /v1/sync?since=<ISO timestamp>` returns records changed since that time.
- `POST /v1/sync` accepts `{ since, changes }` and returns the merged result.

Records use last-write-wins conflict resolution by `updatedAt`. Deleted records remain as tombstones so deletions sync to other devices.
