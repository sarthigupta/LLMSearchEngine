import { config } from "./src/config.js";

async function testEngines(enginesStr) {
    const url = `${config.SEARXNG_URL}/search?q=medical+discoveries+2024&format=json&engines=${enginesStr}`;
    console.log(`\n--- Engines: ${enginesStr} ---`);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
        console.error("Error:", res.status, res.statusText);
        return;
    }
    const data = await res.json();
    console.log(`Found ${data.results?.length} results.`);
    for (let i = 0; i < Math.min(3, data.results?.length || 0); i++) {
        console.log(`- ${data.results[i].url}`);
    }
}

async function run() {
    await testEngines('brave');
    await testEngines('qwant');
    await testEngines('yahoo');
    await testEngines('startpage');
}
run();
