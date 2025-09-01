import { promises as fs } from 'fs';
import { join } from 'path';
import { createWriteStream } from 'fs';
import Track from '../types/track';
import ytdl from '@distube/ytdl-core';
import { progress } from '../util/progress';

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
            console.log(`🎵 Downloading audio from: ${videoUrl}`);
            
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
                console.log(`✅ Audio downloaded successfully`);
                resolve(true);
            });
            
            stream.pipe(writeStream);
            
        } catch (error) {
            console.error('Download setup error:', error);
            reject(error);
        }
    });
}

async function downloadMp3(track: Track, outputDir: string): Promise<DownloadResult> {
    try {
        const safeTitle = track.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const safeArtist = track.artist.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const filename = `${safeArtist}_-_${safeTitle}.mp3`;
        const filepath = join(outputDir, filename);
        
        console.log(`🔍 Searching: ${track.artist} - ${track.title}`);
        
        const searchQuery = `${track.artist} ${track.title}`;
        const videoId = await searchYouTube(searchQuery);
        
        if (!videoId) {
            console.log(`❌ No YouTube video found for: ${track.title}`);
            return { success: false, error: 'No YouTube video found' };
        }
        
        console.log(`📺 Found video ID: ${videoId}`);
        
        const success = await downloadAudioFromYouTube(videoId, filepath);
        
        if (success) {
            console.log(`✅ Downloaded: ${filename}`);
            return { success: true, filename };
        } else {
            console.log(`⚠️  Created placeholder for: ${filename}`);
            return { success: false, error: 'API conversion failed, placeholder created' };
        }
        
    } catch (error) {
        console.error(`❌ Failed to download ${track.title}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function downloadTracks(tracks: Track[], outputDir: string): Promise<{ successful: number; failed: number }> {
    await fs.mkdir(outputDir, { recursive: true });
    
    let successful = 0;
    let failed = 0;
    
    progress(0, 50);
    
    for (const track of tracks) {
        const result = await downloadMp3(track, outputDir);
        if (result.success) {
            successful++;
        } else {
            failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('=' .repeat(50));
    console.log(`Download complete! ✅ ${successful} successful, ⚠️  ${failed} placeholders`);
    
    return { successful, failed };
}

export { downloadMp3, downloadTracks };