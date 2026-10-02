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
    
    await db.collection('datasets').insertOne({ id: datasetId, workflow_id: ctx.workflowId, schema_fields: schemaFields, version: 1 });
    
    for (const rec of records) {
        const recId = nanoid();
        await db.collection('records').insertOne({
            id: recId,
            dataset_id: datasetId,
            data: rec.data,
            confidence: rec.confidence || 0,
            validation_status: rec.validation_status || 'valid'
        });
        
        for (const src of rec.sources) {
            await db.collection('record_sources').insertOne({
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
