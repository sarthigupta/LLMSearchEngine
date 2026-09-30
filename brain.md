# BRAIN.md: AI-Powered Data Intelligence Platform

> The single source of truth for this project. Read this first. Any human or AI agent working on the project should be able to understand what we are building, why, how, and what "done" means from this file alone.

**Backend language:** Node.js (JavaScript, ES modules) with Zod for validation
**Timeline:** Must be built in one day
**Status legend:** `[ ]` todo, `[~]` in progress, `[x]` done

---

## 1. Project in one paragraph

A prompt-based platform where a user describes a data need in plain English ("Find AI/ML internships in India posted this week"). An LLM converts the prompt into a structured spec and a workflow plan built only from a fixed registry of safe steps. A deterministic engine executes the plan in the background: search, fetch (robots.txt respected), extract, clean, validate, deduplicate, store. Every record keeps its source URL, evidence snippet, fetch time, and confidence score. A dashboard lets users manage tasks, watch progress, explore and filter results, inspect sources, revisit history, and export datasets.

## 2. Original problem statement (verbatim intent)

Businesses often need to collect specific information from the web, such as job openings, sales leads, sponsor opportunities, market data, or other business-relevant information. Building separate scrapers and workflows for every requirement is time-consuming, difficult to maintain, and not scalable.

The challenge: build an AI-powered data intelligence platform where users describe what they need in plain English. The AI should understand the request, dynamically create and execute an appropriate data-collection workflow, gather information from permitted sources, process and validate the data, and present the results through a centralized dashboard.

The platform should also allow users to manage collection tasks, monitor their progress, explore results, inspect sources, revisit previous workflows, and export datasets.

### Stated goals (each must map to a feature)

| # | Goal from problem statement | Where we satisfy it |
|---|---|---|
| G1 | Understand data requirements from natural-language prompts | Intent parser (`planner.js`) |
| G2 | Dynamically design and execute data-collection workflows | Plan generator + engine + step registry |
| G3 | Collect and process information from multiple permitted sources | `web_search`, `fetch_pages`, compliance layer |
| G4 | Clean, structure, validate, and deduplicate results | `clean_normalize`, `validate`, `deduplicate` steps |
| G5 | Provide source-backed, traceable data | `record_sources`, evidence snippets, confidence |
| G6 | Allow users to monitor and manage collection tasks | Task list, progress, cancel/pause/retry/rerun/clone |
| G7 | Present results through an interactive dashboard | Single-page dashboard |
| G8 | Allow users to search, filter, and export collected data | Results explorer + export endpoints |
| G9 | Maintain workflow and dataset history | History view, dataset versioning |

**Expected outcome:** a complete product that turns a natural-language business requirement into a clean, structured, source-backed dataset with a managed end-to-end workflow.

## 3. Core principles (never violate)

1. **The LLM outputs specs and plans, never executable code.** A fixed engine runs vetted steps. Unknown step types are rejected.
2. **Never invent data.** Missing values are `null`. Extraction must include an evidence quote.
3. **Every record is traceable.** At least one source URL, fetch time, evidence snippet, and confidence score.
4. **Permitted sources only.** Respect robots.txt, rate limits, allow/deny lists. No login, paywall, or CAPTCHA circumvention.
5. **Schema is dynamic.** Record fields come from the prompt, stored as JSON. No hardcoded job/lead schema.
6. **Never block the API.** All workflows run in a background queue with progress reporting.
7. **Fail gracefully.** Partial results are kept on cancel/failure. A demo mode works offline.
8. **Secrets only in `.env`.**

## 4. Technology decisions

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20+ (ES modules) | Async-friendly for I/O-heavy scraping, one language front to back |
| API | Express | Simple, well-known, native SSE support |
| Validation | Zod | Runtime validation of LLM output; can emit JSON Schema |
| Database | SQLite via `better-sqlite3` | Zero setup, synchronous, fast; JSON stored as TEXT |
| Queue | `p-queue` (in-process) | No Redis/Docker; supports concurrency and control |
| LLM | Google Gemini via `@google/genai` | Free tier available; behind a provider interface |
| Search | Tavily via `@tavily/core` | Free monthly credits |
| Fetch | Built-in `fetch` (undici) | No extra dependency |
| robots.txt | `robots-parser` | Standard parser |
| HTML | `cheerio`, `jsdom`, `@mozilla/readability` | JSON-LD extraction and main-content text |
| Dates | `chrono-node` | Natural-language date parsing |
| Fuzzy match | `fuzzball` | Fuzzy dedup |
| Export | `exceljs` + custom CSV | XLSX and CSV |
| Frontend | Static HTML + Tailwind CDN + vanilla JS/Alpine | No build step |
| Tests | `vitest` | Fast, ESM-native |

