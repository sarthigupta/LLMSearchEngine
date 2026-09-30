# PROMPT FOR ANTIGRAVITY (Node.js version)

**How to use:** Put `brain.md` and `architecture.md` in the workspace root first, then paste everything below the line into the agent.

---

You are a senior full-stack engineer. Build the complete, working, demo-ready product **"AI-Powered Data Intelligence Platform"** in this workspace.

**First, read `brain.md` and `architecture.md` in the workspace root.** They are the source of truth for scope, data contracts, behaviour, and design. If anything below conflicts with them, ask me; otherwise follow both.

I have ONE DAY, so prioritise a working end-to-end flow over extras. Follow the build order in section 12, run and verify each stage before moving on, and do not stop until the acceptance criteria in section 14 are met.

## 1. Product in brief

The user types a data need in plain English. An LLM turns it into a structured Spec and a Plan built ONLY from a fixed step registry. A deterministic engine executes the plan in the background (search, fetch, extract, clean, validate, deduplicate, store). Every record keeps source URL(s), evidence snippet, fetch time, confidence score. A dashboard lets the user manage tasks, watch live progress, explore/filter results, inspect sources, view history, and export datasets.

**Non-negotiable rule:** the LLM never writes or executes code. Unknown step types are rejected.

## 2. Tech stack (mandatory)

- **Node.js 20+**, plain **JavaScript with ES modules** (`"type": "module"`), no TypeScript, no build step
- **Express** for the API, static hosting, and SSE
- **Zod** for all validation (config, API input, Spec, Plan, LLM output, dynamic record schemas)
- **better-sqlite3** (WAL mode) for storage; JSON stored as TEXT columns
- **p-queue** for the in-process job queue (no Redis, no Docker)
- **@google/genai** for Gemini; model from `GEMINI_MODEL` env (default `gemini-2.5-flash`); build behind a provider interface
- **@tavily/core** for web search
- Built-in `fetch` for HTTP; **robots-parser** for robots.txt
- **cheerio** (JSON-LD and HTML parsing), **jsdom** + **@mozilla/readability** (main-content text)
- **chrono-node** for dates, **fuzzball** for fuzzy matching
- **exceljs** for XLSX, custom CSV writer, **zod-to-json-schema** for LLM response schemas
- **dotenv**, **cors**, **nanoid**
- **vitest** for tests
- **Frontend:** static files in `public/` (HTML + Tailwind CDN + vanilla JS or Alpine.js). No framework build. Polished dark UI with cards, badges, progress bars, toasts.

Run with: `npm install && npm start`, then open `http://localhost:8000`.

## 3. Folder structure (create exactly this)

```
project/
├─ src/
│  ├─ server.js
│  ├─ config.js
│  ├─ db/            index.js, schema.sql, repo.js
│  ├─ llm/           index.js, gemini.js, limiter.js
│  ├─ planner/       intent.js, plan.js, validate.js, schemas.js
│  ├─ engine/        registry.js, runner.js, context.js, worker.js
│  ├─ steps/         webSearch.js, fetchPages.js, extractStructured.js,
│  │                 cleanNormalize.js, validate.js, deduplicate.js, store.js
│  ├─ compliance/    robots.js, rateLimiter.js, domains.js, ssrf.js
│  ├─ cache/         index.js
│  ├─ routes/        workflows.js, datasets.js, records.js, export.js, settings.js, events.js
│  ├─ export/        csv.js, xlsx.js
│  └─ demo/          replay.js
├─ public/           index.html, app.js, styles.css
├─ sample_data/      jobs.json, sponsorships.json, startups.json
├─ tests/
├─ data/             (gitignored: sqlite db + cache)
├─ package.json
├─ .env.example
├─ .gitignore
└─ README.md
```

## 4. Database

Create tables per `brain.md` section 11 and `architecture.md` section 11: `workflows, tasks, datasets, records, record_sources, fetch_logs, task_logs, settings`. Use `CREATE TABLE IF NOT EXISTS`, enable WAL, add the indexes listed in architecture section 11. IDs via `nanoid`. Timestamps as ISO strings. On server boot, mark workflows stuck in `running` as `failed` with a recoverable message.

## 5. LLM layer

`llm.generateJson({ system, prompt, schema })`:
1. Convert the Zod schema to JSON Schema (zod-to-json-schema) and use Gemini JSON/structured output mode (if unsupported, instruct JSON in the prompt)
2. Global **token-bucket limiter** shared by ALL calls (`LLM_RPM_LIMIT`, default 10)
3. Retry with exponential backoff + jitter on 429/5xx (max 4 tries)
4. Parse and Zod-validate; on failure make ONE repair call including the validation error
5. Throw a typed `LlmError` if still failing

