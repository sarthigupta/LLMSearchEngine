import { isAllowed } from '../compliance/robots.js';
import { config } from '../config.js';
import { repo } from '../db/repo.js';

export async function fetchPages(ctx, data, params) {
    data = data || [];
    const urls = data.map(d => d.url).slice(0, params.max_pages || config.MAX_PAGES_PER_WORKFLOW);
    
    // Spoof real browser to prevent blocking
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    const promises = urls.map(async (url, i) => {
        if (await ctx.shouldStop()) return null;
        ctx.emitProgress(ctx.stepId, Math.floor((i / urls.length) * 100), `Fetching ${url}`);
        
        try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
            const html = await res.text();
            await repo.insertFetchLog(ctx.workflowId, url, res.status, true, false);
            
            if (res.ok) {
                return { url, html, status: res.status, fetchedAt: new Date().toISOString() };
            }
        } catch (err) {
            ctx.log(ctx.stepId, 'warn', `Failed to fetch ${url}: ${err.message}`);
            await repo.insertFetchLog(ctx.workflowId, url, null, true, false);
        }
        return null;
    });

    const results = (await Promise.all(promises)).filter(r => r != null);
    return results;
}
