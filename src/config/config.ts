/**
 * GeoDev configuration — read/write .geodev/config.json.
 */

import { readJsonFile, writeJsonFile, pathExists } from '../services/filesystem.js';
import { geodevConfigPath, geodevDir } from '../utils/paths.js';
import { ConfigError } from '../utils/errors.js';
import type { GeodDevConfig } from '../types/index.js';

export const DEFAULT_CONFIG: GeodDevConfig = {
  version: 1,
  ignore: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '__pycache__',
    'target',
    '.idea',
    '.vscode',
  ],
  analysis: {
    dependencies: true,
    git: true,
    code: true,
  },
};

/**
 * Load the GeoDev config from the project root.
 * Returns the default config if none exists.
 */
export async function loadConfig(projectRoot: string): Promise<GeodDevConfig> {
  const configPath = geodevConfigPath(projectRoot);
  const raw = await readJsonFile<GeodDevConfig>(configPath);

  if (raw === null) return DEFAULT_CONFIG;

  if (raw.version !== 1) {
    throw new ConfigError(
      `Unknown config version: ${raw.version}. Expected version 1.`,
      'Delete .geodev/config.json and run `geodev init` to recreate it.'
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    analysis: {
      ...DEFAULT_CONFIG.analysis,
      ...raw.analysis,
    },
  };
}

/**
 * Save the GeoDev config to the project root.
 * Creates the .geodev directory if it doesn't exist.
 */
export async function saveConfig(projectRoot: string, config: GeodDevConfig): Promise<void> {
  const configPath = geodevConfigPath(projectRoot);
  await writeJsonFile(configPath, config);
}

/**
 * Check if GeoDev has been initialized in the project root.
 */
export async function isInitialized(projectRoot: string): Promise<boolean> {
  return pathExists(geodevDir(projectRoot));
}
