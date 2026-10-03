import { config } from "../config.js";

export async function webSearch(ctx, data, params) {
    let queries = params.queries || [];
    if (!Array.isArray(queries) && params.query) queries = [params.query];
    params.queries = queries.filter(q => q && q.trim() !== '');
    if (params.queries.length === 0) params.queries = [ctx.prompt || 'general search'];
    
    // Strip "site:" operators — SearXNG handles them poorly
    params.queries = params.queries.map(q => q.replace(/site:\S+\s*/gi, '').trim());
    
    // Extract key terms from the first query for relevance filtering
    const goalWords = getKeywords(params.queries[0]);
    
    ctx.log(ctx.stepId, 'info', `Searching SearXNG for queries: ${params.queries.join(', ')}`);
    
    const searxngUrl = config.SEARXNG_URL || 'http://localhost:8080';
    let results = [];
    
    for (const query of params.queries) {
        if (await ctx.shouldStop()) break;
        
        // Try with time filter first, fallback to no time filter
        let items = await searchSearXNG(searxngUrl, query, 'month', ctx);
        if (items.length === 0) {
            items = await searchSearXNG(searxngUrl, query, null, ctx);
        }
        
        results.push(...items.slice(0, params.max_results_per_query || 15).map(r => ({
            url: r.url,
            title: r.title || '',
            snippet: r.content || ''
        })));
    }
    
    // Deduplicate by URL
    const unique = [];
    const seen = new Set();
    for (const r of results) {
        if (!seen.has(r.url)) {
            seen.add(r.url);
            unique.push(r);
        }
    }
    
    // Relevance filter: keep only results where title or snippet contains at least one key term
    const relevant = unique.filter(r => {
        const text = (r.title + ' ' + r.snippet).toLowerCase();
        return goalWords.some(word => text.includes(word));
    });
    
    // If relevance filter is too aggressive, fall back to all unique results
    const finalResults = relevant.length >= 3 ? relevant : unique;
    
    ctx.log(ctx.stepId, 'info', `Found ${unique.length} total URLs, ${relevant.length} relevant, using ${finalResults.length}`);
    return finalResults.slice(0, params.max_results || 50);
}

function getKeywords(query) {
    // Extract meaningful words (3+ chars), skip common stop words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'can', 'could', 'would', 'should', 'may', 'might', 'must', 'shall', 'not', 'but', 'its', 'his', 'her', 'their', 'our', 'your', 'all', 'any', 'some', 'each', 'every', 'find', 'list', 'top', 'best', 'latest', 'recent', 'new', 'most', '2024', '2025', '2026']);
    return query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
}

async function searchSearXNG(baseUrl, query, timeRange, ctx) {
    try {
        let url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=google,duckduckgo,yahoo,startpage&pageno=1`;
        if (timeRange) url += `&time_range=${timeRange}`;
        
        const res = await fetch(url, {
            headers: {
                'X-Forwarded-For': '127.0.0.1',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!res.ok) {
            ctx.log(ctx.stepId, 'warn', `SearXNG returned ${res.status} for "${query}"${timeRange ? ` (time_range=${timeRange})` : ''}`);
            return [];
        }
        
        const json = await res.json();
        return json.results || [];
    } catch (e) {
        ctx.log(ctx.stepId, 'error', `SearXNG search failed for "${query}": ${e.message}`);
        return [];
    }
}
