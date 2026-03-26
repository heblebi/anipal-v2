/**
 * Seicode (seicode.net) scraper
 * URL patterns:
 *   /anime/anime-adi
 *   /video/anime-adi-N-bolum  or  /anime-adi/N-bolum
 */

const { scrapePage, detectFansubGroups, extractMeta, nameFromUrl } = require('./base');

async function scrape(page, url) {
    const origin = new URL(url).origin;

    const { embeds } = await scrapePage(page, url, {
        timeout: 25000,
        extraWait: 2000,
        // Seicode sometimes has a "Oynat" / play button
        clickSelectors: ['.play-btn', '#play-button', '.btn-play', '[data-action="play"]'],
    });

    const meta = await extractMeta(page);
    const groups = await detectFansubGroups(page, origin);

    // Build labeled embeds
    let fansubs = null;
    if (groups && groups.length > 1) {
        fansubs = groups.map(g => ({
            name: g.name,
            embeds: g.embeds.map(u => ({ name: nameFromUrl(u), url: u })),
        }));
    }

    return {
        source: 'seicode',
        title: meta.title,
        episode: meta.episode,
        embeds: embeds.map(u => ({ name: nameFromUrl(u), url: u })),
        fansubs,
    };
}

module.exports = { scrape };
