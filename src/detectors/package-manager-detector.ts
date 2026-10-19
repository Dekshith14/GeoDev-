/**
 * Package manager detector.
 * Determines which package manager is used in a Node.js project.
 */

import { pathExists } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';
import type { PackageManager } from '../types/index.js';

interface LockfileSignature {
  file: string;
  manager: PackageManager;
}

const LOCKFILE_SIGNATURES: LockfileSignature[] = [
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'bun.lockb', manager: 'bun' },
  { file: 'package-lock.json', manager: 'npm' },
];

/**
 * Detect the package manager used in a project directory.
 *
 * Priority order:
 * 1. packageManager field in package.json
 * 2. Presence of lockfiles (most specific first)
 * 3. Fallback to npm if package.json exists
 */
export async function detectPackageManager(
  projectRoot: string,
  packageJson?: Record<string, unknown>
): Promise<PackageManager> {
  // 1. Check packageManager field (Corepack standard)
  if (packageJson !== undefined) {
    const pm = packageJson['packageManager'];
    if (typeof pm === 'string') {
      const name = pm.split('@')[0]?.toLowerCase() ?? '';
      if (name === 'pnpm') return 'pnpm';
      if (name === 'yarn') return 'yarn';
      if (name === 'bun') return 'bun';
      if (name === 'npm') return 'npm';
    }
  }

  // 2. Check lockfiles
  for (const sig of LOCKFILE_SIGNATURES) {
    if (await pathExists(joinPath(projectRoot, sig.file))) {
      return sig.manager;
    }
  }

  // 3. If package.json exists, assume npm
  if (await pathExists(joinPath(projectRoot, 'package.json'))) {
    return 'npm';
  }

  return 'unknown';
}

/**
 * Get the lockfile name for a given package manager.
 */
export function lockfileForManager(pm: PackageManager): string | null {
  switch (pm) {
    case 'npm':
      return 'package-lock.json';
    case 'pnpm':
      return 'pnpm-lock.yaml';
    case 'yarn':
      return 'yarn.lock';
    case 'bun':
      return 'bun.lockb';
    default:
      return null;
  }
}

/**
 * Get the install command for a package manager.
 */
export function installCommand(pm: PackageManager): string {
  switch (pm) {
    case 'npm':
      return 'npm install';
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
  }
}
