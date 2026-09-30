import express from 'express';
import { parseIntent } from '../planner/intent.js';
import { generatePlan } from '../planner/plan.js';
import { validatePlan, getDefaultPlan } from '../planner/validate.js';
import { enqueueWorkflow } from '../engine/worker.js';
import { engineEvents } from '../engine/context.js';
import { repo } from '../db/repo.js';
import { db } from '../db/index.js';

export const api = express.Router();

api.post('/workflows', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        let spec;
        try {
            spec = await parseIntent(prompt);
            if (spec.needs_clarification) spec.goal = prompt;
        } catch (e) {
            console.error("Intent parsing failed, using fallback:", e.message);
            spec = { goal: prompt, entity_type: 'generic' };
        }

        let plan;
        try {
            const rawPlan = await generatePlan(spec);
            if (!rawPlan.steps || rawPlan.steps.length === 0) throw new Error("Empty plan");
            plan = validatePlan(rawPlan, spec);
        } catch (e) {
            plan = getDefaultPlan(spec);
        }

        const id = repo.createWorkflow(prompt, spec, plan);
        enqueueWorkflow(id, plan);

        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.get('/workflows/:id/events', (req, res) => {
    const { id } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // Send initial state
    const wf = db.workflows.find(w => w.id === id);
    if (wf) {
        send('workflow_status', { workflowId: id, status: wf.status, error: wf.error });
        send('progress', { workflowId: id, progress_pct: wf.progress_pct });
    }

    const onEvent = (type) => (data) => {
        if (data.workflowId === id) send(type, data);
    };

    const listeners = {
        'workflow_status': onEvent('workflow_status'),
        'task_update': onEvent('task_update'),
        'progress': onEvent('progress'),
        'log': onEvent('log')
    };

    for (const [evt, fn] of Object.entries(listeners)) {
        engineEvents.on(evt, fn);
    }

    req.on('close', () => {
        for (const [evt, fn] of Object.entries(listeners)) {
            engineEvents.off(evt, fn);
        }
    });
});

api.get('/datasets/:workflowId/records', (req, res) => {
    try {
        const { workflowId } = req.params;
        const ds = db.datasets.filter(d => d.workflow_id === workflowId);
        if (ds.length === 0) return res.json({ records: [] });
        const dataset = ds[ds.length - 1]; 
        
        const records = db.records.filter(r => r.dataset_id === dataset.id);
        const parsed = records.map(r => ({ ...r, data: JSON.parse(r.data) }));
        res.json({ records: parsed });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.get('/records/:id', (req, res) => {
    try {
        const { id } = req.params;
        const record = db.records.find(r => r.id === id);
        if (!record) return res.status(404).json({ error: 'Not found' });
        
        const data = { ...record, data: JSON.parse(record.data) };
        const sources = db.record_sources.filter(s => s.record_id === id);
        res.json({ record: data, sources });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
