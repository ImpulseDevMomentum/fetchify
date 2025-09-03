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
- `-l, --lyrics` - Fetch lyrics for tracks (track command only)
- `-m, --metadata` - Fetch additional metadata (track command only)
- `-c, --cover` - Fetch cover art (track command only)

## Examples

```bash
# Fetch 5 tracks and download as MP3
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -a 5 -d -o downloads

# Export playlist to JSON
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -o playlist.json

# Download all tracks
npx ts-node index.ts playlist "https://open.spotify.com/playlist/..." -d -o downloads

# Fetch 1 track with metadata & track cover (without verbose output)
npx ts-node index.ts track "https://open.spotify.com/track/..." -m -c

# Fetch 1 track with metadata & cover (with verbose output)
npx ts-node index.ts track "https://open.spotify.com/track/..." -v -m -c

# Fetch and download a track (without verbose output) (Same as playlists, with -d flag, you have to pass a output path too)
npx ts-node index.ts track "https://open.spotify.com/track/..." -d -o downloads
```

## Issues (tho this is a fun project, so I wont fix it prob idk)

- Loads only 59 tracks from the playlist. If the playlist has fewer than 59 tracks, it will fetch and download them normally. If the playlist has more than 59 tracks, only the first 59 will be fetched/downloaded

- The fetching process could be faster

- Sometimes it incorrectly picks the recommended sections as authors (this happens less often with a full playlist, but more frequently when fetching a single track), such as "More of <author>", "Show All", or "Popular releases of <author>"


## Requirements

- Node.js
- TypeScript
- Chrome browser