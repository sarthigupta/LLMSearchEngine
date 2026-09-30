import { config } from '../config.js';

export function validatePlan(plan, spec) {
    let validPlan = JSON.parse(JSON.stringify(plan));
    
    for (let step of validPlan.steps) {
        if (step.type === 'fetch_pages' && step.params.max_pages) {
            step.params.max_pages = Math.min(step.params.max_pages, config.MAX_PAGES_PER_WORKFLOW);
        }
        if (step.type === 'web_search' && step.params.max_results) {
            step.params.max_results = Math.min(step.params.max_results, config.MAX_RESULTS_PER_WORKFLOW);
        }
    }

    const hasStore = validPlan.steps.some(s => s.type === 'store');
    if (!hasStore) {
        const lastStep = validPlan.steps[validPlan.steps.length - 1];
        validPlan.steps.push({
            id: 's_store',
            type: 'store',
            params: {},
            depends_on: lastStep ? [lastStep.id] : []
        });
    }

    return validPlan;
}

export function getDefaultPlan(spec) {
    return {
        steps: [
            { id: "s1", type: "web_search", params: { queries: [spec.goal || ""] }, depends_on: [] },
            { id: "s2", type: "fetch_pages", params: { max_pages: 10 }, depends_on: ["s1"] },
            { id: "s3", type: "extract_structured", params: { entity_type: spec.entity_type || "generic", fields: spec.fields || [] }, depends_on: ["s2"] },
            { id: "s4", type: "clean_normalize", params: {}, depends_on: ["s3"] },
            { id: "s5", type: "validate", params: { required_fields: spec.required_fields || [] }, depends_on: ["s4"] },
            { id: "s6", type: "deduplicate", params: {}, depends_on: ["s5"] },
            { id: "s7", type: "store", params: {}, depends_on: ["s6"] }
        ]
    };
}
