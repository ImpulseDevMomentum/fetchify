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
