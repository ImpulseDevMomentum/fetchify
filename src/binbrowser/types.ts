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