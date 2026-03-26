const seicode = require('./seicode');
const { scrapePage, detectFansubGroups, extractMeta, nameFromUrl } = require('./base');

const SITE_MAP = [
    { key: 'seicode', detect: (url) => /seicode\.net/i.test(url), scraper: seicode },
];

function detect(url) {
    return SITE_MAP.find(s => s.detect(url)) || null;
}

const generic = {
    key: 'generic',
    async scrape(page, url) {
        const origin = new URL(url).origin;
        const { embeds } = await scrapePage(page, url, { timeout: 22000, extraWait: 2000 });
        const meta = await extractMeta(page);
        const groups = await detectFansubGroups(page, origin);
        const fansubs = groups && groups.length > 1
            ? groups.map(g => ({ name: g.name, embeds: g.embeds.map(u => ({ name: nameFromUrl(u), url: u })) }))
            : null;
        return {
            source: new URL(url).hostname.replace('www.', '').split('.')[0],
            title: meta.title,
            episode: meta.episode,
            embeds: embeds.map(u => ({ name: nameFromUrl(u), url: u })),
            fansubs,
        };
    },
};

module.exports = { detect, generic, SITE_MAP };
