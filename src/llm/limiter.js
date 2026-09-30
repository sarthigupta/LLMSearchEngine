import PQueue from 'p-queue';
import { config } from '../config.js';

const interval = (60 * 1000) / config.LLM_RPM_LIMIT;
export const llmQueue = new PQueue({ concurrency: 1, interval, intervalCap: 1 });
