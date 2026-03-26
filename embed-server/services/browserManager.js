const puppeteer = require('puppeteer');

let browser = null;
let launchPromise = null;

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--no-first-run',
    '--mute-audio',
];

async function getBrowser() {
    if (browser && browser.isConnected()) return browser;

    // Prevent multiple simultaneous launches
    if (launchPromise) return launchPromise;

    launchPromise = puppeteer.launch({
        headless: 'new',
        args: LAUNCH_ARGS,
        ignoreHTTPSErrors: true,
    }).then(b => {
        browser = b;
        launchPromise = null;
        browser.on('disconnected', () => { browser = null; });
        return browser;
    });

    return launchPromise;
}

async function newPage() {
    const b = await getBrowser();
    const page = await b.newPage();

    // Realistic viewport + user-agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Extra headers to look more human
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    return page;
}

async function closeBrowser() {
    if (browser) {
        await browser.close().catch(() => {});
        browser = null;
    }
}

module.exports = { getBrowser, newPage, closeBrowser };
