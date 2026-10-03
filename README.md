# LLM Search Engine

A full-stack Node.js application that leverages Large Language Models (LLMs) and SearXNG to autonomously plan, execute, extract, clean, validate, and store structured data from web searches.

## Features
- **Autonomous Workflow Planning**: Translates natural language goals (e.g., "Find AI/ML internships in India") into executable multi-step plans using Groq/Gemini.
- **Robust Web Scraping**: Integrates with SearXNG (metasearch engine) for gathering URLs and uses Playwright/Cheerio for content extraction.
- **Data Extraction & Normalization**: Extracts structured fields based on dynamically generated schemas.
- **Deduplication & Validation**: Prevents duplicate entries and ensures data integrity.
- **Docker Ready**: One-click deployment with SearXNG and the Node.js backend running in a single Docker Compose stack.
- **Real-Time UI**: Alpine.js based frontend to visualize live workflow execution using Server-Sent Events (SSE).

## Architecture
- **Backend**: Node.js, Express, MongoDB
- **Frontend**: HTML, CSS, Alpine.js
- **LLM Provider**: Groq (primary for fast JSON planning/extraction)
- **Search Engine**: SearXNG (Dockerized)

## Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- MongoDB

## Setup Instructions

### Local Development
1. Clone the repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your keys:
   ```env
   PORT=8000
   GROQ_API_KEY=your_groq_api_key
   LLM_MODEL=qwen/qwen3.8-27b
   MONGODB_URI=mongodb://localhost:27017/llmengine
   SEARXNG_URL=http://localhost:8080
   ```
4. Start SearXNG locally via Docker.
5. Run `npm run dev` to start the backend.

### Production Deployment (AWS / VPS)
You can deploy the entire stack (App + SearXNG) seamlessly using Docker Compose.

1. Clone the repository on your server.
2. Create a `.env` file in the root directory:
   ```env
   PORT=8000
   GROQ_API_KEY=your_groq_api_key
   MONGODB_URI=your_mongodb_connection_string
   ```
3. Run the automated deployment script (for Ubuntu):
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   *Alternatively, if Docker is already installed, just run:*
   ```bash
   docker compose up -d --build
   ```
4. Access the UI at `http://<YOUR_SERVER_IP>:8000`.

## How It Works
1. **User Prompt**: The user enters a natural language query in the UI.
2. **Intent & Planning**: The LLM parses the intent, identifies the entity (e.g., "job_opening"), fields required, and generates an execution plan.
3. **Execution Engine**: The system executes the plan step-by-step:
   - `web_search`: Queries SearXNG to collect relevant URLs.
   - `fetch_pages`: Scrapes the HTML content using Playwright.
   - `extract_structured`: Uses LLMs to pull structured JSON data from raw text.
   - `clean_normalize`: Standardizes formats (e.g., dates).
   - `validate`: Ensures required fields are present.
   - `deduplicate`: Removes overlapping entries based on key fields.
   - `store`: Saves the final dataset to MongoDB.
4. **Live Updates**: The UI listens to SSE events and updates progress in real-time.

## License
MIT
