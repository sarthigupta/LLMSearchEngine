export async function validate(ctx, records, params) {
    records = records || [];
    const required = params.required_fields || [];
    
    for (let i = 0; i < records.length; i++) {
        if (await ctx.shouldStop()) break;
        const rec = records[i];
        
        let valid = true;
        for (const req of required) {
            if (!rec.data[req]) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            rec.validation_status = 'valid';
            rec.confidence = Math.min(1.0, (rec.confidence || 0) + 0.2); 
        } else {
            rec.validation_status = 'invalid';
            rec.confidence = Math.max(0.0, (rec.confidence || 0) - 0.5);
        }
    }
    return records.filter(r => r.validation_status !== 'invalid');
}
