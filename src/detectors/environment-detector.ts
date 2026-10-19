/**
 * Environment detector — checks common development tools.
 */

import { probeVersion } from '../services/process-runner.js';
import { isWindows } from '../utils/platform.js';
import type { ToolInfo } from '../types/index.js';

/**
 * Probe a tool and return its ToolInfo.
 */
async function probeTool(
  name: string,
  command: string,
  versionArg: string = '--version',
  parseVersion?: (output: string) => string
): Promise<ToolInfo> {
  const raw = await probeVersion(command, versionArg);
  if (raw === null) {
    return { name, installed: false, version: null, path: null };
  }

  const version = parseVersion !== undefined ? parseVersion(raw) : extractSemver(raw);
  return { name, installed: true, version, path: command };
}

/** Extract first semver-ish pattern from a version string */
function extractSemver(raw: string): string {
  const match = raw.match(/v?(\d+\.\d+[\.\d]*)/);
  return match?.[0] ?? raw.split('\n')[0]?.trim() ?? raw.trim();
}

/**
 * Detect all common development environment tools.
 */
export async function detectEnvironmentTools(): Promise<ToolInfo[]> {
  const tools = await Promise.all([
    probeTool('Node.js', 'node', '--version'),
    probeTool('npm', isWindows ? 'npm.cmd' : 'npm', '--version'),
    probeTool('Git', 'git', '--version', (r) => {
      const match = r.match(/git version ([\d.]+)/i);
      return match?.[1] ?? r.trim();
    }),
    probeTool('Docker', 'docker', '--version', (r) => {
      const match = r.match(/Docker version ([\d.]+)/i);
      return match?.[1] ?? r.trim();
    }),
    probeTool('Python', 'python', '--version', (r) => {
      const match = r.match(/Python ([\d.]+)/i);
      return match?.[1] ?? r.trim();
    }),
    // Also try python3 as a fallback
    probeTool('Python3', 'python3', '--version', (r) => {
      const match = r.match(/Python ([\d.]+)/i);
      return match?.[1] ?? r.trim();
    }),
    probeTool('Java', 'java', '-version', (r) => {
      const match = r.match(/version "([^"]+)"/i);
      return match?.[1] ?? r.split('\n')[0]?.trim() ?? r.trim();
    }),
    probeTool('pnpm', isWindows ? 'pnpm.cmd' : 'pnpm', '--version'),
    probeTool('yarn', isWindows ? 'yarn.cmd' : 'yarn', '--version'),
    probeTool('bun', 'bun', '--version'),
  ]);

  // Merge Python / Python3: prefer whichever is installed
  const nodePython = tools.find((t) => t.name === 'Python' && t.installed);
  const python3 = tools.find((t) => t.name === 'Python3' && t.installed);

  const merged = tools.filter((t) => t.name !== 'Python' && t.name !== 'Python3');

  if (nodePython !== undefined) {
    merged.splice(4, 0, { ...nodePython, name: 'Python' });
  } else if (python3 !== undefined) {
    merged.splice(4, 0, { ...python3, name: 'Python' });
  } else {
    merged.splice(4, 0, { name: 'Python', installed: false, version: null, path: null });
  }

  return merged;
}
