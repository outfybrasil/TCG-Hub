import puppeteer, { type Browser } from 'puppeteer-core';

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
];

let browserInstance: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

function findExecutable(): string {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    for (const p of CHROME_PATHS) {
        try {
            if (fs.existsSync(/* turbopackIgnore: true */ p)) return p;
        } catch {
            continue;
        }
    }

    throw new Error('[browser-pool] Chrome/Chromium executable not found. Set CHROME_PATH env var.');
}

async function launchBrowser(): Promise<Browser> {
    const execPath = findExecutable();
    console.log(`[browser-pool] Launching headless browser: ${execPath}`);

    const browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
        ],
    });

    browser.on('disconnected', () => {
        console.log('[browser-pool] Browser disconnected, clearing instance.');
        browserInstance = null;
        launchPromise = null;
    });

    return browser;
}

export async function getBrowser(): Promise<Browser> {
    if (browserInstance?.connected) {
        return browserInstance;
    }

    if (launchPromise) {
        return launchPromise;
    }

    launchPromise = launchBrowser().then((browser) => {
        browserInstance = browser;
        launchPromise = null;
        return browser;
    }).catch((err) => {
        launchPromise = null;
        throw err;
    });

    return launchPromise;
}

export async function fetchWithBrowser(
    url: string,
    options?: { timeoutMs?: number; waitForSelector?: string; maxRetries?: number }
): Promise<string> {
    const {
        timeoutMs = 35000,
        waitForSelector,
        maxRetries = 2,
    } = options ?? {};

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const browser = await getBrowser();
        const page = await browser.newPage();

        try {
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            );

            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            });

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: timeoutMs,
            });

            if (waitForSelector) {
                try {
                    await page.waitForSelector(waitForSelector, { timeout: 8000 });
                } catch {
                    // Selector not found yet — give extra time for slow JS rendering
                    console.warn(`[browser-pool] Selector "${waitForSelector}" not found after 8s, waiting extra 4s...`);
                    await new Promise((r) => setTimeout(r, 4000));
                }
            } else {
                // Default wait for generic dynamic content
                await new Promise((r) => setTimeout(r, 2500));
            }

            const html = await page.content();
            return html;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[browser-pool] Attempt ${attempt}/${maxRetries} failed for ${url}: ${lastError.message}`);

            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 2000));
            }
        } finally {
            await page.close().catch(() => {});
        }
    }

    throw lastError ?? new Error(`[browser-pool] Failed to fetch ${url} after ${maxRetries} attempts`);
}

export async function closeBrowser(): Promise<void> {
    if (browserInstance?.connected) {
        await browserInstance.close().catch(() => {});
        browserInstance = null;
    }
    launchPromise = null;
}
