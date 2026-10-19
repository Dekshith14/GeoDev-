/**
 * Environment service — reads environment variables and detects
 * common configuration files without touching actual secret values.
 */

import { pathExists } from './filesystem.js';
import { joinPath } from '../utils/paths.js';
import type { EnvVarStatus } from '../types/index.js';

/** Common environment variable names expected in web/backend projects */
const COMMON_ENV_VARS = [
  'DATABASE_URL',
  'DATABASE_HOST',
  'DATABASE_NAME',
  'REDIS_URL',
  'PORT',
  'HOST',
  'NODE_ENV',
  'API_KEY',
  'SECRET_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
] as const;

/** Common .env file names to check */
const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.example',
  '.env.sample',
  '.env.test',
] as const;

/**
 * Check which common environment variables are present in process.env.
 * NEVER reads or returns actual values — only presence.
 */
export function checkCommonEnvVars(): EnvVarStatus[] {
  return COMMON_ENV_VARS.map((name) => ({
    name,
    present: process.env[name] !== undefined,
  }));
}

/**
 * Check which .env files exist in the given directory.
 */
export async function detectEnvFiles(projectRoot: string): Promise<string[]> {
  const found: string[] = [];
  for (const name of ENV_FILES) {
    const fullPath = joinPath(projectRoot, name);
    if (await pathExists(fullPath)) {
      found.push(name);
    }
  }
  return found;
}

/**
 * Check if a specific environment variable is present.
 */
export function envVarPresent(name: string): boolean {
  return process.env[name] !== undefined;
}

/**
 * Detect missing critical env vars for the detected project type.
 * Returns a list of missing variable names.
 */
export function detectMissingCriticalEnvVars(criticalVars: string[]): string[] {
  return criticalVars.filter((v) => process.env[v] === undefined);
}
