/**
 * Seicode (seicode.net) scraper
 * Tabs/buttons are lazy-loaded — must click each one and capture the iframe.
 */

const { isVideoUrl, nameFromUrl, extractMeta, EMBED_HOSTS } = require('./base');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const BLOCKED_RESOURCES = ['image', 'media', 'font', 'stylesheet'];

async function scrape(page, url) {
    const collectedUrls = new Set();

    // Intercept network requests for video URLs
    await page.setRequestInterception(true);
    page.on('request', req => {
        if (BLOCKED_RESOURCES.includes(req.resourceType())) {
            req.abort();
        } else {
            const u = req.url();
            if (isVideoUrl(u)) collectedUrls.add(u);
            req.continue();
        }
    });
    page.on('response', res => {
        const u = res.url();
        if (isVideoUrl(u)) collectedUrls.add(u);
    });

    // Load the page
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (e) {
        if (!e.message.includes('timeout')) throw e;
    }

    await delay(1500);

    // Helper: collect all visible iframe/frame/data-* URLs from the page
    const collectDomEmbeds = async () => {
        return page.evaluate(() => {
            const norm = v => (v && v.startsWith('//')) ? 'https:' + v : v;
            const out = [];
            document.querySelectorAll('iframe,frame').forEach(el => {
                ['src', 'data-src', 'data-lazy-src', 'data-original'].forEach(a => {
                    const v = norm(el.getAttribute(a));
                    if (v && v.startsWith('http')) out.push(v);
                });
            });
            document.querySelectorAll('[data-video],[data-url],[data-embed],[data-iframe],[data-player]').forEach(el => {
                ['data-video','data-url','data-embed','data-iframe','data-player'].forEach(a => {
                    const v = norm(el.getAttribute(a));
                    if (v && v.startsWith('http')) out.push(v);
                });
            });
            return out;
        }).catch(() => []);
    };

    // Also add child frame URLs
    const collectFrameUrls = () => {
        for (const frame of page.frames()) {
            if (frame === page.mainFrame()) continue;
            try { const u = frame.url(); if (u && u.startsWith('http')) collectedUrls.add(u); } catch {}
        }
    };

    // Collect initial (first tab) embeds
    const initialDom = await collectDomEmbeds();
    initialDom.forEach(u => collectedUrls.add(u));
    collectFrameUrls();

    // Find all player/tab selector buttons and click them one by one
    const clickTargets = await page.evaluate(() => {
        const selectors = [
            // tab buttons
            '.nav-tabs li a', '.nav-tabs li button',
            '.nav-pills li a', '.nav-pills li button',
            // player switch buttons (common Turkish anime site patterns)
            '[data-toggle="tab"]', '[data-bs-toggle="tab"]',
            '.player-btn', '.player-tab', '.source-btn', '.source-tab',
            '.embed-btn', '.embed-tab', '.video-btn', '.video-tab',
            '.fansub-btn', '.fansub-tab', '.alternates a', '.alternatif a',
            // generic buttons that mention player sources
            'button[onclick*="iframe"]', 'a[onclick*="iframe"]',
            'button[onclick*="src"]', 'a[onclick*="src"]',
        ];
        const found = [];
        const seen = new Set();
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(el => {
                const key = el.textContent?.trim().slice(0, 40) + el.getAttribute('href') + el.getAttribute('data-target');
                if (!seen.has(key)) {
                    seen.add(key);
                    found.push({ text: el.textContent?.trim().slice(0, 40) });
                }
            });
        }
        return found;
    }).catch(() => []);

    // Click each tab and collect iframes
    const allSelectors = [
        '.nav-tabs li a', '.nav-tabs li button',
        '.nav-pills li a', '.nav-pills li button',
        '[data-toggle="tab"]', '[data-bs-toggle="tab"]',
        '.player-btn', '.player-tab', '.source-btn', '.source-tab',
        '.embed-btn', '.embed-tab', '.video-btn', '.video-tab',
        '.fansub-btn', '.fansub-tab', '.alternates a', '.alternatif a',
    ];

    for (const sel of allSelectors) {
        let buttons;
        try {
            buttons = await page.$$(sel);
        } catch { continue; }

        for (let i = 0; i < buttons.length; i++) {
            try {
                await buttons[i].click();
                await delay(1200);

                const domEmbeds = await collectDomEmbeds();
                domEmbeds.filter(isVideoUrl).forEach(u => collectedUrls.add(u));
                collectFrameUrls();
            } catch {}
        }

        // Re-query to avoid stale element references
        if (buttons.length > 0) break; // found a working selector
    }

    await delay(800);

    // Final collection
    const finalDom = await collectDomEmbeds();
    finalDom.filter(isVideoUrl).forEach(u => collectedUrls.add(u));
    collectFrameUrls();

    // Build fansub groups based on what we collected vs tab names
    const fansubData = await page.evaluate(() => {
        const norm = v => (v && v.startsWith('//')) ? 'https:' + v : v;
        const groups = [];

        // Try panels/cards first
        document.querySelectorAll('.panel,.card').forEach(panel => {
            const name = (
                panel.querySelector('.panel-heading,.card-header,.panel-title,.fansub-name,strong,b,h3,h4,h5')?.textContent || ''
            ).trim().replace(/\s+/g, ' ').slice(0, 80);
            if (!name) return;
            const embeds = [];
            panel.querySelectorAll('iframe,frame').forEach(el => {
                const v = norm(el.getAttribute('src') || el.getAttribute('data-src') || '');
                if (v.startsWith('http')) embeds.push(v);
            });
            if (embeds.length && !groups.some(g => g.name === name)) {
                groups.push({ name, embeds });
            }
        });
        if (groups.length) return groups;

        // Tab panes
        document.querySelectorAll('.tab-pane,[role="tabpanel"]').forEach((pane, i) => {
            const id = pane.id;
            const btn = id ? document.querySelector(`[href="#${id}"],[data-target="#${id}"],[data-bs-target="#${id}"]`) : null;
            const name = btn?.textContent?.trim() || `Kaynak ${i + 1}`;
            const embeds = [];
            pane.querySelectorAll('iframe,frame').forEach(el => {
                const v = norm(el.getAttribute('src') || el.getAttribute('data-src') || '');
                if (v.startsWith('http')) embeds.push(v);
            });
            if (embeds.length) groups.push({ name, embeds });
        });

        return groups;
    }).catch(() => []);

    const meta = await extractMeta(page);

    // Deduplicate collected URLs
    const seen = new Set();
    const embeds = [...collectedUrls]
        .filter(isVideoUrl)
        .filter(u => {
            const k = u.split('?')[0];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        })
        .map(u => ({ name: nameFromUrl(u), url: u }));

    let fansubs = null;
    if (fansubData && fansubData.length > 1) {
        fansubs = fansubData
            .filter(g => g.embeds.length > 0)
            .map(g => ({
                name: g.name,
                embeds: g.embeds.map(u => ({ name: nameFromUrl(u), url: u })),
            }));
    }

    return {
        source: 'seicode',
        title: meta.title,
        episode: meta.episode,
        embeds,
        fansubs: fansubs && fansubs.length > 1 ? fansubs : null,
    };
}

module.exports = { scrape };
