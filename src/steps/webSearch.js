import { tavily } from "@tavily/core";
import { config } from "../config.js";

export async function webSearch(ctx, data, params) {
    let queries = params.queries || [];
    if (!Array.isArray(queries) && params.query) queries = [params.query];
    params.queries = queries.filter(q => q && q.trim() !== '');
    if (params.queries.length === 0) params.queries = [ctx.prompt || 'general search'];
    ctx.log(ctx.stepId, 'info', `Searching Tavily for queries: ${params.queries.join(', ')}`);
    if (!config.TAVILY_API_KEY || config.TAVILY_API_KEY === 'your_api_key_here') {
        ctx.log(ctx.stepId, 'warn', `TAVILY_API_KEY is missing. Using mock search results for testing.`);
        return [
            { url: "https://example.com/mock-page-1", title: "Mock Data 1", snippet: "Mock content." },
            { url: "https://example.com/mock-page-2", title: "Mock Data 2", snippet: "Mock content." }
        ];
    }
    
    const tvly = tavily({ apiKey: config.TAVILY_API_KEY });
    let results = [];
    
    for (const query of params.queries) {
        if (ctx.shouldStop()) break;
        const res = await tvly.search(query, { maxResults: params.max_results_per_query || 5 });
        results.push(...res.results.map(r => ({ url: r.url, title: r.title, snippet: r.content })));
    }
    
    const unique = [];
    const seen = new Set();
    for (const r of results) {
        if (!seen.has(r.url)) {
            seen.add(r.url);
            unique.push(r);
        }
    }
    
    ctx.log(ctx.stepId, 'info', `Found ${unique.length} unique URLs`);
    return unique.slice(0, params.max_results || 50);
}
