import app from './app.js';
import { config } from './config.js';
import { connectDB } from './db/index.js';

const startServer = async () => {
    await connectDB();
    
    app.listen(config.PORT, () => {
        console.log(`Server listening on http://localhost:${config.PORT}`);
        console.log(`Demo Mode: ${config.DEMO_MODE}`);
    });
};

startServer();
