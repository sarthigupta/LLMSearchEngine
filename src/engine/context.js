import { EventEmitter } from 'events';
import { repo } from '../db/repo.js';

export const engineEvents = new EventEmitter();

export function createContext(workflowId) {
    return {
        workflowId,
        log: (stepId, level, message) => {
            repo.insertTaskLog(workflowId, stepId, level, message);
            engineEvents.emit('log', { workflowId, stepId, level, message });
        },
        emitProgress: (stepId, progress, message) => {
            repo.updateTaskProgress(stepId, progress, message);
            engineEvents.emit('task_update', { workflowId, stepId, progress, message });
        },
        shouldStop: () => {
            const wf = repo.getWorkflowControlFlag(workflowId);
            return wf && (wf.control_flag === 'cancel' || wf.control_flag === 'pause');
        }
    };
}
