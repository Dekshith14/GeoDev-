/**
 * Path utilities — cross-platform safe path helpers.
 */

import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Resolve a path relative to the current working directory.
 */
export function resolveCwd(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

/**
 * Resolve a path relative to the user's home directory.
 */
export function resolveHome(...segments: string[]): string {
  return path.join(os.homedir(), ...segments);
}

/**
 * Join path segments in a cross-platform safe way.
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get the relative path from `from` to `to`, formatted with forward slashes.
 */
export function relativePath(from: string, to: string): string {
  return path.relative(from, to).replace(/\\/g, '/');
}

/**
 * Get basename of a path.
 */
export function baseName(p: string, ext?: string): string {
  return ext !== undefined ? path.basename(p, ext) : path.basename(p);
}

/**
 * Get directory name of a path.
 */
export function dirName(p: string): string {
  return path.dirname(p);
}

/**
 * Get the file extension (including the dot), lowercase.
 */
export function fileExtension(p: string): string {
  return path.extname(p).toLowerCase();
}

/**
 * The GeoDev config directory name within a project.
 */
export const GEODEV_DIR = '.geodev';

/**
 * The config file name within the GeoDev directory.
 */
export const GEODEV_CONFIG_FILE = 'config.json';

/**
 * Get the path to the .geodev directory in the given project root.
 */
export function geodevDir(projectRoot: string): string {
  return path.join(projectRoot, GEODEV_DIR);
}

/**
 * Get the path to the GeoDev config file.
 */
export function geodevConfigPath(projectRoot: string): string {
  return path.join(projectRoot, GEODEV_DIR, GEODEV_CONFIG_FILE);
}
