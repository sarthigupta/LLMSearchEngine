import { generateJson } from '../llm/index.js';
import { SpecSchema } from './schemas.js';

const systemPrompt = `You convert ANY user data-collection request into a JSON spec. The system must work for ANY topic — jobs, products, restaurants, research papers, stocks, sports stats, movies, recipes, companies, etc.

Rules:
1. "goal" must be the user's EXACT request verbatim. Do not rephrase.
2. "entity_type" — pick the closest: job_opening, lead, sponsorship, market_data, or generic. Use "generic" for anything that doesn't fit the others.
3. "fields" — infer 5-8 column names that would make a useful spreadsheet for this topic. Think: what columns would a user want to see in a table?

Examples:
- "best restaurants in Mumbai" → fields: ["name", "cuisine", "location", "rating", "price_range", "address", "phone"]
- "top AI research papers 2024" → fields: ["title", "authors", "institution", "published_date", "topic", "link"]
- "electric cars under 30 lakhs India" → fields: ["name", "brand", "price", "range_km", "battery", "charging_time", "features"]
- "freelance graphic design jobs" → fields: ["title", "company", "budget", "type", "skills_required", "deadline", "link"]
- "IPL 2024 team standings" → fields: ["team", "matches_played", "wins", "losses", "points", "net_run_rate"]
- "best laptops for programming 2024" → fields: ["name", "brand", "price", "processor", "ram", "storage", "display", "battery_life"]
- "recent earthquakes worldwide" → fields: ["location", "magnitude", "depth", "date", "time", "region"]
- "popular Netflix series 2024" → fields: ["title", "genre", "seasons", "rating", "release_date", "description"]

4. Always infer fields even if the user doesn't specify them. Think about what data would be most useful.
5. If the request is less than 3 words with no clear topic, set needs_clarification=true.
6. Output ONLY valid JSON.`;

export async function parseIntent(prompt) {
    return generateJson({ system: systemPrompt, prompt, schema: SpecSchema });
}
