import crypto from 'crypto';

export async function deduplicate(ctx, records, params) {
    records = records || [];
    const unique = new Map();
    
    for (let i = 0; i < records.length; i++) {
        if (ctx.shouldStop()) break;
        const rec = records[i];
        
        const hash = crypto.createHash('sha256').update(JSON.stringify(rec.data)).digest('hex');
        rec.dedup_key = hash;
        
        if (unique.has(hash)) {
            const existing = unique.get(hash);
            existing.sources.push(...rec.sources);
        } else {
            unique.set(hash, rec);
        }
    }
    
    return Array.from(unique.values());
}
