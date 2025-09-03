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
 * Track fetcher that gets detailed info about a single track
 */
export class TrackFetcher {
    private browser: BinBrowser | null = null;

    async init(): Promise<void> {
        this.browser = new BinBrowser({
            headless: true
        });
        
        await this.browser.launch();
    }

    async fetchTrack(trackUrl: string, options: {
        metadata?: boolean;
        cover?: boolean;
    } = {}): Promise<Track & { cover_url?: string; album?: string; release_date?: string; popularity?: number }> {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call init() first.');
        }

        try {
            console.log(`Navigating to: ${trackUrl}`);
            await this.browser.goto(trackUrl);

            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('Extracting track information...');
            const trackData = await this.browser.evaluate((opts: {
                metadata?: boolean;
                cover?: boolean;
            }) => {
                let title = 'Unknown Track';
                
                const mainContent = document.querySelector('main, .main-view-container, [data-testid="track-page"]');
                
                if (mainContent) {
                    const mainTitleSelectors = [
                        'h1',
                        '[data-testid="entityTitle"]',
                        '.main-entityHeader-title'
                    ];
                    
                    for (const selector of mainTitleSelectors) {
                        const titleEl = mainContent.querySelector(selector);
                        if (titleEl && titleEl.textContent?.trim()) {
                            const potentialTitle = titleEl.textContent.trim();
                            
                            if (potentialTitle.length > 2 && 
                                !potentialTitle.toLowerCase().includes('biblioteka') &&
                                !potentialTitle.toLowerCase().includes('library') &&
                                !potentialTitle.toLowerCase().includes('spotify') &&
                                !potentialTitle.toLowerCase().includes('premium') &&
                                !potentialTitle.toLowerCase().includes('poszukaj') &&
                                !potentialTitle.toLowerCase().includes('search')) {
                                title = potentialTitle;
                                break;
                            }
                        }
                    }
                }
                
                if (title === 'Unknown Track') {
                    const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"]');
                    if (metaTitle) {
                        const content = metaTitle.getAttribute('content');
                        if (content) {
                            if (content.includes(' by ')) {
                                title = content.split(' by ')[0].trim();
                            } else if (content.includes(' - ')) {
                                title = content.split(' - ')[0].trim();
                            } else {
                                title = content.trim();
                            }
                            
                            
                            if (title.toLowerCase().includes('biblioteka') || 
                                title.toLowerCase().includes('library') ||
                                title.includes('Spotify')) {
                                title = 'Unknown Track';
                            }
                        }
                    }
                }
                

                if (title === 'Unknown Track') {
                    const currentUrl = window.location.href;
                    if (currentUrl.includes('/track/')) {
                        title = 'Track (URL detected)';
                    }
                }

                let artists: string[] = [];
                
                if (mainContent) {
                    const mainArtistSection = mainContent.querySelector('.main-entityHeader-subtitle, .main-trackInfo-artists, [data-testid="creator"]');
                    if (mainArtistSection) {
                        const artistLinks = mainArtistSection.querySelectorAll('a[href*="/artist/"]');
                        for (const artistEl of artistLinks) {
                            const artistName = artistEl.textContent?.trim();
                            if (artistName && !artists.includes(artistName)) {
                                artists.push(artistName);
                            }
                        }
                    }
                    
                    if (artists.length === 0) {
                        const mainArtistLinks = mainContent.querySelectorAll('a[href*="/artist/"]');
                        
                        const seenArtists = new Set<string>();
                        for (let i = 0; i < Math.min(mainArtistLinks.length, 10); i++) {
                            const artistEl = mainArtistLinks[i];
                            const artistName = artistEl.textContent?.trim();
                            
                            if (artistName && !seenArtists.has(artistName) && artistName.length > 1) {
                                const parentText = artistEl.parentElement?.parentElement?.textContent || '';
                                
                                const isSidebarOrRecommendation = 
                                    parentText.toLowerCase().includes('recommended') || 
                                    parentText.toLowerCase().includes('fans also like') ||
                                    parentText.toLowerCase().includes('popular tracks') ||
                                    parentText.toLowerCase().includes('biblioteka') ||
                                    parentText.toLowerCase().includes('library') ||
                                    artistEl.closest('.sidebar, [data-testid="nav-bar"]');
                                
                                if (!isSidebarOrRecommendation) {
                                    artists.push(artistName);
                                    seenArtists.add(artistName);
                                    
                                    if (artists.length >= 8) break;
                                }
                            }
                        }
                    }
                }
                
                const artist = artists.length > 0 ? artists.join(', ') : 'Unknown Artist';

                const currentUrl = window.location.href;
                const idMatch = currentUrl.match(/track\/([a-zA-Z0-9]+)/);
                const id = idMatch ? idMatch[1] : 'unknown';

                let album = '';
                let release_date = '';
                let popularity = 0;
                
                if (opts.metadata) {
                    const albumLink = document.querySelector('a[href*="/album/"]');
                    if (albumLink && albumLink.textContent?.trim()) {
                        album = albumLink.textContent.trim();
                    }
                    
                    const metadataTexts = document.querySelectorAll('.main-trackInfo-container span, [data-testid="track-page"] span');
                    for (const el of metadataTexts) {
                        const text = el.textContent?.trim() || '';
                        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
                        if (yearMatch) {
                            release_date = yearMatch[0];
                            break;
                        }
                    }
                    
                    if (!release_date) {
                        const allText = document.body.textContent || '';
                        const dateMatch = allText.match(/•\s*(\d{4})\s*•/);
                        if (dateMatch) {
                            release_date = dateMatch[1];
                        }
                    }
                }
                let cover_url = '';
                if (opts.cover) {
                    const coverEl = document.querySelector('img[data-testid="cover-art"], img[src*="i.scdn.co"]');
                    cover_url = coverEl?.getAttribute('src') || '';
                }

                return {
                    id,
                    title,
                    artist,
                    duration: 0,
                    added_at: new Date().toISOString(),
                    spotify_url: currentUrl,
                    ...(opts.metadata && { album, release_date, popularity }),
                    ...(opts.cover && { cover_url })
                };
            }, options) as Track & { 
                album?: string; 
                release_date?: string; 
                popularity?: number; 
                cover_url?: string; 
            };

            const result = {
                ...trackData,
            };

            console.log(`Successfully fetched track: ${result.title} by ${result.artist}`);
            return result;

        } catch (error) {
            console.error('Error fetching track:', error);
            throw error;
        }
    }

    private async saveToCache(track: any): Promise<void> {
        try {
            const cacheDir = join(process.cwd(), 'cache', 'tracks');
            await fs.mkdir(cacheDir, { recursive: true });
            
            const trackJsonPath = join(cacheDir, `${track.id}.json`);
            await fs.writeFile(trackJsonPath, JSON.stringify(track, null, 2));
            
            console.log(`Saved track to: ${trackJsonPath}`);
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

export async function fetchTrack(trackUrl: string, options: {
    metadata?: boolean;
    cover?: boolean;
} = {}): Promise<Track & { cover_url?: string; album?: string; release_date?: string; popularity?: number }> {
    const fetcher = new TrackFetcher();
    
    try {
        await fetcher.init();
        const track = await fetcher.fetchTrack(trackUrl, options);
        return track;
    } finally {
        await fetcher.close();
    }
}