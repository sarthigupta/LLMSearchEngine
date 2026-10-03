import 'dotenv/config';
import { MongoClient } from 'mongodb';
async function run() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('llmengine');
  const wf = await db.collection('workflows').findOne({}, {sort: {created_at:-1}});
  console.log('WORKFLOW:', JSON.stringify(wf, null, 2));
  const logs = await db.collection('task_logs').find({workflow_id: wf.id}).toArray();
  console.log('LOGS:', JSON.stringify(logs, null, 2));
  process.exit(0);
}
run();
