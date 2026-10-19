/**
 * Platform detection utilities.
 * Cross-platform helpers for Windows/macOS/Linux.
 */

import type { Platform } from '../types/index.js';

/**
 * Detect the current operating system.
 */
export function detectPlatform(): Platform {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

export const isWindows: boolean = process.platform === 'win32';
export const isMacOS: boolean = process.platform === 'darwin';
export const isLinux: boolean = process.platform === 'linux';

/**
 * Detect if we're running in a CI / non-interactive environment.
 * Checks common CI environment variables.
 */
export function isCI(): boolean {
  return (
    process.env['CI'] === 'true' ||
    process.env['CI'] === '1' ||
    process.env['GITHUB_ACTIONS'] === 'true' ||
    process.env['GITLAB_CI'] === 'true' ||
    process.env['CIRCLECI'] === 'true' ||
    process.env['TRAVIS'] === 'true' ||
    process.env['JENKINS_HOME'] !== undefined ||
    process.env['BUILD_ID'] !== undefined
  );
}

/**
 * Detect if stdout is a real TTY (interactive terminal).
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Determine if output should use colors.
 * Respects NO_COLOR standard and non-TTY environments.
 */
export function shouldUseColor(): boolean {
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] !== undefined) return true;
  return isTTY() && !isCI();
}

/**
 * Return the executable extension for the current platform.
 * Windows needs ".cmd" or ".exe" suffixes for npm binaries.
 */
export function executableExtension(): string {
  return isWindows ? '.cmd' : '';
}

/**
 * Normalize a path separator for display purposes.
 * On Windows, convert backslashes to forward slashes for readability.
 */
export function normalizeSeparator(p: string): string {
  return isWindows ? p.replace(/\\/g, '/') : p;
}
