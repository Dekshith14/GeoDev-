/**
 * Docker detector — checks for Docker configuration in a project.
 */

import { pathExists } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';
import { probeVersion } from '../services/process-runner.js';

export interface DockerProjectInfo {
  hasDockerfile: boolean;
  hasComposeFile: boolean;
  composeFileName: string | null;
  dockerfileCount: number;
}

export interface DockerEnvironmentInfo {
  installed: boolean;
  version: string | null;
  daemonRunning: boolean;
}

const COMPOSE_FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
  'docker-compose.override.yml',
];

const DOCKERFILE_NAMES = [
  'Dockerfile',
  'dockerfile',
  'Dockerfile.dev',
  'Dockerfile.prod',
  'Dockerfile.test',
];

/**
 * Detect Docker configuration files in a project.
 */
export async function detectDockerProject(projectRoot: string): Promise<DockerProjectInfo> {
  let hasDockerfile = false;
  let dockerfileCount = 0;

  for (const name of DOCKERFILE_NAMES) {
    if (await pathExists(joinPath(projectRoot, name))) {
      hasDockerfile = true;
      dockerfileCount++;
    }
  }

  let hasComposeFile = false;
  let composeFileName: string | null = null;

  for (const name of COMPOSE_FILES) {
    if (await pathExists(joinPath(projectRoot, name))) {
      hasComposeFile = true;
      composeFileName = name;
      break;
    }
  }

  return { hasDockerfile, hasComposeFile, composeFileName, dockerfileCount };
}

/**
 * Detect Docker installation and daemon status.
 */
export async function detectDockerEnvironment(): Promise<DockerEnvironmentInfo> {
  const versionOutput = await probeVersion('docker', '--version');
  const installed = versionOutput !== null;

  if (!installed) {
    return { installed: false, version: null, daemonRunning: false };
  }

  const version = extractDockerVersion(versionOutput ?? '');

  // Check if daemon is running by trying `docker info`
  let daemonRunning = false;
  try {
    const { runProcess } = await import('../services/process-runner.js');
    const result = await runProcess('docker', ['info', '--format', '{{.ServerVersion}}'], {
      timeoutMs: 5000,
    });
    daemonRunning = result.exitCode === 0;
  } catch {
    daemonRunning = false;
  }

  return { installed, version, daemonRunning };
}

function extractDockerVersion(raw: string): string | null {
  const match = raw.match(/Docker version\s+([\d.]+)/i);
  return match?.[1] ?? raw.split('\n')[0]?.trim() ?? null;
}
