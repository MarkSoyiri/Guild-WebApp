import { env } from '../../config/env';
import type { FreeFireProvider } from './types';
import { MockFreeFireProvider } from './mock';
import { ExternalFreeFireProvider } from './external';

let instance: FreeFireProvider | null = null;

export function getFreeFireProvider(): FreeFireProvider {
  if (instance) return instance;
  instance = env.FF_PROVIDER === 'external' ? new ExternalFreeFireProvider() : new MockFreeFireProvider();
  return instance;
}

export { MockFreeFireProvider } from './mock';
export { ExternalFreeFireProvider } from './external';
export type { FreeFireProvider, FFStats, FFStatsBase, FFProfile, FFRank, FFMatchResult } from './types';