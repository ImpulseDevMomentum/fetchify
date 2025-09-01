import WebSocket from 'ws';
import { JSDOM } from 'jsdom';
import { BrowserConfig, NavigationOptions, ElementHandle, CacheEntry } from './types';

/**
 * Page manager using Chrome DevTools Protocol
 */
export class PageManager {
    private ws: WebSocket | null = null;
    private debugPort: number;
    private config: BrowserConfig;
    private messageId: number = 1;
    private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();

    constructor(debugPort: number, config: BrowserConfig) {
        this.debugPort = debugPort;
        this.config = config;
    }

    /**
     * Initialize connection to browser
     */
    async init(): Promise<void> {
        // Get available tabs
        const tabsResponse = await fetch(`http://localhost:${this.debugPort}/json`);
        const tabs = await tabsResponse.json();
        
        let targetTab = tabs.find((tab: any) => tab.type === 'page');
        
        if (!targetTab) {
            // Create new tab
            const newTabResponse = await fetch(`http://localhost:${this.debugPort}/json/new`);
            targetTab = await newTabResponse.json();
        }

        // Connect to WebSocket
        this.ws = new WebSocket(targetTab.webSocketDebuggerUrl);
        
        await new Promise((resolve, reject) => {
            if (!this.ws) return reject(new Error('WebSocket not created'));
            
            this.ws.on('open', resolve);
            this.ws.on('error', reject);
        });

        // Setup message handling
        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            
            if (message.id && this.pendingMessages.has(message.id)) {
                const { resolve, reject } = this.pendingMessages.get(message.id)!;
                this.pendingMessages.delete(message.id);
                
                if (message.error) {
                    reject(new Error(message.error.message));
                } else {
                    resolve(message.result);
                }
            }
        });

        // Enable necessary domains
        await this.sendCommand('Runtime.enable');
        await this.sendCommand('Page.enable');
        await this.sendCommand('DOM.enable');
        
        // Set viewport
        if (this.config.viewport) {
            await this.sendCommand('Emulation.setDeviceMetricsOverride', {
                width: this.config.viewport.width,
                height: this.config.viewport.height,
                deviceScaleFactor: 1,
                mobile: false
            });
        }

        // Set user agent
        if (this.config.userAgent) {
            await this.sendCommand('Network.setUserAgentOverride', {
                userAgent: this.config.userAgent
            });
        }

        console.log('Page manager initialized');
    }

    /**
     * Send command to browser
     */
    private async sendCommand(method: string, params?: any): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        const id = this.messageId++;
        const message = { id, method, params };

        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });
            this.ws!.send(JSON.stringify(message));
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error(`Command timeout: ${method}`));
                }
            }, this.config.timeout || 30000);
        });
    }

    /**
     * Navigate to URL
     */
    async goto(url: string, options: NavigationOptions = {}): Promise<void> {
        console.log(`Navigating to: ${url}`);
        
        await this.sendCommand('Page.navigate', { url });

        // Wait for load event
        const waitUntil = options.waitUntil || 'load';
        
        if (waitUntil === 'load') {
            await this.waitForEvent('Page.loadEventFired');
        } else if (waitUntil === 'domcontentloaded') {
            await this.waitForEvent('Page.domContentEventFired');
        } else if (waitUntil === 'networkidle') {
            // Wait for network to be idle for 500ms
            await this.waitForNetworkIdle();
        }

        console.log('Page loaded');
    }

    /**
     * Wait for a specific event
     */
    private async waitForEvent(eventName: string): Promise<any> {
        return new Promise((resolve) => {
            const handler = (data: any) => {
                const message = JSON.parse(data.toString());
                if (message.method === eventName) {
                    this.ws!.off('message', handler);
                    resolve(message.params);
                }
            };
            
            this.ws!.on('message', handler);
        });
    }

    /**
     * Wait for network to be idle
     */
    private async waitForNetworkIdle(): Promise<void> {
        await this.sendCommand('Network.enable');
        
        let pendingRequests = 0;
        let idleTimer: NodeJS.Timeout | null = null;

        return new Promise((resolve) => {
            const handler = (data: any) => {
                const message = JSON.parse(data.toString());
                
                if (message.method === 'Network.requestWillBeSent') {
                    pendingRequests++;
                    if (idleTimer) {
                        clearTimeout(idleTimer);
                        idleTimer = null;
                    }
                } else if (message.method === 'Network.loadingFinished' || message.method === 'Network.loadingFailed') {
                    pendingRequests--;
                    
                    if (pendingRequests === 0 && !idleTimer) {
                        idleTimer = setTimeout(() => {
                            this.ws!.off('message', handler);
                            resolve();
                        }, 500);
                    }
                }
            };
            
            this.ws!.on('message', handler);
        });
    }

    /**
     * Wait for selector
     */
    async waitForSelector(selector: string, timeout?: number): Promise<ElementHandle | null> {
        const startTime = Date.now();
        const maxTime = timeout || this.config.timeout || 30000;

        while (Date.now() - startTime < maxTime) {
            const element = await this.querySelector(selector);
            if (element) {
                return element;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null;
    }

    /**
     * Query selector
     */
    async querySelector(selector: string): Promise<ElementHandle | null> {
        try {
            const document = await this.sendCommand('DOM.getDocument');
            const result = await this.sendCommand('DOM.querySelector', {
                nodeId: document.root.nodeId,
                selector
            });

            if (!result.nodeId) {
                return null;
            }

            return new BrowserElementHandle(this, result.nodeId);
        } catch {
            return null;
        }
    }

    /**
     * Query all selectors
     */
    async querySelectorAll(selector: string): Promise<ElementHandle[]> {
        try {
            const document = await this.sendCommand('DOM.getDocument');
            const result = await this.sendCommand('DOM.querySelectorAll', {
                nodeId: document.root.nodeId,
                selector
            });

            return result.nodeIds.map((nodeId: number) => new BrowserElementHandle(this, nodeId));
        } catch {
            return [];
        }
    }

    /**
     * Evaluate JavaScript
     */
    async evaluate<T>(pageFunction: string | Function, ...args: any[]): Promise<T> {
        const functionString = typeof pageFunction === 'function' 
            ? pageFunction.toString() 
            : pageFunction;

        const result = await this.sendCommand('Runtime.evaluate', {
            expression: `(${functionString})(${args.map(arg => JSON.stringify(arg)).join(', ')})`,
            returnByValue: true,
            awaitPromise: true
        });

        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception.description);
        }

        return result.result.value;
    }

    /**
     * Scroll to bottom
     */
    async scrollToBottom(): Promise<void> {
        await this.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
    }

    /**
     * Get cache entries
     */
    async getCacheEntries(): Promise<CacheEntry[]> {
        return await this.evaluate(async () => {
            console.log('Checking cache storage...');
            
            try {
                const cacheNames = await caches.keys();
                console.log('Available cache names:', cacheNames);
                
                const imageUrls: string[] = [];

                for (const cacheName of cacheNames) {
                    console.log(`Checking cache: ${cacheName}`);
                    const cache = await caches.open(cacheName);
                    const requests = await cache.keys();
                    
                    console.log(`Cache ${cacheName} has ${requests.length} entries`);
                    
                    for (const request of requests) {
                        // Only get actual image files, not JS/CSS
                        if (request.url.includes('i.scdn.co/image/') ||
                            (request.url.includes('spotify') && 
                             (request.url.includes('.jpg') || 
                              request.url.includes('.png') || 
                              request.url.includes('.webp') ||
                              request.url.includes('image/')))) {
                            console.log('Found image URL:', request.url);
                            imageUrls.push(request.url);
                        }
                    }
                }

                console.log(`Total image URLs found: ${imageUrls.length}`);
                return imageUrls.map(url => ({ url, method: 'GET', headers: {} }));
                
            } catch (error) {
                console.error('Error accessing cache:', error);
                return [];
            }
        });
    }

    /**
     * Get images from DOM elements
     */
    async getImagesFromDOM(): Promise<CacheEntry[]> {
        return await this.evaluate(() => {
            console.log('Checking DOM for images...');
            
            const images: string[] = [];
            const imgElements = document.querySelectorAll('img');
            
            console.log(`Found ${imgElements.length} img elements`);
            
            imgElements.forEach(img => {
                if (img.src && 
                    (img.src.includes('i.scdn.co/image/') ||
                     img.src.includes('image-cdn-fa.spotifycdn.com') ||
                     img.src.includes('image-cdn-ak.spotifycdn.com') ||
                     (img.src.includes('spotify') && 
                      (img.src.includes('.jpg') || img.src.includes('.png') || img.src.includes('.webp'))))) {
                    console.log('Found Spotify image:', img.src);
                    images.push(img.src);
                }
            });

            // Also check background images
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                const style = window.getComputedStyle(element);
                const bgImage = style.backgroundImage;
                
                if (bgImage && bgImage !== 'none') {
                    const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                    if (urlMatch && urlMatch[1] && 
                        (urlMatch[1].includes('i.scdn.co/image/') ||
                         urlMatch[1].includes('image-cdn-fa.spotifycdn.com') ||
                         urlMatch[1].includes('image-cdn-ak.spotifycdn.com') ||
                         (urlMatch[1].includes('spotify') && 
                          (urlMatch[1].includes('.jpg') || urlMatch[1].includes('.png') || urlMatch[1].includes('.webp'))))) {
                        console.log('Found background image:', urlMatch[1]);
                        images.push(urlMatch[1]);
                    }
                }
            });

            console.log(`Total DOM images found: ${images.length}`);
            return [...new Set(images)].map(url => ({ url, method: 'GET', headers: {} }));
        });
    }

    /**
     * Take screenshot
     */
    async screenshot(path?: string): Promise<string> {
        const result = await this.sendCommand('Page.captureScreenshot', {
            format: 'png'
        });

        if (path) {
            const fs = await import('fs/promises');
            await fs.writeFile(path, result.data, 'base64');
        }

        return result.data;
    }

    /**
     * Get node attributes
     */
    async getAttributes(nodeId: number): Promise<Record<string, string>> {
        const result = await this.sendCommand('DOM.getAttributes', { nodeId });
        const attributes: Record<string, string> = {};
        
        for (let i = 0; i < result.attributes.length; i += 2) {
            attributes[result.attributes[i]] = result.attributes[i + 1];
        }
        
        return attributes;
    }

    /**
     * Get node text content
     */
    async getTextContent(nodeId: number): Promise<string> {
        const result = await this.sendCommand('DOM.getOuterHTML', { nodeId });
        const dom = new JSDOM(result.outerHTML);
        return dom.window.document.body.textContent || '';
    }

    /**
     * Send command (public access for ElementHandle)
     */
    async sendCommandPublic(method: string, params?: any): Promise<any> {
        return this.sendCommand(method, params);
    }

    /**
     * Close page manager
     */
    async close(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

/**
 * Element handle implementation
 */
class BrowserElementHandle implements ElementHandle {
    private pageManager: PageManager;
    private nodeId: number;

    constructor(pageManager: PageManager, nodeId: number) {
        this.pageManager = pageManager;
        this.nodeId = nodeId;
    }

    async getAttribute(name: string): Promise<string | null> {
        const attributes = await this.pageManager.getAttributes(this.nodeId);
        return attributes[name] || null;
    }

    async textContent(): Promise<string> {
        return this.pageManager.getTextContent(this.nodeId);
    }

    async href(): Promise<string | null> {
        return this.getAttribute('href');
    }

    async src(): Promise<string | null> {
        return this.getAttribute('src');
    }

    async click(): Promise<void> {
        await this.pageManager.sendCommandPublic('DOM.focus', { nodeId: this.nodeId });
        
        const boxModel = await this.pageManager.sendCommandPublic('DOM.getBoxModel', { nodeId: this.nodeId });
        const { x, y } = boxModel.model.content[0];
        
        await this.pageManager.sendCommandPublic('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            clickCount: 1
        });
        
        await this.pageManager.sendCommandPublic('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y,
            button: 'left',
            clickCount: 1
        });
    }

    async type(text: string): Promise<void> {
        await this.pageManager.sendCommandPublic('DOM.focus', { nodeId: this.nodeId });
        
        for (const char of text) {
            await this.pageManager.sendCommandPublic('Input.dispatchKeyEvent', {
                type: 'char',
                text: char
            });
        }
    }
}