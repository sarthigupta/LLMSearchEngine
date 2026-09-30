import { generateJson } from '../llm/index.js';
import { PlanSchema } from './schemas.js';

const systemPrompt = `You design a data-collection workflow using ONLY these step types: web_search, fetch_pages, extract_structured, clean_normalize, validate, deduplicate, store. Return JSON steps with id, type, params, depends_on. For web_search, write 3 to 6 diverse, specific queries that would surface pages containing the requested data. Never invent step types.`;

export async function generatePlan(spec) {
    const prompt = `Create a plan for this spec:\n${JSON.stringify(spec, null, 2)}`;
    return generateJson({ system: systemPrompt, prompt, schema: PlanSchema });
}
