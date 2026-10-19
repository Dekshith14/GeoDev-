/**
 * Runtime detector — detects Node.js version constraints, Python, Java, etc.
 */

import { pathExists, readJsonFile } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';

export interface RuntimeInfo {
  name: string;
  requiredVersion: string | null;
  detectionSource: string;
}

/**
 * Detect the required Node.js version from package.json "engines" field.
 */
export async function detectNodeVersionConstraint(projectRoot: string): Promise<string | null> {
  const pkgPath = joinPath(projectRoot, 'package.json');
  const pkg = await readJsonFile<Record<string, unknown>>(pkgPath);
  if (pkg === null) return null;

  const engines = pkg['engines'];
  if (typeof engines === 'object' && engines !== null) {
    const engineMap = engines as Record<string, unknown>;
    const node = engineMap['node'];
    if (typeof node === 'string') return node;
  }

  return null;
}

/**
 * Detect the .nvmrc / .node-version file and return its content.
 */
export async function detectNvmrc(projectRoot: string): Promise<string | null> {
  for (const file of ['.nvmrc', '.node-version']) {
    const filePath = joinPath(projectRoot, file);
    if (await pathExists(filePath)) {
      try {
        const { readTextFile } = await import('../services/filesystem.js');
        const content = await readTextFile(filePath);
        return content.trim();
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Detect Python version requirement from pyproject.toml or runtime.txt.
 */
export async function detectPythonVersionConstraint(projectRoot: string): Promise<string | null> {
  // Check runtime.txt (Heroku/Render style)
  const runtimePath = joinPath(projectRoot, 'runtime.txt');
  if (await pathExists(runtimePath)) {
    try {
      const { readTextFile } = await import('../services/filesystem.js');
      const content = await readTextFile(runtimePath);
      const match = content.match(/python-(\S+)/i);
      if (match?.[1]) return match[1];
    } catch {
      // ignore
    }
  }

  // Check .python-version (pyenv)
  const pyenvPath = joinPath(projectRoot, '.python-version');
  if (await pathExists(pyenvPath)) {
    try {
      const { readTextFile } = await import('../services/filesystem.js');
      const content = await readTextFile(pyenvPath);
      return content.trim();
    } catch {
      // ignore
    }
  }

  return null;
}
