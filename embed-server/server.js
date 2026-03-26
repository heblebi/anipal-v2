/**
 * Embed Scraper API Server
 * Runs on http://localhost:3001
 *
 * Endpoints:
 *   GET  /health                — health check
 *   POST /api/embeds            — scrape a single URL
 *   POST /api/embeds/batch      — scrape multiple URLs (up to 20)
 */

const express = require('express');
const cors = require('cors');
const { getEmbedsFromUrl, getEmbedsFromUrls } = require('./services/embedService');
const { closeBrowser } = require('./services/browserManager');
const queue = require('./services/queue');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        queue: { active: queue.activeCount, pending: queue.size },
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────
// Single URL scrape
// POST /api/embeds
// Body: { url: string }
// ─────────────────────────────────────────────
app.post('/api/embeds', async (req, res) => {
    const { url } = req.body || {};

    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    console.log(`[scrape] ${url}`);

    try {
        const result = await getEmbedsFromUrl(url);
        console.log(`[done]  ${url} → ${result.embeds.length} embeds, ${result.fansubs?.length ?? 0} fansubs`);
        res.json(result);
    } catch (err) {
        console.error(`[error] ${url}:`, err.message);
        res.status(500).json({ error: err.message, url });
    }
});

// ─────────────────────────────────────────────
// Batch URL scrape
// POST /api/embeds/batch
// Body: { urls: string[] }
// ─────────────────────────────────────────────
app.post('/api/embeds/batch', async (req, res) => {
    const { urls } = req.body || {};

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'urls array is required' });
    }

    if (urls.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 URLs per batch request' });
    }

    console.log(`[batch] ${urls.length} URLs`);

    try {
        const results = await getEmbedsFromUrls(urls);
        const success = results.filter(r => !r.error).length;
        console.log(`[batch done] ${success}/${urls.length} succeeded`);
        res.json({ results, total: urls.length, success });
    } catch (err) {
        console.error('[batch error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    console.log('\nShutting down...');
    await closeBrowser();
    process.exit(0);
}

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Embed server running at http://localhost:${PORT}`);
    console.log('   POST /api/embeds       — single URL');
    console.log('   POST /api/embeds/batch — batch (max 20 URLs)\n');
});
