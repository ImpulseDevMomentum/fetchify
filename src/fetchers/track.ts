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
import { DEV_MODE } from '../util/constants';

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

    private isYouTubeUrl(url: string): boolean {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    private extractYouTubeVideoId(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    async fetchTrack(trackUrl: string, options: {
        metadata?: boolean;
        cover?: boolean;
    } = {}): Promise<Track & { cover_url?: string; album?: string; release_date?: string; popularity?: number }> {
        if (!this.browser) {
            throw new Error('Browser not initialized. Call init() first.');
        }

        if (this.isYouTubeUrl(trackUrl)) {
            return this.fetchYouTubeTrack(trackUrl, options);
        }

        try {
            if (DEV_MODE) { console.log(`Navigating to: ${trackUrl}`); }
            await this.browser.goto(trackUrl);

            await new Promise(resolve => setTimeout(resolve, 3000));

            if (DEV_MODE) { console.log('Extracting track information...'); }
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

            if (DEV_MODE) { console.log(`Successfully fetched track: ${result.title} by ${result.artist}`); }
            return result;

        } catch (error) {
            console.error('Error fetching track:', error);
            throw error;
        }
    }

    private async fetchYouTubeTrack(trackUrl: string, options: {
        metadata?: boolean;
        cover?: boolean;
    } = {}): Promise<Track & { cover_url?: string; album?: string; release_date?: string; popularity?: number }> {
        try {
            if (DEV_MODE) { console.log(`Navigating to YouTube: ${trackUrl}`); }
            await this.browser!.goto(trackUrl);

            await new Promise(resolve => setTimeout(resolve, 4000));

            if (DEV_MODE) { console.log('Extracting YouTube track information...'); }
            const trackData = await this.browser!.evaluate((opts: {
                metadata?: boolean;
                cover?: boolean;
            }) => {
                let title = 'Unknown Track';
                let artist = 'Unknown Artist';
                let cover_url = '';
                let album = '';
                let release_date = '';
                let popularity = 0;

                const titleSelectors = [
                    'h1.ytd-watch-metadata yt-formatted-string',
                    'h1.style-scope.ytd-watch-metadata yt-formatted-string',
                    'h1 yt-formatted-string',
                    'meta[property="og:title"]'
                ];

                for (const selector of titleSelectors) {
                    const titleEl = document.querySelector(selector);
                    if (titleEl) {
                        if (selector.includes('meta')) {
                            const content = titleEl.getAttribute('content');
                            if (content && content.trim()) {
                                title = content.trim();
                                break;
                            }
                        } else {
                            const text = titleEl.textContent?.trim();
                            if (text && text.length > 2) {
                                title = text;
                                break;
                            }
                        }
                    }
                }

                const channelSelectors = [
                    '#channel-name a',
                    '.ytd-channel-name a',
                    'yt-formatted-string.ytd-channel-name a',
                    '#upload-info #channel-name a'
                ];

                for (const selector of channelSelectors) {
                    const channelEl = document.querySelector(selector);
                    if (channelEl && channelEl.textContent?.trim()) {
                        artist = channelEl.textContent.trim();
                        break;
                    }
                }

                if (artist === 'Unknown Artist') {
                    const titlePatterns = [
                        /^(.+?)\s*[-–]\s*(.+?)$/,  // "Artist - Title" or "Artist – Title"
                        /^(.+?)\s*[:|]\s*(.+?)$/, // "Artist: Title" or "Artist | Title"
                        /(.+?)\s*by\s*(.+?)$/i,   // "Title by Artist"
                        /(.+?)\s*ft\.?\s*(.+?)$/i // "Title ft. Artist"
                    ];

                    for (const pattern of titlePatterns) {
                        const match = title.match(pattern);
                        if (match) {
                            if (pattern.toString().includes('by')) {
                                title = match[1].trim();
                                artist = match[2].trim();
                            } else {
                                artist = match[1].trim();
                                title = match[2].trim();
                            }
                            break;
                        }
                    }
                }

                const currentUrl = window.location.href;
                const videoIdMatch = currentUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
                const id = videoIdMatch ? videoIdMatch[1] : 'unknown';

                if (opts.cover) {
                    const thumbnailSelectors = [
                        'meta[property="og:image"]',
                        'link[rel="image_src"]',
                        'meta[name="twitter:image"]'
                    ];

                    for (const selector of thumbnailSelectors) {
                        const thumbnailEl = document.querySelector(selector);
                        if (thumbnailEl) {
                            const content = thumbnailEl.getAttribute('content') || thumbnailEl.getAttribute('href');
                            if (content) {
                                cover_url = content;
                                break;
                            }
                        }
                    }

                    if (!cover_url && id !== 'unknown') {
                        cover_url = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
                    }
                }

                if (opts.metadata) {
                    const dateSelectors = [
                        'meta[itemprop="datePublished"]',
                        'meta[itemprop="uploadDate"]'
                    ];

                    for (const selector of dateSelectors) {
                        const dateEl = document.querySelector(selector);
                        if (dateEl) {
                            const dateContent = dateEl.getAttribute('content');
                            if (dateContent) {
                                const date = new Date(dateContent);
                                release_date = date.getFullYear().toString();
                                break;
                            }
                        }
                    }

                    if (!release_date) {
                        const descriptionEl = document.querySelector('meta[name="description"]');
                        if (descriptionEl) {
                            const desc = descriptionEl.getAttribute('content') || '';
                            const yearMatch = desc.match(/\b(19|20)\d{2}\b/);
                            if (yearMatch) {
                                release_date = yearMatch[0];
                            }
                        }
                    }
                }

                return {
                    id,
                    title,
                    artist,
                    duration: 0,
                    added_at: new Date().toISOString(),
                    youtube_url: currentUrl,
                    ...(opts.metadata && { album, release_date, popularity }),
                    ...(opts.cover && { cover_url })
                };
            }, options) as Track & { 
                album?: string; 
                release_date?: string; 
                popularity?: number; 
                cover_url?: string; 
            };

            console.log(`Successfully fetched YouTube track: ${trackData.title} by ${trackData.artist}`);
            return trackData;

        } catch (error) {
            console.error('Error fetching YouTube track:', error);
            throw error;
        }
    }

    private async saveToCache(track: any): Promise<void> {
        try {
            const cacheDir = join(process.cwd(), 'cache', 'tracks');
            await fs.mkdir(cacheDir, { recursive: true });
            
            const trackJsonPath = join(cacheDir, `${track.id}.json`);
            await fs.writeFile(trackJsonPath, JSON.stringify(track, null, 2));
            
            if (DEV_MODE) { console.log(`Saved track to: ${trackJsonPath}`); }
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

/**
 * Fetches track information from Spotify or YouTube URLs
 * 
 * @param trackUrl - Spotify track URL or YouTube video URL
 * @param options - Optional settings for metadata and cover extraction
 * @param options.metadata - Whether to extract additional metadata (album, release date, etc.)
 * @param options.cover - Whether to extract cover/thumbnail URL
 * @returns Promise resolving to track information with optional extended metadata
 */
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