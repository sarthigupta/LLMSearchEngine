import app from './app.js';
import { config } from './config.js';
    
app.listen(config.PORT, () => {
    console.log(`Server listening on http://localhost:${config.PORT}`);
    console.log(`Demo Mode: ${config.DEMO_MODE}`);
});
