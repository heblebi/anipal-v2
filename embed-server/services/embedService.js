const { newPage } = require('./browserManager');
const queue = require('./queue');
const scrapers = require('../scrapers/index');
const { dedupeEmbeds } = require('../scrapers/base');

const MAX_EMBEDS = 10;

async function getEmbedsFromUrl(url) {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL');
    let parsedUrl;
    try { parsedUrl = new URL(url); }
    catch { throw new Error(`Malformed URL: ${url}`); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only http/https URLs are supported');
    }
    return queue.add(() => _scrape(url));
}

async function getEmbedsFromUrls(urls) {
    const tasks = urls.map(url =>
        getEmbedsFromUrl(url).catch(err => ({
            source: null, title: '', episode: null,
            embeds: [], fansubs: null, error: err.message, url,
        }))
    );
    return Promise.all(tasks);
}

async function _scrape(url) {
    const page = await newPage();
    try {
        const site = scrapers.detect(url);
        const scraper = site ? site.scraper : scrapers.generic;
        const result = await scraper.scrape(page, url);
        result.url = url;

        // Deduplicate by URL (domain+path), cap at MAX_EMBEDS
        if (result.fansubs) {
            result.fansubs = result.fansubs
                .map(g => ({ ...g, embeds: dedupeEmbeds(g.embeds).slice(0, MAX_EMBEDS) }))
                .filter(g => g.embeds.length > 0);
            if (result.fansubs.length === 0) result.fansubs = null;
        }
        result.embeds = dedupeEmbeds(result.embeds).slice(0, MAX_EMBEDS);

        return result;
    } finally {
        await page.close().catch(() => {});
    }
}

module.exports = { getEmbedsFromUrl, getEmbedsFromUrls };
