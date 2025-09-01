#!/usr/bin/env node

import { Command } from 'commander';
import { fetchPlaylist } from './src/fetchers/playlist';

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
    .description('Fetch Spotify playlist data without the use of the official API')
    .version('1.0.0');

program
    .command('playlist')
    .description('Fetch a Spotify playlist')
    .argument('<url>', 'Spotify playlist URL')
    .option('-o, --output <file>', 'Output file (JSON format)')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (url: string, options: { output?: string; verbose?: boolean }) => {
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

            console.log('Initializing browser...');
            console.log('Note: A browser window will open. Please ensure you are logged into Spotify.');
            
            const tracks = await fetchPlaylist(url);
            
            if (options.verbose) {
                console.log(`Successfully fetched ${tracks.length} tracks`);

                const tracksWithImages = tracks.filter(track => track.image_url).length;
                if (tracksWithImages > 0) {
                    console.log(`Tracks with images: ${tracksWithImages}`);
                    console.log(`Images cached in: cache/images/images.json`);
                }
            }

            const output = {
                tracks,
                fetchedAt: new Date().toISOString(),
                stats: {
                    trackCount: tracks.length,
                    totalDuration: tracks.reduce((sum, track) => sum + track.duration, 0)
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

        } catch (error) {
            console.error('Error fetching playlist:', error);
            process.exit(1);
        }
    });

program
    .command('info')
    .description('Show information about the tool')
    .action(() => {
        console.log('Fetchify - Spotify Playlist Fetcher');
        console.log('');
        console.log('This tool uses a headless browser to scrape Spotify playlist data.');
        console.log('Requirements:');
        console.log('- You must be logged into Spotify in your default browser');
        console.log('- The playlist must be publicly accessible');
        console.log('');
        console.log('Usage:');
        console.log('  fetchify playlist <url>              Fetch playlist and display data');
        console.log('  fetchify playlist <url> -o data.json Save playlist data to file');
        console.log('  fetchify playlist <url> -v           Enable verbose output');
        console.log('');
        console.log('Example:');
        console.log('  fetchify playlist https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}