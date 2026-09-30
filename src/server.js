import express from 'express';
console.log('SERVER STARTING');
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { repo } from './db/repo.js';

import { api } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// API: Health Check
app.get('/api/health', (req, res) => {
    try {
        repo.getHealth();
        res.json({ status: 'ok', db: 'connected' });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

app.get('/api/debug', async (req, res) => {
    const { db } = await import('./db/index.js');
    res.json(db);
});

app.use('/api', api);

// Static Hosting for Dashboard
app.use(express.static(join(__dirname, '../public')));

// On boot, mark workflows stuck in 'running' as 'failed' (per architecture section 14)
try {
    import('./db/index.js').then(({ db }) => {
        db.workflows.forEach(w => {
            if (w.status === 'running') {
                w.status = 'failed';
                w.error = 'Process restarted mid-run';
            }
        });
    });
} catch (e) {
    console.error('Failed to reset running workflows on boot:', e);
}

app.listen(config.PORT, () => {
    console.log(`Server listening on http://localhost:${config.PORT}`);
    console.log(`Demo Mode: ${config.DEMO_MODE}`);
});
