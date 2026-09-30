import { isAllowed } from '../compliance/robots.js';
import { config } from '../config.js';
import { repo } from '../db/repo.js';

export async function fetchPages(ctx, data, params) {
    data = data || [];
    const urls = data.map(d => d.url);
    const results = [];
    let count = 0;
    
    for (let i = 0; i < urls.length && count < (params.max_pages || config.MAX_PAGES_PER_WORKFLOW); i++) {
        if (ctx.shouldStop()) break;
        const url = urls[i];
        
        ctx.emitProgress(ctx.stepId, Math.floor((i / urls.length) * 100), `Checking ${url}`);
        
        const allowed = await isAllowed(url, config.USER_AGENT);
        if (!allowed) {
            repo.insertFetchLog(ctx.workflowId, url, null, false, false);
            continue;
        }
        
        try {
            const res = await fetch(url, { headers: { 'User-Agent': config.USER_AGENT }, signal: AbortSignal.timeout(10000) });
            const html = await res.text();
            
            repo.insertFetchLog(ctx.workflowId, url, res.status, true, false);
            
            if (res.ok) {
                results.push({ url, html, status: res.status, fetchedAt: new Date().toISOString() });
                count++;
            }
        } catch (err) {
            ctx.log(ctx.stepId, 'warn', `Failed to fetch ${url}: ${err.message}`);
            repo.insertFetchLog(ctx.workflowId, url, null, true, false);
        }
        
        await new Promise(r => setTimeout(r, config.PER_DOMAIN_DELAY_MS));
    }
    return results;
}
