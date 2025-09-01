import { BinBrowser } from '../binbrowser';
import { promises as fs } from 'fs';
import { join } from 'path';
import Track from '../types/track';

/**
 * Playlist fetcher that gets just the basic track info
 */
export class PlaylistFetcher {
    private browser: BinBrowser | null = null;

    async init(): Promise<void> {
        this.browser = new BinBrowser({
            headless: true
        });
        
        await this.browser.launch();
    }

    async fetchTracks(playlistUrl: string): Promise<Track[]> {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call init() first.');
        }

        try {
            console.log(`Navigating to: ${playlistUrl}`);
            await this.browser.goto(playlistUrl);

            // wait for a page to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('Extracting tracks...');
            const tracks = await this.browser.evaluate(() => {
                interface TrackData {
                    id: string;
                    title: string;
                    artist: string;
                    duration: number;
                    added_at: string;
                    spotify_url?: string;
                }
                
                const trackElements = document.querySelectorAll('[data-testid="tracklist-row"]');
                const tracks: TrackData[] = [];
                
                // for tests limit to first 5 tracks
                const maxTracks = Math.min(trackElements.length, 5);
                
                for (let i = 0; i < maxTracks; i++) {
                    const row = trackElements[i];
                    
                    try {
                        const titleEl = row.querySelector('[data-testid="internal-track-link"]');
                        const title = titleEl?.textContent?.trim() || `Track ${i + 1}`;
                        
                        const artistEls = row.querySelectorAll('span[dir="auto"] a');
                        const artists: string[] = [];
                        artistEls.forEach(el => {
                            const artist = el.textContent?.trim();
                            if (artist) artists.push(artist);
                        });
                        const artist = artists.length > 0 ? artists.join(', ') : 'Unknown Artist';
                        
                        const link = titleEl?.getAttribute('href') || '';
                        const idMatch = link.match(/track\/([a-zA-Z0-9]+)/);
                        const id = idMatch ? idMatch[1] : `track_${i}`;
                        const spotify_url = id.startsWith('track_') ? '' : `https://open.spotify.com/track/${id}`;
                        
                        tracks.push({
                            id,
                            title,
                            artist,
                            duration: 0,
                            added_at: new Date().toISOString(),
                            spotify_url
                        });
                        
                        console.log(`Found track: ${title} by ${artist}`);
                        
                    } catch (error) {
                        console.warn(`Error extracting track ${i}:`, error);
                    }
                }
                
                return tracks;
            }) as Track[];

            console.log(`Extracted ${tracks.length} tracks`);
            
            // Save to cache
            await this.saveToCache(tracks);
            
            return tracks;

        } catch (error) {
            console.error('Error fetching tracks:', error);
            throw error;
        }
    }

    private async saveToCache(tracks: Track[]): Promise<void> {
        try {
            const cacheDir = join(process.cwd(), 'cache', 'tracks');
            await fs.mkdir(cacheDir, { recursive: true });
            
            const tracksJsonPath = join(cacheDir, 'tracks.json');
            await fs.writeFile(tracksJsonPath, JSON.stringify(tracks, null, 2));
            
            console.log(`Saved ${tracks.length} tracks to: ${tracksJsonPath}`);
        } catch (error) {
            console.warn('Failed to save to cache:', error);
        }
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export async function fetchPlaylist(playlistUrl: string): Promise<Track[]> {
    const fetcher = new PlaylistFetcher();
    
    try {
        await fetcher.init();
        const tracks = await fetcher.fetchTracks(playlistUrl);
        return tracks;
    } finally {
        await fetcher.close();
    }
}