Use the three system prompts in `brain.md` section 9 (intent, planner, extractor). Add a `DEMO_MODE` short-circuit so no LLM calls are made in demo mode.

## 6. Planner

- `parseIntent(prompt)` returns a Spec (schema in `brain.md` 7.1) or `{needs_clarification: true, question}`. `fields` must be inferred dynamically (never a fixed schema).
- `generatePlan(spec)` returns a Plan (schema in 7.2), steps chosen ONLY from: `web_search, fetch_pages, extract_structured, clean_normalize, validate, deduplicate, store`.
- `validatePlan(plan)`: reject unknown step types, cycles, missing dependencies; clamp `max_pages` ≤ 40 and `max_results` ≤ 200; force `store` last. On any failure return the **default plan template** built deterministically from the Spec.
- `POST /api/workflows/preview` returns `{spec, plan}` without executing.

## 7. Engine

- `registry.js`: map of step name → `{ paramsSchema (Zod), run(ctx, input, params) }`. Adding a step = adding one file plus one registry line.
- `runner.js`: topologically sort; for each step create/update a `tasks` row; write `task_logs`; emit events (`workflow_status`, `task_update`, `progress`, `log`, `stats`) through a shared `EventEmitter`.
- `context.js`: `ctx.emit()`, `ctx.log()`, `ctx.shouldStop()` (reads `workflows.control_flag`), settings, workflow id.
- Steps must call `ctx.shouldStop()` between units of work; on cancel stop cleanly and keep partial results; on pause wait until resumed.
- `worker.js`: `p-queue` (concurrency 2), job lifecycle, `retry` (re-run failed/pending tasks reusing caches), `rerun` (new workflow with `parent_id`, dataset version + 1), `clone` (copy prompt/spec/plan for editing).
- Non-critical step failure: mark task failed, continue if possible. Critical failure: workflow `failed`, partial data kept.

## 8. Step implementations

Follow the behaviour contract in `brain.md` section 8 and the diagrams in `architecture.md` sections 7 and 10.

- **webSearch:** LLM writes 3 to 6 diverse queries; Tavily search; dedupe URLs; apply allow/deny list; emit progress.
- **fetchPages:** for each URL: SSRF guard (http/https only, block localhost/private IPs) → allow/deny → robots.txt (cached per domain) → per-domain delay gate (≥ `PER_DOMAIN_DELAY_MS`) → fetch with honest `USER_AGENT`, 15 s timeout, 2 MB cap → skip 401/403/login pages (no bypass) → retry ×2 with backoff on 429/5xx → disk cache (24 h) → write a `fetch_logs` row for EVERY attempt. Concurrency `FETCH_CONCURRENCY`.
- **extractStructured:** Tier 1 read `<script type="application/ld+json">` via cheerio and map schema.org types (JobPosting, Organization, Event, Product, etc.) to requested fields. Tier 2 (fallback or fill missing): Readability text → truncate ~8,000 chars → LLM extractor prompt → array of records, `null` for missing, verbatim `evidence`. Verify evidence appears in the page text (lower confidence if not). Cache LLM results by content hash. A page may yield 0..N records. Record `extraction_method` (`jsonld` or `llm`).
- **cleanNormalize:** trim, strip HTML, ISO dates via chrono-node, absolute URLs, strip tracking params (utm_*, fbclid…), normalise company names and locations.
- **validate:** build a dynamic Zod schema from the requested fields; check required fields, date window (`posted_within_days`), keyword relevance, URL format, optional HEAD check on the primary URL; compute `confidence` using the formula in `brain.md` section 8; set `validation_status` `valid|partial|invalid`; drop `invalid` but include counts in stats.
- **deduplicate:** normalised key hash for exact match, then fuzzball ratio ≥ threshold (default 90) for fuzzy match; merge, keep the highest-confidence record, union all sources.
- **store:** create dataset (version increments for re-runs of the same lineage), batch-insert records and sources inside one transaction, update `record_count`.

## 9. API

Implement every endpoint in `brain.md` section 12:

- Workflows: preview, create, list (`status`, `q`), detail, events (SSE), cancel, pause, resume, retry, rerun, clone, logs, sources
- Records: `GET /api/datasets/:workflowId/records` with `q`, `sort`, `order`, `page`, `pageSize`, `minConfidence`, `status`, and per-field filters `field.<name>=`; filtering on dynamic fields via `json_extract`
- `GET /api/records/:id` returns the record plus all sources and evidence
- Export: `GET /api/datasets/:workflowId/export?format=csv|json|xlsx`, applying the same filters
- Settings: domain allow/deny GET/PUT
- `GET /api/health`
- Validate all input with Zod; consistent error JSON `{error: {code, message}}`; basic rate limit on workflow creation.

SSE: correct headers, heartbeat every 15 s, cleanup on disconnect, send a state snapshot on connect.

