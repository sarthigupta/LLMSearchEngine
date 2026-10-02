import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { repo } from './db/repo.js';

import { api } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

import { connectDB } from './db/index.js';

app.use(cors());
app.use(express.json());

// Lazy load DB for serverless environments (like Vercel) where server.js is bypassed
app.use(async (req, res, next) => {
    try {
        const { db } = await import('./db/index.js');
        if (!db) {
            await connectDB();
        }
        next();
    } catch (e) {
        next(e);
    }
});

// API: Health Check
app.get('/api/health', async (req, res) => {
    try {
        const health = await repo.getHealth();
        res.json({ status: health.status, db: 'connected' });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

app.use('/api', api);

// Static Hosting for Dashboard
app.use(express.static(join(__dirname, '../public')));

// On boot, mark workflows stuck in 'running' as 'failed' (per architecture section 14)
try {
    import('./db/index.js').then(async ({ connectDB, db }) => {
        if (!db) await connectDB();
        
        // Re-import to get the populated db reference
        const updatedDb = (await import('./db/index.js')).db;
        if (updatedDb) {
            await updatedDb.collection('workflows').updateMany(
                { status: 'running' },
                { $set: { status: 'failed', error: 'Process restarted mid-run' } }
            );
        }
    });
} catch (e) {
    console.error('Failed to reset running workflows on boot:', e);
}

export default app;