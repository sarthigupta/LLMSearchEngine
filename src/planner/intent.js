import { generateJson } from '../llm/index.js';
import { SpecSchema } from './schemas.js';

const systemPrompt = `You convert business data requests into a JSON spec. Infer the entity type and the field names the user would want as columns. If the request is too vague to act on (no topic or target), set needs_clarification true and ask ONE short question. Output only JSON matching the schema.`;

export async function parseIntent(prompt) {
    return generateJson({ system: systemPrompt, prompt, schema: SpecSchema });
}
