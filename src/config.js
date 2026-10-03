import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  LLM_PROVIDER: z.string().default('groq'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('llama-3.1-70b-versatile'),
  LLM_RPM_LIMIT: z.coerce.number().default(10),
  SEARXNG_URL: z.string().default('http://localhost:8080'),
  TAVILY_API_KEY: z.string().optional(),
  MAX_PAGES_PER_WORKFLOW: z.coerce.number().default(10),
  MAX_RESULTS_PER_WORKFLOW: z.coerce.number().default(20),
  PER_DOMAIN_DELAY_MS: z.coerce.number().default(0),
  FETCH_CONCURRENCY: z.coerce.number().default(5),
  CACHE_TTL_HOURS: z.coerce.number().default(24),
  USER_AGENT: z.string().default('DataIntelBot/1.0 (+contact@example.com)'),
  DEMO_MODE: z.string().transform(v => v === 'true').default('false'),
  DATABASE_PATH: z.string().default('./data/app.db'),
});

export const config = envSchema.parse(process.env);
