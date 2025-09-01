/**
 * Browser configuration options
 */
export interface BrowserConfig {
    headless?: boolean;
    userDataDir?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    timeout?: number;
}

/**
 * Browser launch options
 */
export interface LaunchOptions {
    executablePath?: string;
    args?: string[];
    env?: Record<string, string>;
}

/**
 * Page navigation options
 */
export interface NavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
}

/**
 * Element selector result
 */
export interface ElementHandle {
    textContent(): Promise<string>;
    href(): Promise<string | null>;
    src(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
    click(): Promise<void>;
    type(text: string): Promise<void>;
}

/**
 * Cache storage entry
 */
export interface CacheEntry {
    url: string;
    method: string;
    headers: Record<string, string>;
}