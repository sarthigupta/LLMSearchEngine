import { generateJson } from '../llm/index.js';
import { z } from 'zod';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export async function extractStructured(ctx, data, params) {
    data = data || [];
    const records = [];
    const entityType = params.entity_type || 'generic';
    
    // Build dynamic schema from fields the user asked for
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

    // Focused extraction prompt — works for ANY topic
    const fieldList = fields.length > 0 ? `Extract these specific fields: ${fields.join(', ')}.` : 'Infer the most relevant structured fields from the text.';
    const systemPrompt = `You are a universal data extraction engine. You extract structured records from webpage text for ANY topic.

Your task: Extract records of type "${entityType}" with these fields.
${fieldList}

Rules:
1. Return JSON: {"items": [...]}. Each item is one record (one row in a table).
2. Include an "evidence" field per item — a verbatim quote (max 150 chars) from the source text.
3. Use null for missing fields. NEVER invent or hallucinate data.
4. If the page lists multiple items (e.g., multiple products, multiple jobs, multiple entries), extract EACH one as a separate record.
5. If no relevant data exists in the text, return {"items": []}.
6. Be thorough — scan the ENTIRE text for matching records, not just the first paragraph.
7. Values should be clean and concise (no extra whitespace, HTML tags, or unnecessary text).`;

    // Process pages SEQUENTIALLY to avoid Groq OTPM rate limits
    for (let i = 0; i < data.length; i++) {
        if (await ctx.shouldStop()) break;
        const page = data[i];
        if (!page || !page.text || page.text.trim().length < 50) continue;
        
        ctx.emitProgress(ctx.stepId, Math.floor((i / data.length) * 100), `Extracting from ${page.url}`);
        
        try {
            // Limit text to 4000 chars for faster responses and lower token usage
            const text = page.text.slice(0, 4000);
            const res = await generateJson({ system: systemPrompt, prompt: text, schema: extractSchema });
            
            if (!res || !res.items || !Array.isArray(res.items)) continue;
            
            for (const item of res.items) {
                const evidence = item.evidence;
                delete item.evidence;
                // Skip items where all values are null
                const hasData = Object.values(item).some(v => v != null && v !== '');
                if (!hasData) continue;
                
                records.push({
                    data: item,
                    sources: [{ url: page.url, domain: new URL(page.url).hostname, fetched_at: page.fetchedAt, evidence }],
                    extraction_method: 'llm',
                    confidence: 0.8
                });
            }
            
            // Small delay between pages to respect Groq OTPM limits
            if (i < data.length - 1) await wait(1500);
        } catch (e) {
            ctx.log(ctx.stepId, 'warn', `Extraction failed for ${page.url}: ${e.message}`);
            // On rate limit, wait longer before next attempt
            if (e.message && e.message.includes('429')) {
                await wait(5000);
            }
        }
    }
    
    ctx.emitProgress(ctx.stepId, 100, `Extracted ${records.length} records from ${data.length} pages`);
    ctx.log(ctx.stepId, 'info', `Extracted ${records.length} records from ${data.length} pages`);
    return records;
}
