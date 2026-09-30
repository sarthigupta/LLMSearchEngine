import { webSearch } from '../steps/webSearch.js';
import { fetchPages } from '../steps/fetchPages.js';
import { extractStructured } from '../steps/extractStructured.js';
import { cleanNormalize } from '../steps/cleanNormalize.js';
import { validate } from '../steps/validate.js';
import { deduplicate } from '../steps/deduplicate.js';
import { store } from '../steps/store.js';

export const registry = {
    web_search: { run: webSearch },
    fetch_pages: { run: fetchPages },
    extract_structured: { run: extractStructured },
    clean_normalize: { run: cleanNormalize },
    validate: { run: validate },
    deduplicate: { run: deduplicate },
    store: { run: store }
};
