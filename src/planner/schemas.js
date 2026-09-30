import { z } from 'zod';

export const SpecSchema = z.object({
    needs_clarification: z.boolean().default(false),
    question: z.string().nullable().optional(),
    goal: z.string().optional(),
    entity_type: z.enum(['job_opening', 'lead', 'sponsorship', 'market_data', 'generic']).optional(),
    filters: z.record(z.any()).optional(),
    fields: z.array(z.string()).optional(),
    required_fields: z.array(z.string()).optional(),
    source_types: z.array(z.string()).optional(),
    max_results: z.number().optional()
});

export const StepSchema = z.object({
    id: z.string(),
    type: z.enum(['web_search', 'fetch_pages', 'extract_structured', 'clean_normalize', 'validate', 'deduplicate', 'store']),
    params: z.record(z.any()),
    depends_on: z.array(z.string())
});

export const PlanSchema = z.object({
    steps: z.array(StepSchema)
});
