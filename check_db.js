import { connectDB, db } from './src/db/index.js';
async function test() {
    await connectDB();
    const workflows = await db.collection('workflows').find().toArray();
    console.log("Workflows:", workflows.length);
    if (workflows.length > 0) {
        console.log(workflows[workflows.length - 1]);
    }
    const records = await db.collection('records').find().toArray();
    console.log("Records:", records.length);
    process.exit(0);
}
test();
