#!/usr/bin/env node

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

import { Command } from 'commander';
import { fetchPlaylist } from './src/fetchers/playlist';
import { fetchTrack } from './src/fetchers/track';
import { downloadTracks } from './src/ddownload';

const program = new Command();

const ansci_logo = `
 ______   ______     ______   ______     __  __     __     ______   __  __    
/\  ___\ /\  ___\   /\__  _\ /\  ___\   /\ \_\ \   /\ \   /\  ___\ /\ \_\ \   
\ \  __\ \ \  __\   \/_/\ \/ \ \ \____  \ \  __ \  \ \ \  \ \  __\ \ \____ \  
 \ \_\    \ \_____\    \ \_\  \ \_____\  \ \_\ \_\  \ \_\  \ \_\    \/\_____\ 
  \/_/     \/_____/     \/_/   \/_____/   \/_/\/_/   \/_/   \/_/     \/_____/ 
                                                                              
`;

program
    .name('fetchify')
    .description('Fetch Spotify playlist & track data without the use of the official API')
    .version('1.0.0');

program
    .command('playlist')
    .description('Fetch a Spotify playlist')
    .argument('<url>', 'Spotify playlist URL')
    .option('-o, --output <path>', 'Output directory/file (JSON format)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-a, --amount <number>', 'Amount of tracks to fetch (default: auto)', 'auto')
    .option('-d, --download', 'Download MP3 files instead of saving JSON')
    .action(async (url: string, options: { output?: string; verbose?: boolean; amount?: string; download?: boolean }) => {
        try {
            if (options.verbose) {
                console.log(ansci_logo);
                console.log('Starting playlist fetch...');
                console.log(`URL: ${url}`);
            }

            if (!url.includes('open.spotify.com/playlist/')) {
                console.error('Error: Please provide a valid Spotify playlist URL');
                process.exit(1);
            }

            // console.log('Initializing browser...');
            
            let amountToFetch: number | undefined;
            if (options.amount && options.amount !== 'auto') {
                amountToFetch = parseInt(options.amount);
                if (isNaN(amountToFetch) || amountToFetch <= 0) {
                    console.error('Error: Amount must be a positive number or "auto"');
                    process.exit(1);
                }
            }
            
            const tracks = await fetchPlaylist(url, amountToFetch);
                        
            if (options.verbose) {
                console.log(`Successfully fetched ${tracks.length} tracks`);

                const tracksWithImages = tracks.filter((track: any) => track.image_url).length;
                if (tracksWithImages > 0) {
                    console.log(`Tracks with images: ${tracksWithImages}`);
                    console.log(`Images cached in: cache/images/images.json`);
                }
            }

            if (options.download) {
                if (!options.output) {
                    console.error('Error: Download mode requires --output directory to be specified');
                    process.exit(1);
                }
                
                // console.log(`\nDownload mode enabled. Fetching MP3 files...`);
                const downloadResult = await downloadTracks(tracks, options.output);
                
                if (options.verbose) {
                    console.log(`\nDownload Summary:`);
                    console.log(`✓ Successfully downloaded: ${downloadResult.successful} tracks`);
                    console.log(`✗ Failed downloads: ${downloadResult.failed} tracks`);
                    console.log(`📁 Output directory: ${options.output}`);
                }
            } else {
                const output = {
                    tracks,
                    fetchedAt: new Date().toISOString(),
                    stats: {
                        trackCount: tracks.length,
                        totalDuration: tracks.reduce((sum: number, track: any) => sum + track.duration, 0)
                    }
                };

                if (options.output) {
                    const fs = await import('fs/promises');
                    await fs.writeFile(options.output, JSON.stringify(output, null, 2));
                    console.log(`Playlist data saved to: ${options.output}`);
                } else {
                    console.log('\n=== TRACKS DATA ===');
                    console.log(JSON.stringify(output, null, 2));
                }
            }

        } catch (error) {
            console.error('Error fetching playlist:', error);
            process.exit(1);
        }
    });

program.command('track')
    .description('Fetch a Spotify track')
    .argument('<url>', 'Spotify track URL')
    .option('-o, --output <path>', 'Output directory/file (JSON format)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-m, --metadata', 'Fetch metadata for the track')
    .option('-d, --download', 'Download MP3 files instead of saving JSON')
    .option('-c, --cover', 'Fetch cover for the track')
    .action(async (url: string, options: { 
        output?: string; 
        verbose?: boolean; 
        metadata?: boolean; 
        download?: boolean; 
        cover?: boolean;
    }) => {
        try {
            if (options.verbose) {
                console.log(ansci_logo);
                console.log('Starting track fetch...');
                console.log(`URL: ${url}`);
            }

            if (!url.includes('open.spotify.com/track/')) {
                console.error('Error: Please provide a valid Spotify track URL');
                process.exit(1);
            }

            // console.log('Initializing browser...');
            
            const trackOptions = {
                metadata: options.metadata || false,
                cover: options.cover || false
            };
            
            const track = await fetchTrack(url, trackOptions);
            
            if (options.verbose) {
                console.log(`Successfully fetched track: ${track.title} by ${track.artist}`);
                if (track.album) console.log(`Album: ${track.album}`);
                if (track.release_date) console.log(`Released: ${track.release_date}`);
                if (track.cover_url) console.log(`Cover available: ${track.cover_url ? 'Yes' : 'No'}`);
            }

            if (options.download) {
                if (!options.output) {
                    console.error('Error: Download mode requires --output directory to be specified');
                    process.exit(1);
                }
                
                // console.log(`\nDownload mode enabled. Fetching MP3 file...`);
                const downloadResult = await downloadTracks([track], options.output, options.verbose);
                
                if (options.verbose) {
                    console.log(`\nDownload Summary:`);
                    console.log(`Successfully downloaded: ${downloadResult.successful} track`);
                    console.log(`Failed downloads: ${downloadResult.failed} track`);
                    console.log(`Output directory: ${options.output}`);
                }
            } else {
                const output = {
                    track,
                    fetchedAt: new Date().toISOString(),
                    options: trackOptions
                };

                if (options.output) {
                    const fs = await import('fs/promises');
                    await fs.writeFile(options.output, JSON.stringify(output, null, 2));
                    console.log(`Track data saved to: ${options.output}`);
                } else {
                    console.log('\n=== TRACK DATA ===');
                    console.log(JSON.stringify(output, null, 2));
                }
            }

        } catch (error) {
            console.error('Error fetching track:', error);
            process.exit(1);
        }
    });

program
    .command('info')
    .description('Show information about fetchify')
    .action(() => {
        console.log(ansci_logo);
        console.log('Fetchify - Spotify Fetcher');
        console.log('Fetch Spotify playlist data without using the official API');
        console.log('\nFeatures:');
        console.log('- Fetch track information from playlists');
        console.log('- Fetch track information from tracks');
        console.log('- Download MP3 files from YouTube');
        console.log('- Export to JSON format');
        console.log('- Configurable track limits');
        console.log('- Fetch track cover');
        console.log('- Fetch track metadata');
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}