**Why free/lightweight:** the whole project must run at zero cost on a laptop.

## 5. Feature inventory

### 5.1 Must-have (MVP, cannot cut)
- Prompt → intent spec → plan → run → results with sources → CSV/JSON export
- Live task status and progress
- Results table with search, filter, sort, pagination
- Source drawer per record (URL, evidence, time, confidence)
- robots.txt compliance and fetch logging

### 5.2 Should-have
- Plan preview and JSON edit before running
- Cancel, retry failed step, re-run, clone
- History of workflows and datasets
- XLSX export, filters applied to exports
- Confidence and validation badges
- Domain allow/deny settings
- DEMO_MODE offline replay

### 5.3 Nice-to-have (cut first if late)
- Pause/resume
- Insights charts
- Fuzzy dedup (exact dedup is MVP)
- Dataset diff between versions
- Scheduling

### 5.4 Cut order when behind schedule
Scheduling → charts → plan editing → pause/resume → fuzzy dedup → XLSX. Never cut the core loop.

## 6. End-to-end flow

1. User submits prompt → `POST /api/workflows/preview`
2. **Intent parser** (LLM, structured output) returns a **Spec** or a clarification question
3. **Plan generator** (LLM) returns a **Plan** from the step registry; **plan validator** checks it; fallback plan used on failure
4. UI shows spec + plan; user approves (optionally edits) → `POST /api/workflows`
5. Workflow row created (`queued`), job submitted to the queue
6. **Engine** topologically runs steps, writing task rows, logs, and progress; checks control flags between units of work
7. Steps: `web_search` → `fetch_pages` → `extract_structured` → `clean_normalize` → `validate` → `deduplicate` → `store`
8. Dataset + records + sources persisted; workflow becomes `completed`
9. Dashboard streams progress by SSE, then shows results; user filters, inspects sources, exports

## 7. Data contracts

### 7.1 Spec (output of intent parser)

```json
{
  "needs_clarification": false,
  "question": null,
  "goal": "Find AI/ML internship openings in India",
  "entity_type": "job_opening",
  "filters": {
    "location": "India",
    "posted_within_days": 7,
    "keywords": ["AI", "ML", "intern"]
  },
  "fields": ["title", "company", "location", "posted_date", "apply_url", "description"],
  "required_fields": ["title", "apply_url"],
  "source_types": ["search", "job_boards", "company_sites"],
  "max_results": 50
}
```

- `entity_type` is one of `job_opening | lead | sponsorship | market_data | generic`
- `fields` are inferred from the prompt (leads: name, company, role, website, contact; sponsors: organisation, program, contact_url, deadline; funding: company, amount, round, founders, website)

### 7.2 Plan (output of planner)

```json
{
  "steps": [
    {"id": "s1", "type": "web_search", "params": {"queries": ["..."], "max_results_per_query": 8}, "depends_on": []},
    {"id": "s2", "type": "fetch_pages", "params": {"max_pages": 30, "timeout_ms": 15000}, "depends_on": ["s1"]},
    {"id": "s3", "type": "extract_structured", "params": {"entity_type": "job_opening"}, "depends_on": ["s2"]},
    {"id": "s4", "type": "clean_normalize", "params": {}, "depends_on": ["s3"]},
    {"id": "s5", "type": "validate", "params": {"required_fields": ["title","apply_url"]}, "depends_on": ["s4"]},
    {"id": "s6", "type": "deduplicate", "params": {"fuzzy_threshold": 90}, "depends_on": ["s5"]},
    {"id": "s7", "type": "store", "params": {}, "depends_on": ["s6"]}
  ]
}
```

### 7.3 Record (in-memory shape passed between steps)

```json
{
  "data": {"title": "ML Intern", "company": "Acme", "location": "Bengaluru", "posted_date": "2026-09-28", "apply_url": "https://..."},
  "sources": [{"url": "https://...", "domain": "example.com", "fetched_at": "2026-09-30T10:00:00Z", "evidence": "…quote…"}],
  "extraction_method": "jsonld",
  "confidence": 0.0,
  "validation_status": "pending"
}
```

## 8. Step registry (behaviour contract)

