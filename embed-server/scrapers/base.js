const delay = (ms) => new Promise(r => setTimeout(r, ms));

const BLOCKED_RESOURCES = ['image', 'media', 'font', 'stylesheet'];

const EMBED_HOSTS = [
    { rx: /sibnet\.ru/i,                   name: 'Sibnet' },
    { rx: /my\.mail\.ru|mail\.ru\/v\//i,   name: 'Mail.ru' },
    { rx: /ok\.ru|odnoklassniki/i,         name: 'OK.ru' },
    { rx: /tau\.com\.tr|taudt|tau-video/i, name: 'Tau' },
    { rx: /streamtape\./i,                 name: 'Streamtape' },
    { rx: /filemoon\.|moonplayer/i,        name: 'Filemoon' },
    { rx: /dood\.|doodstream/i,            name: 'Doodstream' },
    { rx: /fembed\.|femax/i,               name: 'Fembed' },
    { rx: /youtu\.be|youtube\.com\/embed/i,name: 'YouTube' },
    { rx: /vimeo\.com\/video/i,            name: 'Vimeo' },
    { rx: /dailymotion\.com\/embed/i,      name: 'Dailymotion' },
    { rx: /drive\.google\.com\/file/i,     name: 'Google Drive' },
    { rx: /gdriveplayer|gdrive/i,          name: 'GDrive Player' },
    { rx: /mp4upload\./i,                  name: 'MP4Upload' },
    { rx: /sendvid\./i,                    name: 'SendVid' },
    { rx: /vidmoly\./i,                    name: 'Vidmoly' },
    { rx: /vidoza\./i,                     name: 'Vidoza' },
    { rx: /streamlare\./i,                 name: 'Streamlare' },
    { rx: /uqload\./i,                     name: 'Uqload' },
];

function nameFromUrl(url) {
    for (const { rx, name } of EMBED_HOSTS) {
        if (rx.test(url)) return name;
    }
    try {
        const host = new URL(url).hostname.replace('www.', '');
        return host.split('.')[0] || 'Embed';
    } catch { return 'Embed'; }
}

function isVideoUrl(url) {
    if (!url || !url.startsWith('http')) return false;
    if (/\.(m3u8|mp4|mkv|webm)(\?|$)/i.test(url)) return true;
    if (EMBED_HOSTS.some(h => h.rx.test(url))) return true;
    try {
        const u = new URL(url);
        if (/google-analytics|gtm\.|facebook|doubleclick|adservice|recaptcha/i.test(u.hostname)) return false;
        return /embed|player|watch|video|shell|stream|iframe/i.test(u.pathname + u.search);
    } catch { return false; }
}

/** Strip query params for dedup comparison: same domain+path = same video. */
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        return u.origin + u.pathname;
    } catch { return url; }
}

