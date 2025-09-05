# Installation Guide

## Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Chrome browser** (for web scraping functionality)

## Installation Methods

### Method 1: Automatic Installation (Recommended)

#### For Linux/macOS:
```bash
chmod +x install.sh
./install.sh
```

#### For Windows:
```cmd
install.bat
```

### Method 2: Manual Installation

1. **Build the project:**
   ```bash
   npm install
   npm run build
   ```

2. **Install globally:**
   ```bash
   npm install -g .
   ```

### Method 3: NPM Link (Development)

If you want to link the local development version:
```bash
npm install
npm run build
npm link
```

## Verification

After installation, verify that fetchify is working:
```bash
fetchify --version
fetchify info
```

## Usage

Once installed, you can use `fetchify` command anywhere:

```bash
# Fetch YouTube video metadata
fetchify track "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -m -c

# Fetch Spotify track
fetchify track "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh" -m -c

# Download audio from YouTube
fetchify track "https://youtu.be/dQw4w9WgXcQ" -d -o downloads

# Fetch Spotify playlist
fetchify playlist "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" -a 10
```

## Troubleshooting

### Permission Errors (Linux/macOS)
If you get permission errors, try:
```bash
sudo npm install -g .
```

### Windows Installation Issues
- Run Command Prompt as Administrator
- Make sure Node.js and npm are in your PATH

### Command Not Found
If `fetchify` command is not found after installation:
1. Check if global npm bin directory is in your PATH:
   ```bash
   npm config get prefix
   ```
2. Add the npm global bin directory to your PATH environment variable

### Build Errors
If build fails:
1. Make sure you have TypeScript installed: `npm install -g typescript`
2. Try deleting `node_modules` and `package-lock.json`, then run `npm install`

### Manual Uninstallation

To uninstall fetchify:
```bash
npm uninstall -g fetchify
```

### Automatic Uninstallation (Recommended)

#### For Windows:
```
uninstall.bat
```

#### For Linux/macOS:
```
uninstall.sh
```

## Development Setup

For development without global installation:
```bash
npm install
npm run dev -- track "https://example.com/track" -m -c
```