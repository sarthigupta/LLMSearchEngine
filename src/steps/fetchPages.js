import { isAllowed } from '../compliance/robots.js';
import { config } from '../config.js';
import { repo } from '../db/repo.js';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

/**
 * Fetches pages, runs a content-quality check, and returns clean text.
 * GOOD quality → Cheerio fast path (no browser needed)
 * BAD quality  → Playwright headless browser fallback
 */
export async function fetchPages(ctx, data, params) {
    data = data || [];
    // Deduplicate URLs up front
    const uniqueUrls = [...new Set(data.map(d => d.url))].slice(0, params.max_pages || config.MAX_PAGES_PER_WORKFLOW);
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    let browser = null;
    
    const promises = uniqueUrls.map(async (url, i) => {
        if (await ctx.shouldStop()) return null;
        ctx.emitProgress(ctx.stepId, Math.floor((i / uniqueUrls.length) * 100), `Fetching ${url}`);
        
        try {
            // ── STEP 1: Fast fetch ──
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
            let html = await res.text();
            
            // ── STEP 2: Content-Quality Detector ──
            let isBadQuality = false;
            if (!res.ok) {
                isBadQuality = true;
            } else {
                const $temp = cheerio.load(html);
                $temp('script, style, noscript, link, meta').remove();
                const bodyText = $temp('body').text().replace(/\s+/g, ' ').trim();
                // BAD if Cloudflare wall, captcha, JS-only SPA, or just too little text
                if (
                    bodyText.length < 200 ||
                    html.includes('cf-browser-verification') ||
                    html.includes('captcha') ||
                    html.includes('Enable JavaScript and cookies to continue')
                ) {
                    isBadQuality = true;
                }
            }
            
            // ── STEP 3: Playwright fallback for BAD pages ──
            if (isBadQuality) {
                ctx.log(ctx.stepId, 'info', `Low quality fetch for ${url}, falling back to Playwright`);
                try {
                    if (!browser) {
                        browser = await chromium.launch({ headless: true });
                    }
                    const page = await browser.newPage();
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    // Wait a moment for JS to render
                    await page.waitForTimeout(2000);
                    html = await page.content();
                    await page.close();
                } catch (pwErr) {
                    ctx.log(ctx.stepId, 'warn', `Playwright also failed for ${url}: ${pwErr.message}`);
                    return null;
                }
            }
            
            // ── STEP 4: Cheerio clean ── Strip junk, keep only useful text
            const $ = cheerio.load(html);
            $('script, style, noscript, iframe, img, svg, nav, footer, header, aside, form, button, [role="navigation"], [role="banner"]').remove();
            const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
            
            if (cleanText.length < 100) {
                ctx.log(ctx.stepId, 'warn', `Page ${url} has almost no readable text after cleaning, skipping`);
                return null;
            }
            
            await repo.insertFetchLog(ctx.workflowId, url, res.status, true, false);
            return { url, text: cleanText, status: res.status, fetchedAt: new Date().toISOString() };
        } catch (err) {
            ctx.log(ctx.stepId, 'warn', `Failed to fetch ${url}: ${err.message}`);
            try { await repo.insertFetchLog(ctx.workflowId, url, null, true, false); } catch(_) {}
        }
        return null;
    });

    const results = (await Promise.all(promises)).filter(r => r != null);
    if (browser) {
        try { await browser.close(); } catch(_) {}
    }
    ctx.log(ctx.stepId, 'info', `Successfully fetched and cleaned ${results.length}/${uniqueUrls.length} pages`);
    return results;
}
