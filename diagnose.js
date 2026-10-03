import 'dotenv/config';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function diagnose() {
    await client.connect();
    const db = client.db('llmengine');
    
    // Get the most recent workflow
    const wf = await db.collection('workflows').findOne({}, { sort: { created_at: -1 } });
    if (!wf) { console.log('No workflows found'); process.exit(0); }
    
    console.log('=== LATEST WORKFLOW ===');
    console.log('ID:', wf.id);
    console.log('Prompt:', wf.prompt);
    console.log('Status:', wf.status);
    console.log('Error:', wf.error);
    console.log('Entity Type:', wf.spec?.entity_type);
    console.log('Fields:', wf.spec?.fields);
    console.log('Search queries:', wf.plan?.steps?.find(s => s.type === 'web_search')?.params?.queries);
    console.log('Extract fields:', wf.plan?.steps?.find(s => s.type === 'extract_structured')?.params?.fields);
    
    // Get all logs for this workflow
    console.log('\n=== TASK LOGS ===');
    const logs = await db.collection('task_logs').find({ workflow_id: wf.id }).sort({ ts: 1 }).toArray();
    logs.forEach(l => console.log(`[${l.level}] ${l.message}`));
    
    // Get datasets
    console.log('\n=== DATASETS ===');
    const datasets = await db.collection('datasets').find({ workflow_id: wf.id }).toArray();
    console.log('Dataset count:', datasets.length);
    for (const ds of datasets) {
        console.log('Dataset ID:', ds.id, 'Fields:', ds.schema_fields);
        const records = await db.collection('records').find({ dataset_id: ds.id }).toArray();
        console.log('Record count:', records.length);
        if (records.length > 0) {
            console.log('Sample record:', JSON.stringify(records[0].data, null, 2));
        }
    }
    
    process.exit(0);
}

diagnose().catch(e => { console.error(e); process.exit(1); });
