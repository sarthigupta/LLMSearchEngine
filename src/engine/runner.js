import { registry } from './registry.js';
import { createContext, engineEvents } from './context.js';
import { repo } from '../db/repo.js';

function topoSort(steps) {
    const sorted = [];
    const visited = new Set();
    const temp = new Set();

    function visit(step) {
        if (temp.has(step.id)) throw new Error("Cycle detected in plan");
        if (!visited.has(step.id)) {
            temp.add(step.id);
            for (const depId of step.depends_on) {
                const depStep = steps.find(s => s.id === depId);
                if (depStep) visit(depStep);
            }
            temp.delete(step.id);
            visited.add(step.id);
            sorted.push(step);
        }
    }

    for (const step of steps) {
        if (!visited.has(step.id)) visit(step);
    }
    return sorted;
}

export async function runWorkflow(workflowId, plan) {
    const ctx = createContext(workflowId);
    let currentData = null; // Output of the previous step
    
    repo.updateWorkflowStatus(workflowId, 'running');
    engineEvents.emit('workflow_status', { workflowId, status: 'running' });

    try {
        const sortedSteps = topoSort(plan.steps);
        
        for (const step of sortedSteps) {
            repo.insertTask(step.id, workflowId, step.type);
        }

        let progressAccum = 0;

        for (const step of sortedSteps) {
            if (await ctx.shouldStop()) {
                repo.updateWorkflowStatus(workflowId, 'cancelled');
                engineEvents.emit('workflow_status', { workflowId, status: 'cancelled' });
                return;
            }

            repo.updateTaskStatus(step.id, 'running');
            ctx.emitProgress(step.id, 0, 'Starting step...');

            const stepDef = registry[step.type];
            if (!stepDef) throw new Error(`Unknown step type: ${step.type}`);

            try {
                currentData = await stepDef.run(ctx, currentData, step.params);
                
                repo.updateTaskStatus(step.id, 'completed');
                ctx.emitProgress(step.id, 100, 'Completed');
                
                progressAccum += 100 / sortedSteps.length;
                repo.updateWorkflowProgress(workflowId, Math.floor(progressAccum));
                engineEvents.emit('progress', { workflowId, progress_pct: Math.floor(progressAccum) });
                
            } catch (err) {
                repo.updateTaskStatus(step.id, 'failed', err.message);
                throw err;
            }
        }

        repo.updateWorkflowStatus(workflowId, 'completed');
        engineEvents.emit('workflow_status', { workflowId, status: 'completed' });
    } catch (e) {
        repo.updateWorkflowStatus(workflowId, 'failed', e.message);
        engineEvents.emit('workflow_status', { workflowId, status: 'failed', error: e.message });
    }
}
