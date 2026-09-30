import robotsParser from 'robots-parser';

const cache = new Map();

export async function isAllowed(urlStr, userAgent) {
    try {
        const url = new URL(urlStr);
        const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
        
        if (!cache.has(robotsUrl)) {
            const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
            const text = res && res.ok ? await res.text() : '';
            cache.set(robotsUrl, robotsParser(robotsUrl, text));
        }
        
        const parser = cache.get(robotsUrl);
        return parser.isAllowed(urlStr, userAgent) !== false;
    } catch (e) {
        return true; 
    }
}
