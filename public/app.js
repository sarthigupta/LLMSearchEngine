document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        prompt: 'Find AI/ML internship openings in India posted in the last 7 days',
        loading: false,
        currentWorkflowId: null,
        status: 'queued',
        progress: 0,
        logs: [],
        records: [],
        columns: [],
        inspectedRecord: null,
        inspectedSources: [],
        eventSource: null,

        init() {},

        async submitWorkflow() {
            if (!this.prompt.trim()) return;
            this.loading = true;
            this.status = 'queued';
            this.progress = 0;
            this.logs = ['Submitting workflow...'];
            this.records = [];
            this.columns = [];
            
            if (this.eventSource) this.eventSource.close();

            try {
                const res = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: this.prompt })
                });
                
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                this.currentWorkflowId = data.id;
                this.connectSSE();
            } catch (err) {
                alert(err.message);
                this.loading = false;
            }
        },

        connectSSE() {
            this.eventSource = new EventSource(`/api/workflows/${this.currentWorkflowId}/events`);
            
            this.eventSource.addEventListener('workflow_status', (e) => {
                const data = JSON.parse(e.data);
                this.status = data.status;
                if (data.status === 'completed' || data.status === 'failed') {
                    this.loading = false;
                    this.eventSource.close();
                    if (data.status === 'completed') {
                        this.fetchResults();
                    } else {
                        this.logs.unshift(`Workflow failed: ${data.error}`);
                    }
                }
            });

            this.eventSource.addEventListener('progress', (e) => {
                const data = JSON.parse(e.data);
                this.progress = data.progress_pct;
            });

            this.eventSource.addEventListener('task_update', (e) => {
                const data = JSON.parse(e.data);
                this.logs.unshift(`[Task] ${data.message}`);
                if (this.logs.length > 50) this.logs.pop();
            });

            this.eventSource.addEventListener('log', (e) => {
                const data = JSON.parse(e.data);
                this.logs.unshift(`[${data.level}] ${data.message}`);
                if (this.logs.length > 50) this.logs.pop();
            });
            
            this.eventSource.onerror = () => {
                this.eventSource.close();
            };
        },

        async fetchResults() {
            try {
                const res = await fetch(`/api/datasets/${this.currentWorkflowId}/records`);
                const data = await res.json();
                if (data.records && data.records.length > 0) {
                    this.records = data.records;
                    const allKeys = new Set();
                    data.records.forEach(r => Object.keys(r.data || {}).forEach(k => allKeys.add(k)));
                    this.columns = Array.from(allKeys);
                }
            } catch (err) {
                console.error("Failed to fetch records", err);
            }
        },

        async inspect(rec) {
            try {
                const res = await fetch(`/api/records/${rec.id}`);
                const data = await res.json();
                this.inspectedRecord = data.record;
                this.inspectedSources = data.sources;
            } catch (err) {
                console.error("Failed to fetch record detail", err);
            }
        }
    }));
});
