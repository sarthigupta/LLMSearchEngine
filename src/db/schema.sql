CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    spec TEXT,
    plan TEXT,
    status TEXT NOT NULL,
    progress_pct INTEGER DEFAULT 0,
    error TEXT,
    parent_id TEXT,
    control_flag TEXT DEFAULT 'none',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    message TEXT,
    error TEXT,
    started_at TEXT,
    ended_at TEXT,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    schema_fields TEXT,
    record_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    data TEXT,
    confidence REAL,
    validation_status TEXT,
    extraction_method TEXT,
    dedup_key TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id)
);

CREATE TABLE IF NOT EXISTS record_sources (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    evidence_snippet TEXT,
    FOREIGN KEY(record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS fetch_logs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    url TEXT NOT NULL,
    status_code INTEGER,
    robots_allowed INTEGER,
    cached INTEGER,
    ts TEXT NOT NULL,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS task_logs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    ts TEXT NOT NULL,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_dataset_id ON records(dataset_id);
CREATE INDEX IF NOT EXISTS idx_records_confidence ON records(confidence);
CREATE INDEX IF NOT EXISTS idx_records_dedup_key ON records(dedup_key);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status_created_at ON workflows(status, created_at);