| Step | Input | Output | Key rules |
|---|---|---|---|
| `web_search` | spec | list of `{url,title,snippet}` | LLM makes 3-6 diverse queries; Tavily search; dedupe URLs; apply allow/deny |
| `fetch_pages` | URL list | list of `{url, html, status, fetchedAt}` | robots.txt check, per-domain delay, honest User-Agent, 2 MB cap, retry x2 with backoff, disk cache 24h, log every attempt |
| `extract_structured` | pages | raw records | Tier 1 JSON-LD; Tier 2 Readability text → LLM (schema, null if missing, evidence quote); cache by content hash |
| `clean_normalize` | records | records | trim, strip HTML, ISO dates, absolute URLs, remove tracking params, normalise company/location |
| `validate` | records | records + score | dynamic Zod schema; required fields; date window; keyword relevance; optional HEAD check; drop `invalid` |
| `deduplicate` | records | records | normalised hash key; fuzzy > threshold; merge, keep best, union sources |
| `store` | records | dataset id | write dataset/records/sources; version increments on re-run of same lineage |

### Plan validation rules
- Only registry step types; reject unknown
- No cycles, no missing dependencies
- Clamp `max_pages` ≤ 40 and `max_results` ≤ 200
- `store` must be last; auto-append if missing
- On any failure, use the default plan template

### Confidence scoring (0 to 1)

```
confidence = 0.30 * methodScore        // jsonld = 1.0, llm = 0.6
           + 0.30 * completeness       // filled fields / requested fields
           + 0.20 * evidenceScore      // evidence present and found in page text = 1.0
           + 0.20 * validationScore    // passed checks / total checks
```

`validation_status`: `valid` (≥ 0.6 and all required fields), `partial` (required fields present but low score), `invalid` (missing required fields or failed date window).

## 9. LLM prompt templates

**Intent parser (system):**
> You convert business data requests into a JSON spec. Infer the entity type and the field names the user would want as columns. If the request is too vague to act on (no topic or target), set needs_clarification true and ask ONE short question. Output only JSON matching the schema.

**Plan generator (system):**
> You design a data-collection workflow using ONLY these step types: web_search, fetch_pages, extract_structured, clean_normalize, validate, deduplicate, store. Return JSON steps with id, type, params, depends_on. For web_search, write 3 to 6 diverse, specific queries that would surface pages containing the requested data. Never invent step types.

**Extractor (system):**
> Extract records matching the given field schema from the page text. Return a JSON array (possibly empty). Use null for any field not explicitly stated in the text. Never guess or infer values. For each record include an "evidence" field with a short verbatim quote (under 200 characters) from the text that supports it.

Rules for all LLM calls: JSON output mode with schema, Zod-parse the result, one repair retry on parse failure, global rate limiter, exponential backoff with jitter on 429/5xx, truncate page text to about 8,000 characters.

## 10. Compliance layer

- robots.txt fetched and cached per domain; disallowed URLs skipped and logged with `robots_allowed=false`
- Minimum 1 second between requests to the same domain
- Honest User-Agent from env
- Domain allow/deny lists (settings table)
- Skip 401/403 and obvious login/paywall pages; no bypass attempts
- Response size cap 2 MB, timeout 15 s
- All fetch attempts logged (`fetch_logs`)

## 11. Data model (SQLite)

| Table | Columns |
|---|---|
| `workflows` | id, prompt, spec (JSON text), plan (JSON text), status, progress_pct, error, parent_id, control_flag, created_at, updated_at |
| `tasks` | id, workflow_id, step_id, type, status, progress, message, error, started_at, ended_at |
| `datasets` | id, workflow_id, schema_fields (JSON), record_count, version, created_at |
| `records` | id, dataset_id, data (JSON), confidence, validation_status, extraction_method, dedup_key, created_at |
| `record_sources` | id, record_id, url, domain, fetched_at, evidence_snippet |
| `fetch_logs` | id, workflow_id, url, status_code, robots_allowed, cached, ts |
| `task_logs` | id, workflow_id, step_id, level, message, ts |
| `settings` | key, value (JSON): domain allow/deny lists |

Workflow status: `queued, running, paused, completed, failed, cancelled`
Task status: `pending, running, completed, failed, skipped`

## 12. API surface

```
POST /api/workflows/preview          {prompt} -> {spec, plan} | {needs_clarification, question}
POST /api/workflows                  {prompt, spec?, plan?} -> {id}
GET  /api/workflows                  ?status=&q=
GET  /api/workflows/:id
GET  /api/workflows/:id/events       SSE
POST /api/workflows/:id/{cancel|pause|resume|retry|rerun|clone}
GET  /api/workflows/:id/logs
GET  /api/workflows/:id/sources
GET  /api/datasets/:workflowId/records   ?q=&sort=&order=&page=&pageSize=&minConfidence=&status=&field.<name>=
GET  /api/records/:id
GET  /api/datasets/:workflowId/export    ?format=csv|json|xlsx (+ same filters)
GET|PUT /api/settings/domains
GET  /api/health
```

## 13. Dashboard views

