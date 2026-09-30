import PQueue from 'p-queue';
import { runWorkflow } from './runner.js';

export const jobQueue = new PQueue({ concurrency: 2 });

export function enqueueWorkflow(workflowId, plan) {
    jobQueue.add(async () => {
        await runWorkflow(workflowId, plan);
    });
}