/** Deduplicate by normalized URL (domain+path). First occurrence wins. */
function dedupeEmbeds(embeds) {
    const seen = new Set();
    return embeds.filter(e => {
        if (!e || !e.url) return false;
        const key = normalizeUrl(e.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Navigate to a page, intercept network requests, collect all embed iframes.
 * Returns { embeds: string[] }
 */
async function scrapePage(page, url, opts = {}) {
    const { timeout = 22000, clickSelectors = [], extraWait = 1800 } = opts;
    const networkUrls = new Set();

    await page.setRequestInterception(true);
    page.on('request', req => {
        if (BLOCKED_RESOURCES.includes(req.resourceType())) {
            req.abort();
        } else {
            const u = req.url();
            if (isVideoUrl(u)) networkUrls.add(u);
            req.continue();
        }
    });
    page.on('response', res => {
        const u = res.url();
        if (isVideoUrl(u)) networkUrls.add(u);
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout });
    } catch (e) {
        if (!e.message.includes('Navigation timeout')) throw e;
    }

    await delay(extraWait + Math.floor(Math.random() * 400));

    for (const sel of clickSelectors) {
        try { await page.click(sel); await delay(700); } catch {}
    }

    // Collect iframes from the main document
    const iframeSrcs = await page.evaluate(() => {
        const norm = (v) => (v && v.startsWith('//')) ? 'https:' + v : v;
        const srcs = [];
        document.querySelectorAll('iframe,frame').forEach(el => {
            ['src', 'data-src', 'data-lazy-src', 'data-original'].forEach(attr => {
                const v = norm(el.getAttribute(attr));
                if (v && v.startsWith('http')) srcs.push(v);
            });
        });
        document.querySelectorAll('[data-video],[data-url],[data-embed],[data-iframe],[data-player]').forEach(el => {
            ['data-video','data-url','data-embed','data-iframe','data-player'].forEach(attr => {
                const v = norm(el.getAttribute(attr));
                if (v && v.startsWith('http')) srcs.push(v);
            });
        });
        return srcs;
    });

    // Also collect from accessible child frames
    for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        try {
            const src = frame.url();
            if (src && src.startsWith('http')) networkUrls.add(src);
        } catch {}
    }

    const all = [...new Set([...iframeSrcs, ...networkUrls])].filter(isVideoUrl);
    return { embeds: all };
}

/**
 * Detect fansub groups from the page HTML structure.
 * Returns [{ name, embeds: string[] }] or null.
 */
async function detectFansubGroups(page, pageOrigin) {
    return page.evaluate((origin) => {
        const norm = (v) => (v && v.startsWith('//')) ? 'https:' + v : v;
        const groups = [];

        const getEmbeds = (root) => {
            const out = [];
            root.querySelectorAll('iframe,frame').forEach(el => {
                const v = norm(el.getAttribute('src') || el.getAttribute('data-src') || '');
                if (v.startsWith('http') && new URL(v).origin !== origin) out.push(v);
            });
            root.querySelectorAll('[data-video],[data-url],[data-embed],[data-player]').forEach(el => {
                ['data-video','data-url','data-embed','data-player'].forEach(a => {
                    const v = norm(el.getAttribute(a));
                    if (v && v.startsWith('http')) out.push(v);
                });
            });
            return [...new Set(out)];
        };

        const nameFrom = (el) =>
            (el.querySelector('.panel-heading,.card-header,.panel-title,.fansub-name,strong,b,h3,h4,h5')?.textContent || '')
            .trim().replace(/\s+/g, ' ').slice(0, 80);

        // Strategy 1: Bootstrap panels / cards
        document.querySelectorAll('.panel,.card').forEach(panel => {
            const name = nameFrom(panel);
            if (!name) return;
            const embeds = getEmbeds(panel);
            if (embeds.length && !groups.some(g => g.name === name)) {
                groups.push({ name, embeds });
            }
        });
        if (groups.length) return groups;

        // Strategy 2: data-fansub / data-grup attributes
        document.querySelectorAll('[data-fansub],[data-grup],[data-group],[data-sub]').forEach(el => {
            const name = (el.getAttribute('data-fansub') || el.getAttribute('data-grup') || el.getAttribute('data-group') || el.getAttribute('data-sub') || '').trim();
            const embeds = getEmbeds(el);
            if (embeds.length && !groups.some(g => g.name === name)) {
                groups.push({ name: name || 'Fansub', embeds });
            }
        });
        if (groups.length) return groups;

        // Strategy 3: Tab panes
        document.querySelectorAll('.tab-pane,[role="tabpanel"]').forEach((pane, i) => {
            const embeds = getEmbeds(pane);
            if (!embeds.length) return;
            const id = pane.id;
            const btn = id ? document.querySelector(`[href="#${id}"],[data-target="#${id}"],[data-bs-target="#${id}"]`) : null;
            const name = btn?.textContent?.trim() || `Fansub ${i + 1}`;
            groups.push({ name, embeds });
        });
        if (groups.length) return groups;

        return null;
    }, pageOrigin).catch(() => null);
}

async function extractMeta(page) {
    return page.evaluate(() => {
        const title = document.title || document.querySelector('h1,h2,.anime-title,.video-title')?.textContent?.trim() || '';
        const epMatch =
            (title + ' ' + location.pathname).match(/\b(\d{1,4})\s*[.\-]?\s*(bölüm|bolum|episode|ep\.?|ep)\b/i) ||
            (title + ' ' + location.pathname).match(/[.-](\d{1,4})[.-]bolum/i) ||
            location.pathname.match(/[-/](\d{1,4})[-/]?bolum/i);
        return {
            title: title.replace(/\s+/g, ' ').trim(),
            episode: epMatch ? parseInt(epMatch[1], 10) : null,
        };
    }).catch(() => ({ title: '', episode: null }));
}

module.exports = { scrapePage, detectFansubGroups, extractMeta, nameFromUrl, isVideoUrl, normalizeUrl, dedupeEmbeds, EMBED_HOSTS };
