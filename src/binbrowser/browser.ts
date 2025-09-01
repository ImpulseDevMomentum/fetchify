import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { BrowserConfig, LaunchOptions, NavigationOptions, ElementHandle, CacheEntry } from './types';
import { PageManager } from './page';

/**
 * Custom browser controller using Chrome DevTools Protocol
 */
export class BinBrowser {
    private process: ChildProcess | null = null;
    private debugPort: number = 9222;
    private config: BrowserConfig;
    private pageManager: PageManager | null = null;

    constructor(config: BrowserConfig = {}) {
        const tempDir = join(process.cwd(), 'temp_chrome_data');
        this.config = {
            headless: false,
            userDataDir: tempDir,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            timeout: 30000,
            ...config
        };
    }

    /**
     * Launch the browser
     */
    async launch(options: LaunchOptions = {}): Promise<void> {
        const executablePath = options.executablePath || await this.findChromePath();
        
        // Ensure user data directory exists
        if (this.config.userDataDir) {
            await fs.mkdir(this.config.userDataDir, { recursive: true });
        }

        const args = [
            `--remote-debugging-port=${this.debugPort}`,
            `--user-data-dir=${this.config.userDataDir}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-device-discovery-notifications',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            ...(this.config.headless ? ['--headless'] : []),
            ...(options.args || [])
        ];

        console.log(`Launching browser: ${executablePath}`);
        console.log(`Args: ${args.join(' ')}`);

        this.process = spawn(executablePath, args, {
            env: { ...process.env, ...options.env },
            stdio: 'pipe'
        });

        if (this.process.stderr) {
            this.process.stderr.on('data', (data) => {
                console.warn(`Browser stderr: ${data}`);
            });
        }

        this.process.on('error', (error) => {
            console.error('Browser process error:', error);
        });

        // Wait for browser to start
        await this.waitForDebugPort();
        
        // Initialize page manager
        this.pageManager = new PageManager(this.debugPort, this.config);
        await this.pageManager.init();
    }

    /**
     * Find Chrome executable path
     */
    private async findChromePath(): Promise<string> {
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const path of possiblePaths) {
            try {
                await fs.access(path);
                return path;
            } catch {
                continue;
            }
        }

        throw new Error('Chrome executable not found. Please install Google Chrome or specify executablePath.');
    }

    /**
     * Wait for debug port to be available
     */
    private async waitForDebugPort(): Promise<void> {
        const maxAttempts = 100;
        const delay = 200;

        console.log('Waiting for browser debug port...');

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`http://localhost:${this.debugPort}/json/version`);
                if (response.ok) {
                    console.log('Browser debug port is ready');
                    return;
                }
            } catch (error) {
                // Continue waiting
                if (i % 10 === 0) {
                    console.log(`Still waiting for debug port... (attempt ${i + 1}/${maxAttempts})`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        throw new Error('Browser failed to start within timeout period');
    }

    /**
     * Navigate to a URL
     */
    async goto(url: string, options: NavigationOptions = {}): Promise<void> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        await this.pageManager.goto(url, options);
    }

    /**
     * Wait for a selector to appear
     */
    async waitForSelector(selector: string, timeout?: number): Promise<ElementHandle | null> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.waitForSelector(selector, timeout);
    }

    /**
     * Query selector
     */
    async querySelector(selector: string): Promise<ElementHandle | null> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.querySelector(selector);
    }

    /**
     * Query all selectors
     */
    async querySelectorAll(selector: string): Promise<ElementHandle[]> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.querySelectorAll(selector);
    }

    /**
     * Evaluate JavaScript in the page
     */
    async evaluate<T>(pageFunction: string | Function, ...args: any[]): Promise<T> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.evaluate<T>(pageFunction, ...args);
    }

    /**
     * Scroll to bottom of page
     */
    async scrollToBottom(): Promise<void> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        await this.pageManager.scrollToBottom();
    }

    /**
     * Get cache storage entries
     */
    async getCacheEntries(): Promise<CacheEntry[]> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.getCacheEntries();
    }

    /**
     * Get images from DOM elements
     */
    async getImagesFromDOM(): Promise<CacheEntry[]> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.getImagesFromDOM();
    }

    /**
     * Take a screenshot
     */
    async screenshot(path?: string): Promise<string> {
        if (!this.pageManager) {
            throw new Error('Browser not launched. Call launch() first.');
        }

        return await this.pageManager.screenshot(path);
    }

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        if (this.pageManager) {
            await this.pageManager.close();
            this.pageManager = null;
        }

        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}
