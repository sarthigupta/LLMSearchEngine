import { generateJson as generateGroq } from './groq.js';
import { generateJson as generateGemini } from './gemini.js';
import { config } from '../config.js';

export async function generateJson(params) {
    if (config.LLM_PROVIDER === 'groq') {
        return generateGroq(params);
    }
    return generateGemini(params);
}
