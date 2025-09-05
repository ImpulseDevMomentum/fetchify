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

export { BinBrowser } from './browser';
export { PageManager } from './page';
export * from './types';

/**
 * Convenience function to create and launch a browser
 */
export async function createBrowser(config?: import('./types').BrowserConfig): Promise<import('./browser').BinBrowser> {
    const browser = new (await import('./browser')).BinBrowser(config);
    await browser.launch();
    return browser;
}