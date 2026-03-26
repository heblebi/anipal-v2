/**
 * Seicode (seicode.net) scraper
 *
 * SvelteKit SSR sayfasında video_links JSON verisi doğrudan HTML içine gömülü gelir.
 * Browser açmaya gerek yok — fetch ile HTML alıp regex ile parse ediyoruz.
 *
 * URL formatı: /anime/<slug>/<season>/<episode>
 */

const { nameFromUrl } = require('./base');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': 'https://seicode.net/',
};

// Unquoted JS key → quoted JSON key
function fixJson(str) {
    return str
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)(\s*:)/g, (_, pre, key, post) => {
            // Already quoted keys pass through
            return `${pre}"${key}"${post}`;
        });
}

async function scrape(_page, url) {
    // 1. Fetch HTML
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const html = await res.text();

    // 2. Extract title & episode from URL / page title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/SeiCode\s*\|?\s*/i, '').trim() : '';

    const urlParts = new URL(url).pathname.split('/').filter(Boolean);
    // /anime/<slug>/<season>/<episode>
    const episodeNum = urlParts.length >= 4 ? parseInt(urlParts[3], 10) : null;

    // 3. Find video_links in SSR data
    // Pattern: video_links:{...} or video_links:{"key":"url",...}
    const vlMatch = html.match(/video_links\s*:\s*(\{[^}]+\})/);
    if (!vlMatch) {
        // Fallback: try API endpoint
        return await scrapeViaApi(url, rawTitle, episodeNum);
    }

    let videoLinks;
    try {
        // Fix unquoted keys before parsing
        const fixed = fixJson(vlMatch[1]);
        videoLinks = JSON.parse(fixed);
    } catch {
        try {
            // Last resort: eval-safe extraction with regex
            videoLinks = {};
            const pairs = vlMatch[1].matchAll(/["']?([^"':,{}]+)["']?\s*:\s*["']?(https?:\/\/[^"',}]+)["']?/g);
            for (const [, key, val] of pairs) {
                videoLinks[key.trim()] = val.trim();
            }
        } catch {
            return await scrapeViaApi(url, rawTitle, episodeNum);
        }
    }

    return buildResult(videoLinks, rawTitle, episodeNum);
}

// Fallback: try next-api.seicode.net directly
async function scrapeViaApi(pageUrl, title, episodeNum) {
    try {
        const u = new URL(pageUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        // /anime/<slug>/<season>/<episode>
        if (parts.length < 4) throw new Error('URL format unknown');
        const [, slug, season, episode] = parts;

        const apiUrl = `https://next-api.seicode.net/anime/${slug}`;
        const res = await fetch(apiUrl, { headers: HEADERS });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();

        const seasonData = (data.seasons || []).find(s => String(s.season_number) === String(season));
        const epData = (seasonData?.episodes || []).find(e => String(e.episode_number) === String(episode));
        if (!epData?.video_links) throw new Error('video_links not found in API');

        return buildResult(epData.video_links, title || data.english || '', parseInt(episode, 10));
    } catch (e) {
        throw new Error('Seicode scrape failed: ' + e.message);
    }
}

function buildResult(videoLinks, title, episodeNum) {
    const SKIP = /short\.|ad\.|tracker\.|analytics\.|click\.|go\./i;

    const embeds = Object.entries(videoLinks)
        .filter(([, url]) => url && url.startsWith('http') && !SKIP.test(url))
        .map(([key, url]) => ({
            name: nameFromUrl(url) || key,
            url,
        }));

    return {
        source: 'seicode',
        title,
        episode: episodeNum,
        embeds,
        fansubs: null,
    };
}

module.exports = { scrape };
