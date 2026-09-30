import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

export async function store(ctx, records, params) {
    records = records || [];
    const datasetId = nanoid();
    ctx.emitProgress(ctx.stepId, 10, 'Creating dataset');
    
    let schemaFields = [];
    if (records.length > 0) {
        schemaFields = Object.keys(records[0].data);
    }
    
    db.datasets.push({ id: datasetId, workflow_id: ctx.workflowId, schema_fields: JSON.stringify(schemaFields), version: 1 });
    
    for (const rec of records) {
        const recId = nanoid();
        db.records.push({
            id: recId,
            dataset_id: datasetId,
            data: JSON.stringify(rec.data),
            confidence: rec.confidence || 0,
            validation_status: rec.validation_status || 'valid'
        });
        
        for (const src of rec.sources) {
            db.record_sources.push({
                id: nanoid(),
                record_id: recId,
                url: src.url,
                domain: src.domain,
                fetched_at: src.fetched_at,
                evidence_snippet: src.evidence
            });
        }
    }
    
    ctx.emitProgress(ctx.stepId, 50, 'Inserting records');
    ctx.log(ctx.stepId, 'info', `Stored ${records.length} records in dataset ${datasetId}`);
    return { datasetId, count: records.length };
}
