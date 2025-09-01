# fetchify

API-free Spotify playlist downloader.

## Installation

```bash
npm install
```

## Usage

Fetch playlist metadata:
```bash
npx ts-node index.ts playlist <spotify-playlist-url>
```

Download MP3 files:
```bash
npx ts-node index.ts playlist <spotify-playlist-url> -d -o downloads
```

Options:
- `-a, --amount <number>` - Number of tracks to fetch (default: auto)
- `-o, --output <path>` - Output directory or file
- `-d, --download` - Download MP3 files instead of JSON
- `-v, --verbose` - Enable detailed logging

## Examples

```bash
# Fetch 5 tracks and download as MP3
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -a 5 -d -o downloads

# Export playlist to JSON
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -o playlist.json

# Download all tracks with progress bar
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -d -o downloads
```

## Requirements

- Node.js
- TypeScript
- Chrome browser