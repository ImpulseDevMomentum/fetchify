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

import { promises as fs } from 'fs';
import { join } from 'path';
import { createWriteStream } from 'fs';
import Track from '../types/track';
import ytdl from '@distube/ytdl-core';
import { progress, showTitle, clearLine } from '../util/progress';

interface DownloadResult {
    success: boolean;
    filename?: string;
    error?: string;
}

async function searchYouTube(query: string): Promise<string | null> {
    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        const videoIdMatch = html.match(/"videoId":"([^"]+)"/);
        if (videoIdMatch && videoIdMatch[1]) {
            return videoIdMatch[1];
        }
        
        return null;
    } catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}

async function downloadAudioFromYouTube(videoId: string, outputPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(` Downloading audio from: ${videoUrl}`);
            
            const stream = ytdl(videoUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
            });
            
            const writeStream = createWriteStream(outputPath);
            
            stream.on('error', (error) => {
                console.error('Stream error:', error);
                reject(error);
            });
            
            writeStream.on('error', (error) => {
                console.error('Write error:', error);
                reject(error);
            });
            
            writeStream.on('finish', () => {
                console.log(`Audio downloaded successfully`);
                resolve(true);
            });
            
            stream.pipe(writeStream);
            
        } catch (error) {
            console.error('Download setup error:', error);
            reject(error);
        }
    });
}

async function downloadMp3(track: Track, outputDir: string, verbose = false): Promise<DownloadResult> {
    try {
        const safeTitle = track.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const safeArtist = track.artist.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const filename = `${safeArtist}_-_${safeTitle}.mp3`;
        const filepath = join(outputDir, filename);
        
        if (verbose) {
            console.log(`Searching: ${track.artist} - ${track.title}`);
        }
        
        const searchQuery = `${track.artist} ${track.title}`;
        const videoId = await searchYouTube(searchQuery);
        
        if (!videoId) {
            if (verbose) {
                console.log(`No YouTube video found for: ${track.title}`);
            }
            return { success: false, error: 'No YouTube video found' };
        }
        
        if (verbose) {
            console.log(`Found video ID: ${videoId}`);
        }
        
        const success = await downloadAudioFromYouTube(videoId, filepath);
        
        if (success) {
            if (verbose) {
                console.log(`Downloaded: ${filename}`);
            }
            return { success: true, filename };
        } else {
            if (verbose) {
                console.log(`Download failed for: ${filename}`);
            }
            return { success: false, error: 'Download failed' };
        }
        
    } catch (error) {
        console.error(`Failed to download ${track.title}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function downloadTracks(tracks: Track[], outputDir: string, verbose = false): Promise<{ successful: number; failed: number }> {
    await fs.mkdir(outputDir, { recursive: true });
    
    let successful = 0;
    let failed = 0;
    
    if (!verbose) {
        showTitle('Downloading music from YouTube');
    } else {
        console.log(`\nStarting download of ${tracks.length} tracks to: ${outputDir}`);
        console.log('Downloading real audio from YouTube (this may take a while)...');
        console.log('=' .repeat(50));
    }
    
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const progressPercent = (i / tracks.length) * 100;
        
        if (!verbose) {
            progress(progressPercent, 40, `Downloading (${i + 1}/${tracks.length})`);
        }
        
        const result = await downloadMp3(track, outputDir, verbose);
        if (result.success) {
            successful++;
        } else {
            failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!verbose) {
        progress(100, 40, `Complete (${tracks.length}/${tracks.length})`);
        console.log(`\nDownloaded: ${successful} tracks | Failed: ${failed} tracks`);
    } else {
        console.log('=' .repeat(50));
        console.log(`Download complete! ${successful} successful, ${failed} failed`);
    }
    
    return { successful, failed };
}

export { downloadMp3, downloadTracks };