## 10. Dashboard (public/)

All must work:

1. **New Request:** large prompt box, 4 example chips, Generate Plan, show clarification questions inline, render Spec and Plan as a step-flow visual with an editable JSON toggle, Run button.
2. **Workflows list:** status badges, animated progress bars, counts, action buttons (cancel, pause/resume, retry, re-run, clone).
3. **Workflow detail:** step timeline (status, time, message), live log console, "Sources used" panel (domains, robots decisions, fetch counts, cache hits).
4. **Results explorer:** dynamic columns from `schema_fields`, global search, per-column filters, sort, server pagination, confidence badge, validation badge. **Row click opens a source drawer:** all source URLs (clickable), evidence snippet, fetch time, extraction method, confidence breakdown.
5. **Export buttons:** CSV / JSON / XLSX honouring active filters.
6. **History:** list of past workflows and datasets with re-run and clone.
7. **Insights strip:** total records, average confidence, top domains, a small SVG/canvas chart.
8. **Settings modal:** domain allow/deny editor.

Escape all scraped values before rendering (XSS-safe). Handle loading, empty and error states; toasts; responsive; SSE with polling fallback every 2 s.

## 11. Non-negotiable behaviours and extras

- Never invent data; missing = `null`; every record has ≥ 1 source URL and evidence.
- Respect robots.txt and rate limits; no login/paywall/CAPTCHA circumvention; no proxy rotation.
- All secrets from `.env`; provide `.env.example` with every variable in `brain.md` section 14.
- **DEMO_MODE:** ship `sample_data/` with three realistic pre-generated datasets (jobs, sponsorships, startups) including sources, evidence, and confidence. When `DEMO_MODE=true`, matching prompts replay the cached run through the normal tables with simulated progress, logs, and SSE events so the UI is identical. Non-matching prompts pick the closest sample or explain demo mode.
- Write a clear **README.md** (what it is, setup, env, run, demo prompts, architecture summary, limitations).

## 12. Build order (follow strictly; verify each stage runs)

1. `package.json`, folders, `.env.example`, `config.js` (Zod), DB schema and `repo.js`, `/api/health`, static hosting
2. `llm/` (limiter, retry, JSON mode, repair) + `planner/` (intent, plan, validation, default plan) + preview endpoint
3. Engine: registry, runner, context, worker, task/progress tracking, SSE, cancel
4. `compliance/` (robots, rate limiter, domains, SSRF) + `webSearch` + `fetchPages` + cache
5. `extractStructured` (JSON-LD then LLM), `cleanNormalize`, `validate`, `deduplicate`, `store`
6. Records query, detail, and export endpoints
7. Dashboard views 1 to 8
8. Retry, rerun, clone, pause/resume, history, settings
9. Demo mode + sample data
10. Tests (below), then run the three demo prompts and fix bugs, then finalise README with honest limitations

## 12b. Tests (vitest)

- Unit: plan validation (unknown step, cycle, missing dep, clamping, forced `store`), dedup exact and fuzzy, date normalisation, robots decisions, confidence scoring, URL cleaning, SSRF guard
- Integration: full pipeline against a local mock HTTP server serving fixture pages (with JSON-LD, without JSON-LD, a robots.txt that disallows one path) and a mocked LLM; assert records, sources, evidence, and `fetch_logs` (including a `robots_allowed=false` row)
- Run all tests and fix failures before finishing.

## 13. Demo prompts that must work

1. "Find AI/ML internship openings in India posted in the last 7 days"
2. "Collect sponsorship opportunities for tech hackathons in 2026 with contact links"
3. "Find fintech startups that raised funding this year, with founders and website"

Each must yield a different column set with zero code changes.

## 14. Acceptance criteria (definition of done)

- [ ] `npm install && npm start` works; dashboard loads at `http://localhost:8000`
- [ ] Prompt → preview plan → run → live progress → results table works end to end
- [ ] Every record shows source URL, evidence, confidence in the drawer
- [ ] Cancel, retry, re-run, clone work; pause/resume works or is documented as not done
- [ ] robots.txt decisions and fetch counts are visible in the Sources panel
- [ ] CSV, JSON, XLSX export work with filters applied
- [ ] Three prompts produce three different schemas
- [ ] DEMO_MODE works fully offline
- [ ] `npm test` passes
- [ ] README lets a stranger run it in under 5 minutes

## 15. Working rules for you, the agent

- Work stage by stage; after each stage, run the app or tests and show me the result briefly.
- If a library API is unclear, check its docs rather than guessing.
- Keep code modular, readable, and commented where non-obvious; no dead code.
- If something cannot be finished (e.g. pause/resume), say so clearly instead of faking it.
- When finished, give me: a short summary of what was built, how to run it, what is untested with real keys, and known limitations.
