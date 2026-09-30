import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { generateJson } from '../llm/index.js';
import { z } from 'zod';

export async function extractStructured(ctx, data, params) {
    data = data || [];
    const records = [];
    const entityType = params.entity_type || 'generic';
    
    const fields = params.fields || [];
    let schemaDef = {};
    let itemSchema = z.record(z.any());
    if (Array.isArray(fields) && fields.length > 0) {
        fields.forEach(f => schemaDef[f] = z.any().optional().nullable());
        itemSchema = z.object(schemaDef);
    } else if (typeof fields === 'object' && Object.keys(fields).length > 0) {
        Object.keys(fields).forEach(f => schemaDef[f] = z.any().optional().nullable());
        itemSchema = z.object(schemaDef);
    }
    
    // Always include evidence
    if (itemSchema.shape) {
        schemaDef['evidence'] = z.string().describe("Verbatim quote supporting the data");
        itemSchema = z.object(schemaDef);
    }

    const extractSchema = z.object({
        items: z.array(itemSchema).describe("List of extracted records. Return empty array if none found.")
    });

    const systemPrompt = `Extract records of type '${entityType}' from the page text. Return a JSON array in the 'items' field. Use null for missing fields. For each record include an 'evidence' field with a verbatim quote (under 200 chars) that supports it.`;

    for (let i = 0; i < data.length; i++) {
        if (ctx.shouldStop()) break;
        const page = data[i];
        ctx.emitProgress(ctx.stepId, Math.floor((i / data.length) * 100), `Extracting from ${page.url}`);
        
        try {
            const dom = new JSDOM(page.html, { url: page.url });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();
            
            if (article && article.textContent) {
                const text = article.textContent.replace(/\s+/g, ' ').slice(0, 8000); 
                const res = await generateJson({ system: systemPrompt, prompt: text, schema: extractSchema });
                
                for (const item of res.items) {
                    const evidence = item.evidence;
                    delete item.evidence;
                    records.push({
                        data: item,
                        sources: [{ url: page.url, domain: new URL(page.url).hostname, fetched_at: page.fetchedAt, evidence }],
                        extraction_method: 'llm',
                        confidence: 0.8
                    });
                }
            }
        } catch (e) {
            ctx.log(ctx.stepId, 'warn', `Extraction failed for ${page.url}: ${e.message}`);
        }
    }
    return records;
}
