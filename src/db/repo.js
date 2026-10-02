import { nanoid } from 'nanoid';
import { db } from './index.js';

export const repo = {
    getHealth: async () => {
        try {
            await db.command({ ping: 1 });
            return { status: 'ok' };
        } catch (e) {
            return { status: 'error', error: e.message };
        }
    },

    createWorkflow: async (prompt, spec, plan) => {
        const id = nanoid();
        await db.collection('workflows').insertOne({
            id,
            prompt,
            spec,
            plan,
            status: 'queued',
            progress_pct: 0,
            control_flag: 'none',
            created_at: new Date(),
            updated_at: new Date()
        });
        return id;
    },

    updateWorkflowStatus: async (id, status, error = null) => {
        await db.collection('workflows').updateOne(
            { id },
            { $set: { status, error, updated_at: new Date() } }
        );
    },

    updateWorkflowProgress: async (id, progress_pct) => {
        await db.collection('workflows').updateOne(
            { id },
            { $set: { progress_pct, updated_at: new Date() } }
        );
    },

    getWorkflowControlFlag: async (id) => {
        return await db.collection('workflows').findOne({ id }, { projection: { control_flag: 1 } });
    },

    insertTask: async (id, workflow_id, type) => {
        const task_id = id + '_' + nanoid(4);
        await db.collection('tasks').insertOne({
            id: task_id,
            workflow_id,
            step_id: id,
            type,
            status: 'pending',
            progress: 0,
            started_at: new Date()
        });
    },

    updateTaskStatus: async (step_id, status, error = null) => {
        const updateDoc = { status, error };
        if (['completed', 'failed'].includes(status)) {
            updateDoc.ended_at = new Date();
        }
        await db.collection('tasks').updateOne(
            { step_id },
            { $set: updateDoc }
        );
    },

    updateTaskProgress: async (step_id, progress, message) => {
        await db.collection('tasks').updateOne(
            { step_id },
            { $set: { progress, message } }
        );
    },

    insertTaskLog: async (workflow_id, step_id, level, message) => {
        await db.collection('task_logs').insertOne({
            id: nanoid(),
            workflow_id,
            step_id,
            level,
            message,
            ts: new Date()
        });
    },

    insertFetchLog: async (workflow_id, url, status_code, robots_allowed, cached) => {
        await db.collection('fetch_logs').insertOne({
            id: nanoid(),
            workflow_id,
            url,
            status_code,
            robots_allowed,
            cached,
            ts: new Date()
        });
    }
};
