import { nanoid } from 'nanoid';
import { db } from './index.js';

export const repo = {
    getHealth: () => ({ status: 'ok' }),

    createWorkflow: (prompt, spec, plan) => {
        const id = nanoid();
        db.workflows.push({ id, prompt, spec: JSON.stringify(spec), plan: JSON.stringify(plan), status: 'queued', progress_pct: 0, control_flag: null });
        return id;
    },

    updateWorkflowStatus: (id, status, error = null) => {
        const wf = db.workflows.find(w => w.id === id);
        if (wf) { wf.status = status; wf.error = error; }
    },

    updateWorkflowProgress: (id, progress_pct) => {
        const wf = db.workflows.find(w => w.id === id);
        if (wf) wf.progress_pct = progress_pct;
    },

    getWorkflowControlFlag: (id) => {
        return db.workflows.find(w => w.id === id);
    },

    insertTask: (id, workflow_id, type) => {
        db.tasks.push({ id: id + '_' + nanoid(4), workflow_id, step_id: id, type, status: 'pending', progress: 0 });
    },

    updateTaskStatus: (step_id, status, error = null) => {
        const t = db.tasks.find(t => t.step_id === step_id);
        if (t) { t.status = status; t.error = error; }
    },

    updateTaskProgress: (step_id, progress, message) => {
        const t = db.tasks.find(t => t.step_id === step_id);
        if (t) { t.progress = progress; t.message = message; }
    },

    insertTaskLog: (workflow_id, step_id, level, message) => {
        db.task_logs.push({ id: nanoid(), workflow_id, step_id, level, message });
    },

    insertFetchLog: (workflow_id, url, status_code, robots_allowed, cached) => {
        db.fetch_logs.push({ id: nanoid(), workflow_id, url, status_code, robots_allowed, cached });
    }
};