1. **New Request:** prompt box, example chips, Generate Plan, plan visual + JSON edit toggle, Run
2. **Workflows:** status badge, progress bar, action buttons
3. **Workflow detail:** step timeline, live logs, sources used (robots decisions)
4. **Results:** dynamic columns, global search, column filters, sort, pagination, badges, source drawer
5. **Export:** CSV/JSON/XLSX buttons (filters applied)
6. **History:** re-run, clone
7. **Insights:** totals, avg confidence, top domains
8. **Settings:** domain allow/deny editor

UX: dark theme, toasts, loading/empty/error states, responsive.

## 14. Configuration (.env)

```
PORT=8000
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
LLM_RPM_LIMIT=10
TAVILY_API_KEY=
MAX_PAGES_PER_WORKFLOW=40
MAX_RESULTS_PER_WORKFLOW=200
PER_DOMAIN_DELAY_MS=1000
FETCH_CONCURRENCY=5
CACHE_TTL_HOURS=24
USER_AGENT=DataIntelBot/1.0 (+contact@example.com)
DEMO_MODE=false
DATABASE_PATH=./data/app.db
```

Check Google AI Studio for currently available model names and your free-tier limits.

## 15. Demo prompts (must all work)

1. "Find AI/ML internship openings in India posted in the last 7 days"
2. "Collect sponsorship opportunities for tech hackathons in 2026 with contact links"
3. "Find fintech startups that raised funding this year, with founders and website"

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free-tier LLM rate limits | Global limiter, backoff, JSON-LD first, content-hash cache, small page caps |
| Live scraping fails during demo | `DEMO_MODE` with cached datasets, pre-recorded video |
| LLM hallucination | Null-by-default, evidence required and verified against page text, validation, confidence |
| Sites block or render with JS | Skip gracefully, log; rely on search snippets/JSON-LD; note limitation |
| LLM returns bad plan/JSON | Zod validation, repair retry, default plan fallback |
| Scope too big for one day | Must/should/nice tiers; cut order in section 5.4 |
| Legal/ethical concerns | Compliance layer, audit logs, disclaimers |

## 17. Definition of done

- [ ] Prompt → preview → run → live progress → results works end to end
- [ ] Every record shows source URL, evidence, confidence
- [ ] Cancel, retry, re-run, clone work
- [ ] robots.txt decisions visible in the sources panel
- [ ] Export CSV/JSON/XLSX respects filters
- [ ] Three demo prompts yield three different schemas with no code changes
- [ ] DEMO_MODE works offline
- [ ] Tests pass; README lets a stranger run it in 5 minutes
- [ ] PPT and demo video ready

## 18. One-day schedule

| Time | Work |
|---|---|
| 0:00-0:45 | Setup, keys, skeleton, DB |
| 0:45-2:30 | LLM client, planner, engine, queue |
| 2:30-4:30 | Search, fetch, compliance, extraction |
| 4:30-5:30 | Clean, validate, dedup, store |
| 5:30-7:30 | Dashboard |
| 7:30-8:30 | Controls, history, export |
| 8:30-9:15 | Test 3 prompts, demo mode, bug fixes |
| 9:15-10:00 | PPT, README, demo video |

## 19. Glossary

- **Spec:** structured interpretation of the user's request
- **Plan:** ordered list of registry steps to fulfil the spec
- **Step registry:** the fixed set of vetted operations the engine can run
- **Workflow:** one execution of a plan for a prompt
- **Dataset:** the records a workflow produced (versioned)
- **Evidence:** a verbatim quote from the source supporting a record
- **Confidence:** 0-1 score of how reliable a record is
- **Demo mode:** replay of cached datasets with simulated progress

## 20. Decision log

| Decision | Choice | Why |
|---|---|---|
| Backend language | Node.js (JS) | User preference; async I/O fits scraping |
| Job queue | In-process `p-queue` | No infra; enough for a single-node demo |
| DB | SQLite | Zero setup; JSON columns give schema flexibility |
| LLM | Gemini (swappable) | Free tier |
| Frontend | Static SPA, no build | Fastest for one day |
| Code generation by LLM | Forbidden | Safety and reliability |

## 21. Known limitations (state honestly in README and demo)

- No headless browser: JS-rendered pages may yield little
- Free-tier throughput limits; runs are throttled
- Extraction accuracy depends on page quality; confidence flags weak records
- Single-node only (SQLite + in-process queue)
- Users must follow each site's terms of service

## 22. Future roadmap

Scheduled runs, incremental runs with dataset diff, editable plan graph, Postgres + Redis/BullMQ workers, API/RSS/sitemap connectors, optional Playwright step for permitted JS pages, multi-user workspaces, webhooks and integrations.
