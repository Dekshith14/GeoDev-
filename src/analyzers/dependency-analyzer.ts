/**
 * Dependency analyzer — reads package.json and lockfiles for Node.js projects.
 * Designed to be extended to pnpm/yarn/bun via package manager abstraction.
 */

import * as path from 'node:path';
import { readJsonFile, pathExists } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';
import { detectPackageManager, lockfileForManager } from '../detectors/package-manager-detector.js';
import type { DependencyReport, DependencyEntry, PackageManager } from '../types/index.js';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  packageManager?: string;
}

/**
 * Read resolved versions from package-lock.json (npm v2/v3 format).
 */
async function readNpmLockfileVersions(
  projectRoot: string
): Promise<Map<string, string>> {
  const lockPath = joinPath(projectRoot, 'package-lock.json');
  const lock = await readJsonFile<Record<string, unknown>>(lockPath);
  const versions = new Map<string, string>();

  if (lock === null) return versions;

  // npm lock v2/v3: "packages" field
  const packages = lock['packages'];
  if (typeof packages === 'object' && packages !== null) {
    for (const [key, val] of Object.entries(packages)) {
      if (typeof val === 'object' && val !== null) {
        const pkg = val as Record<string, unknown>;
        const pkgName = key.startsWith('node_modules/')
          ? key.replace(/^node_modules\//, '')
          : key;
        if (typeof pkg['version'] === 'string') {
          versions.set(pkgName, pkg['version']);
        }
      }
    }
  }

  return versions;
}

/**
 * Convert a record of dep names → version specifiers into DependencyEntry[].
 */
function toDependencyEntries(
  deps: Record<string, string>,
  resolvedVersions: Map<string, string>
): DependencyEntry[] {
  return Object.entries(deps).map(([name, specifiedVersion]) => ({
    name,
    specifiedVersion,
    resolvedVersion: resolvedVersions.get(name) ?? null,
  }));
}

/**
 * Analyze dependencies for a Node.js project.
 */
export async function analyzeDependencies(projectRoot: string): Promise<DependencyReport> {
  const pkgPath = joinPath(projectRoot, 'package.json');
  const pkg = await readJsonFile<PackageJson>(pkgPath);

  const packageManager: PackageManager = await detectPackageManager(
    projectRoot,
    pkg as Record<string, unknown> | undefined ?? undefined
  );

  const deps: Record<string, string> = pkg?.dependencies ?? {};
  const devDeps: Record<string, string> = pkg?.devDependencies ?? {};
  const peerDeps: Record<string, string> = pkg?.peerDependencies ?? {};

  // Resolve versions from lockfile where available
  let resolvedVersions = new Map<string, string>();
  if (packageManager === 'npm') {
    resolvedVersions = await readNpmLockfileVersions(projectRoot);
  }
  // pnpm/yarn resolvers can be added here in a future iteration

  const lockfileName = lockfileForManager(packageManager);
  const hasLockfile =
    lockfileName !== null && (await pathExists(joinPath(projectRoot, lockfileName)));

  return {
    packageManager,
    dependencyCount: Object.keys(deps).length,
    devDependencyCount: Object.keys(devDeps).length,
    peerDependencyCount: Object.keys(peerDeps).length,
    hasLockfile,
    lockfileType: hasLockfile ? lockfileName : null,
    dependencies: toDependencyEntries(deps, resolvedVersions),
    devDependencies: toDependencyEntries(devDeps, resolvedVersions),
  };
}
