/**
 
Copyright (c) 2025 thximpulse

This software is provided for personal and commercial use AS IS, with the following conditions:

You are allowed to use this code in your own projects and run it on your servers.
You are NOT allowed to modify, alter, or create derivative works based on this code.
You are NOT allowed to remove this copyright notice or claim this code as your own.
Redistribution of modified versions is strictly forbidden.
The software is provided "AS IS", without warranty of any kind. 
The authors are not responsible for any damage, loss, or issues caused by the use of this software.
*/

import { BinBrowser } from '../binbrowser';
import { promises as fs } from 'fs';
import { join } from 'path';
import Track from '../types/track';

/**
 * Playlist fetcher that gets the job done
 */
export class PlaylistFetcher {
    private browser: BinBrowser | null = null;

    async init(): Promise<void> {
        this.browser = new BinBrowser({
            headless: true
        });
        
        await this.browser.launch();
    }

    async fetchTracks(playlistUrl: string, amount?: number): Promise<Track[]> {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call init() first.');
        }

        try {
            console.log(`Navigating to: ${playlistUrl}`);
            await this.browser.goto(playlistUrl);

            await new Promise(resolve => setTimeout(resolve, 3000));
            
            
            if (!amount) {
                console.log('Auto mode: scrolling to load all tracks...');
                await this.scrollToLoadAllTracks();
            }

            console.log('Extracting tracks...');
            const tracks = await this.browser.evaluate((requestedAmount: number | undefined) => {   
                interface TrackData {
                    id: string;
                    title: string;
                    artist: string;
                    duration: number;
                    added_at: string;
                    spotify_url?: string;
                }
                
                let totalPlaylistTracks = 0;
                const metadataElements = document.querySelectorAll('[data-testid="playlist-page"] span, .main-entityHeader-subtitle span, [data-testid="entityTitle"] span');
                for (const element of metadataElements) {
                    const text = element.textContent?.trim() || '';
                    const trackMatch = text.match(/(\d+)\s*(?:songs?|utworów?|tracks?)/i);
                    if (trackMatch) {
                        totalPlaylistTracks = parseInt(trackMatch[1]);
                        console.log(`Auto-detected ${totalPlaylistTracks} tracks in playlist metadata`);
                        break;
                    }
                }
                
                const trackElements = document.querySelectorAll('[data-testid="tracklist-row"]');
                const tracks: TrackData[] = [];
                
                console.log(`Found ${trackElements.length} track elements on the page`);
                console.log(`Requested amount: ${requestedAmount}`);
                
                let maxTracks: number;
                if (requestedAmount && requestedAmount > 0) {
                    maxTracks = Math.min(trackElements.length, requestedAmount);
                    console.log(`Fetching ${maxTracks} tracks (user requested ${requestedAmount})`);
                } else {
                    if (totalPlaylistTracks > 0) {
                        maxTracks = Math.min(trackElements.length, totalPlaylistTracks);
                        console.log(`Auto mode: fetching ${maxTracks} tracks (playlist has ${totalPlaylistTracks})`);
                    } else {
                        maxTracks = trackElements.length;
                        console.log(`Auto mode fallback: fetching all ${maxTracks} available tracks (couldn't detect playlist size)`);
                    }
                }
                
                for (let i = 0; i < maxTracks; i++) {
                    const row = trackElements[i];
                    
                    try {
                        const titleEl = row.querySelector('[data-testid="internal-track-link"]');
                        const title = titleEl?.textContent?.trim() || `Track ${i + 1}`;
                        
                         let artists: string[] = [];
                         
                         const artistLinks = row.querySelectorAll('a[href*="/artist/"]');
                         artistLinks.forEach(el => {
                             const artistName = el.textContent?.trim();
                             if (artistName && !artists.includes(artistName)) {
                                 artists.push(artistName);
                             }
                         });
                         
                         if (artists.length === 0) {
                             const altArtistEls = row.querySelectorAll('span[dir="auto"] a, [data-testid="internal-track-link"] + span a');
                             altArtistEls.forEach(el => {
                                 const artistName = el.textContent?.trim();
                                 if (artistName && !artistName.includes('・') && !artists.includes(artistName)) {
                                     artists.push(artistName);
                                 }
                             });
                         }
                         
                         if (artists.length === 0) {
                             const spanElements = row.querySelectorAll('span[dir="auto"]');
                             for (const span of spanElements) {
                                 const text = span.textContent?.trim();
                                 if (text && text !== title && !text.includes('album') && text.length > 1) {
                                     const innerLinks = span.querySelectorAll('a');
                                     if (innerLinks.length > 0) {
                                         innerLinks.forEach(link => {
                                             const artistName = link.textContent?.trim();
                                             if (artistName && !artists.includes(artistName)) {
                                                 artists.push(artistName);
                                             }
                                         });
                                     }
                                 }
                             }
                         }
                         
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
                         if (artist === 'Unknown Artist') {
                             console.log(`DEBUG: Could not find artist for track "${title}"`);
                         }
                        
                    } catch (error) {
                        console.warn(`Error extracting track ${i}:`, error);
                    }
                }
                
                return tracks;
            }, amount) as Track[];

            console.log(`Extracted ${tracks.length} tracks`);
            
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

    private async scrollToLoadAllTracks(): Promise<void> {
        if (!this.browser) return;

        const trackInfo = await this.browser.evaluate(() => {
            let expectedTrackCount = 0;
            const metadataElements = document.querySelectorAll('[data-testid="playlist-page"] span, .main-entityHeader-subtitle span, [data-testid="entityTitle"] span');
            for (const element of metadataElements) {
                const text = element.textContent?.trim() || '';
                const trackMatch = text.match(/(\d+)\s*(?:songs?|utworów?|tracks?)/i);
                if (trackMatch) {
                    expectedTrackCount = parseInt(trackMatch[1]);
                    break;
                }
            }
            
            const currentTrackCount = document.querySelectorAll('[data-testid="tracklist-row"]').length;
            return { expectedTracks: expectedTrackCount, currentTracks: currentTrackCount };
        }) as { expectedTracks: number; currentTracks: number };

        console.log(`Expected tracks: ${trackInfo.expectedTracks}, Currently loaded: ${trackInfo.currentTracks}`);

        if (trackInfo.expectedTracks === 0) {
            console.log('Could not detect expected track count - will scroll to load more');
        } else if (trackInfo.currentTracks >= trackInfo.expectedTracks) {
            console.log('All tracks already loaded, no scrolling needed');
            return;
        } else {
            console.log(`Need to load ${trackInfo.expectedTracks - trackInfo.currentTracks} more tracks`);
        }

        let previousTrackCount = trackInfo.currentTracks;
        let stableScrollCount = 0;
        const maxStableScrolls = 5;
        const maxScrolls = 100;
        let scrollCount = 0;

        while (scrollCount < maxScrolls && stableScrollCount < maxStableScrolls) {
            await this.browser.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
                
                const mainContent = document.querySelector('[data-testid="playlist-page"]') || 
                                   document.querySelector('main') || 
                                   document.querySelector('.main-view-container');
                if (mainContent) {
                    mainContent.scrollTop = mainContent.scrollHeight;
                }
                
                const tracklist = document.querySelector('[data-testid="playlist-tracklist"]') ||
                                 document.querySelector('.tracklist-container');
                if (tracklist) {
                    tracklist.scrollTop = tracklist.scrollHeight;
                }
                
                window.scrollBy(0, window.innerHeight);
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentTrackCount = await this.browser.evaluate(() => {
                return document.querySelectorAll('[data-testid="tracklist-row"]').length;
            }) as number;

            console.log(`Scroll ${scrollCount + 1}: Found ${currentTrackCount} tracks (+${currentTrackCount - previousTrackCount})`);

            if (trackInfo.expectedTracks > 0 && currentTrackCount >= trackInfo.expectedTracks) {
                console.log(`Reached expected track count (${trackInfo.expectedTracks}), stopping scroll`);
                break;
            }

            if (currentTrackCount === previousTrackCount) {
                stableScrollCount++;
                console.log(`No new tracks loaded (${stableScrollCount}/${maxStableScrolls})`);
            } else {
                stableScrollCount = 0;
            }

            previousTrackCount = currentTrackCount;
            scrollCount++;
        }

        console.log(`Finished scrolling. Total scrolls: ${scrollCount}, Final track count: ${previousTrackCount}`);
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export async function fetchPlaylist(playlistUrl: string, amount?: number): Promise<Track[]> {
    const fetcher = new PlaylistFetcher();
    
    try {
        await fetcher.init();
        const tracks = await fetcher.fetchTracks(playlistUrl, amount);
        return tracks;
    } finally {
        await fetcher.close();
    }
}