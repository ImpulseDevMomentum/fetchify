# Fetchify

A CLI tool to fetch Spotify playlist data using browser cache storage.

## Requirements

- Node.js and npm installed
- You must be logged into Spotify in your browser
- Playlists must be publicly accessible

## Installation

```bash
npm install
npm run build
```

## Usage

### Fetch a playlist

```bash
npm run dev playlist <spotify-playlist-url>
```

### Save to file

```bash
npm run dev playlist <spotify-playlist-url> -o playlist-data.json
```

### Verbose output

```bash
npm run dev playlist <spotify-playlist-url> -v
```

### Show help

```bash
npm run dev info
```

## Example

```bash
npm run dev playlist https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

## How it works

This tool uses Puppeteer to open a browser window, navigate to the Spotify playlist page, and extract track information by scraping the DOM. It also attempts to access browser cache storage to retrieve cached images.

## Note

A browser window will open when you run the tool. Make sure you are logged into Spotify before running the command.