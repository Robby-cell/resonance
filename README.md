# Resonance

A polished, ad-free music player that lives entirely in your browser. Upload, stream, organize playlists, and discover new music — all stored locally on your device.

## Features

- **Upload music** — drag-and-drop MP3, WAV, M4A, OGG, FLAC files. Metadata and cover art are auto-detected from ID3 tags.
- **Add from URL** — paste a direct audio link, or a Spotify/SoundCloud track URL. Direct links can be downloaded and stored for offline playback.
- **Playlists** — create, rename, delete, and reorder playlists. Drag-and-drop track reordering.
- **Playback** — full transport controls (play/pause/prev/next), shuffle, repeat (off/all/one), seek, volume.
- **Queue** — view and manage the upcoming queue.
- **Liked Songs** — auto-synced system playlist.
- **Export/Import** — back up your library as JSON, export playlists as M3U8, or export full playlist bundles (with audio) for cross-device transfer.
- **AI Recommendations** — get song recommendations based on what you're listening to (requires server; not available on static hosting).
- **Background audio** — Media Session API integration for OS media controls and hardware media keys.
- **Responsive** — works on desktop and mobile.

## Local Development

```bash
bun install
bun run dev
```

Open http://localhost:3000 in your browser.

## Deploy to GitHub Pages

This app is configured for static export and includes a GitHub Actions workflow for automatic deployment.

### Option A: Automatic (GitHub Actions)

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main` (or `master`). The workflow will build and deploy automatically.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

For **user/org pages** (`<username>.github.io` repo), the site deploys to `https://<username>.github.io/` with no base path — the workflow detects this automatically.

### Option B: Manual build

```bash
# For a project page at username.github.io/repo-name:
NEXT_PUBLIC_BASE_PATH=/repo-name bun run build

# For a user/org page at username.github.io:
bun run build
```

The static site will be in the `out/` directory. Upload the contents of `out/` to your static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

## Tech Stack

- **Next.js 16** with App Router and static export
- **TypeScript 5**
- **Tailwind CSS 4** with custom Resonance theme
- **Zustand** for state management
- **IndexedDB** for local audio/metadata storage
- **Media Session API** for OS integration
- **Z.ai SDK** for AI-powered recommendations (server-only)

## Privacy

All audio files are stored locally in your browser's IndexedDB. Nothing is uploaded to any server. The only data that leaves your device is the song title and artist name (sent to the recommendations API when that feature is enabled).

## License

MIT
