import { generateJson } from '../llm/index.js';
import { PlanSchema } from './schemas.js';

const systemPrompt = `You design a data-collection workflow. Use ONLY these step types: web_search, fetch_pages, extract_structured, clean_normalize, validate, deduplicate, store.

CRITICAL RULES for the web_search step:
1. Generate 4-6 search queries that find LISTING PAGES or ARTICLES with multiple data points.
2. Include the user's key terms VERBATIM in each query.
3. Add variety using synonyms and modifiers: "list", "top", "best", "2024", "comparison", "latest", "ranking", "guide".
4. DO NOT use "site:" operators. Just write natural search queries.
5. Make queries specific enough to find data-rich pages, not generic news articles.
6. Mix query styles: some broad ("best X 2024 list"), some specific ("top 10 X comparison specs price").

Examples:
- Goal "web dev internships" → ["web development internship openings 2024", "web dev intern jobs list India remote", "web development internship vacancies paid unpaid"]
- Goal "best restaurants Mumbai" → ["best restaurants Mumbai 2024 list", "top rated restaurants Mumbai zomato ratings", "popular dining places Mumbai reviews"]
- Goal "latest healthcare discoveries" → ["latest medical discoveries 2024 breakthroughs", "recent healthcare innovations research list", "top medical advances 2024 healthcare"]
- Goal "electric cars India" → ["electric cars India 2024 price list", "best EVs under 30 lakhs India specs", "electric vehicle comparison India range battery"]

For extract_structured:
- entity_type and fields MUST match the spec exactly.
- Pass the fields array from the spec.

Return JSON with steps array. Each step has: id, type, params, depends_on.`;

export async function generatePlan(spec) {
    const prompt = `Create a workflow plan for this data collection spec:
${JSON.stringify(spec, null, 2)}

The goal is: "${spec.goal}"
Entity type: "${spec.entity_type}"  
Fields to extract: ${JSON.stringify(spec.fields || [])}

Generate search queries that will find LISTING PAGES containing multiple ${spec.entity_type === 'generic' ? 'items' : spec.entity_type + 's'} related to "${spec.goal}".`;
    return generateJson({ system: systemPrompt, prompt, schema: PlanSchema });
}
