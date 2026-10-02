import * as chrono from 'chrono-node';

export async function cleanNormalize(ctx, records, params) {
    records = records || [];
    for (let i = 0; i < records.length; i++) {
        if (await ctx.shouldStop()) break;
        ctx.emitProgress(ctx.stepId, Math.floor((i / records.length) * 100), `Normalizing record ${i+1}`);
        const rec = records[i];
        if (!rec.data) continue;
        
        for (const [k, v] of Object.entries(rec.data)) {
            if (typeof v === 'string') {
                let clean = v.trim().replace(/<[^>]*>?/gm, ''); // strip html
                if (k.toLowerCase().includes('date') || k.toLowerCase().includes('time')) {
                    const parsed = chrono.parseDate(clean);
                    if (parsed) clean = parsed.toISOString();
                }
                rec.data[k] = clean;
            }
        }
    }
    return records;
}
