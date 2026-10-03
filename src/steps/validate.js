export async function validate(ctx, records, params) {
    records = records || [];
    const required = params.required_fields || [];
    
    // If no required fields specified, pass everything through
    if (required.length === 0) {
        for (const rec of records) {
            rec.validation_status = 'valid';
            rec.confidence = Math.min(1.0, (rec.confidence || 0) + 0.1);
        }
        return records;
    }
    
    for (let i = 0; i < records.length; i++) {
        if (await ctx.shouldStop()) break;
        const rec = records[i];
        
        // Count how many required fields are present
        let presentCount = 0;
        for (const req of required) {
            if (rec.data[req] != null && rec.data[req] !== '') {
                presentCount++;
            }
        }
        
        // Accept if at least 50% of required fields are present
        if (presentCount >= Math.ceil(required.length * 0.5)) {
            rec.validation_status = 'valid';
            rec.confidence = Math.min(1.0, (rec.confidence || 0) + (presentCount / required.length) * 0.2);
        } else {
            rec.validation_status = 'invalid';
            rec.confidence = Math.max(0.0, (rec.confidence || 0) - 0.3);
        }
    }
    
    const valid = records.filter(r => r.validation_status !== 'invalid');
    ctx.log(ctx.stepId, 'info', `Validation: ${valid.length}/${records.length} records passed`);
    return valid;
}
