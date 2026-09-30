import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { llmQueue } from './limiter.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry(fn, maxRetries = 4) {
    let attempt = 0;
    while (true) {
        try {
            return await llmQueue.add(fn);
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries || !error.status || (error.status !== 429 && error.status < 500)) {
                throw error;
            }
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            await wait(delay);
        }
    }
}

export async function generateJson({ system, prompt, schema }) {
    if (config.DEMO_MODE) {
        throw new Error('LLM calls are disabled in DEMO_MODE');
    }
    
    const jsonSchema = zodToJsonSchema(schema, "responseSchema").definitions.responseSchema;
    const fullSystem = `${system}\n\nOutput strictly valid JSON matching this schema: ${JSON.stringify(jsonSchema)}`;

    const doCall = async (repairError = null) => {
        const finalPrompt = repairError ? `${prompt}\n\nYour previous JSON failed validation. Fix this error:\n${repairError}` : prompt;
        const response = await ai.models.generateContent({
            model: config.LLM_MODEL,
            contents: finalPrompt,
            config: {
                systemInstruction: fullSystem,
                responseMimeType: "application/json",
            }
        });
        
        let text = response.text;
        if (text.startsWith('```json')) text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
        else if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');
        
        const parsed = JSON.parse(text);
        return schema.parse(parsed);
    };

    try {
        return await callWithRetry(() => doCall());
    } catch (e) {
        if (e.name === 'ZodError' || e instanceof SyntaxError) {
            return await callWithRetry(() => doCall(e.message));
        }
        throw e;
    }
}
