/**
 * `geodev doctor` — environment health check.
 */

import type { Command } from 'commander';
import { detectEnvironmentTools } from '../detectors/environment-detector.js';
import { detectDockerEnvironment } from '../detectors/docker-detector.js';
import { detectEnvFiles } from '../services/environment.js';
import { isGitRepo } from '../services/git.js';
import { withSpinner } from '../output/progress.js';
import {
  printBanner,
  printOk,
  printWarn,
  printError,
  printSkip,
  printSeparator,
  printHealthScore,
  printCliError,
  printBlank,
} from '../output/terminal.js';
import { formatError, getExitCode } from '../utils/errors.js';
import type { DoctorCheck, DoctorReport } from '../types/index.js';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check your development environment health')
    .action(async () => {
      await runDoctor();
    });
}

async function runDoctor(): Promise<void> {
  printBanner('doctor');
  const projectRoot = process.cwd();
  const checks: DoctorCheck[] = [];

  try {
    // ── Tool checks ──────────────────────────────────────────────────────────
    const tools = await withSpinner('Checking installed tools...', async (spinner) => {
      const result = await detectEnvironmentTools();
      spinner.succeed('Tools checked');
      return result;
    });

    for (const tool of tools) {
      if (!['Node.js', 'npm', 'Git', 'Docker', 'Python', 'Java'].includes(tool.name)) continue;

      if (tool.installed) {
        printOk(tool.name, tool.version ?? 'installed');
        checks.push({ label: tool.name, status: 'ok', detail: tool.version ?? '', points: getToolPoints(tool.name) });
      } else {
        const isRequired = tool.name === 'Node.js' || tool.name === 'npm' || tool.name === 'Git';
        if (isRequired) {
          printError(tool.name, 'not found');
          checks.push({ label: tool.name, status: 'error', detail: 'not found', points: 0 });
        } else {
          printSkip(tool.name, 'not installed');
          checks.push({ label: tool.name, status: 'skip', detail: 'not installed', points: getToolPoints(tool.name) });
        }
      }
    }

    // ── Docker daemon ────────────────────────────────────────────────────────
    const dockerEnv = await detectDockerEnvironment();
    if (dockerEnv.installed) {
      if (dockerEnv.daemonRunning) {
        printOk('Docker daemon', 'running');
        checks.push({ label: 'Docker daemon', status: 'ok', detail: 'running', points: 5 });
      } else {
        printWarn('Docker daemon', 'not running');
        checks.push({ label: 'Docker daemon', status: 'warn', detail: 'not running', points: 2 });
      }
    }

    // ── Git repository ───────────────────────────────────────────────────────
    const inGitRepo = await isGitRepo(projectRoot);
    if (inGitRepo) {
      printOk('Git repository', 'detected');
      checks.push({ label: 'Git repository', status: 'ok', detail: 'detected', points: 5 });
    } else {
      printWarn('Git repository', 'not a git repo');
      checks.push({ label: 'Git repository', status: 'warn', detail: 'not initialized', points: 0 });
    }

    // ── Environment files ────────────────────────────────────────────────────
    const envFiles = await detectEnvFiles(projectRoot);
    if (envFiles.length > 0) {
      printOk('Env files', envFiles.join(', '));
      checks.push({ label: 'Env files', status: 'ok', detail: envFiles.join(', '), points: 5 });
    } else {
      printSkip('Env files', 'none found');
      checks.push({ label: 'Env files', status: 'skip', detail: 'none found', points: 5 });
    }

    // ── Health score ──────────────────────────────────────────────────────────
    const report = computeReport(checks);
    printHealthScore(report.healthScore);

    // Exit code: 1 if any critical tool is missing
    const hasErrors = checks.some((c) => c.status === 'error');
    process.exit(hasErrors ? 1 : 0);

  } catch (err) {
    printCliError('Doctor check failed.', formatError(err));
    process.exit(getExitCode(err));
  }
}

function getToolPoints(name: string): number {
  switch (name) {
    case 'Node.js': return 25;
    case 'npm': return 15;
    case 'Git': return 15;
    case 'Docker': return 10;
    case 'Python': return 8;
    case 'Java': return 7;
    default: return 5;
  }
}

function computeReport(checks: DoctorCheck[]): DoctorReport {
  const maxPoints = checks.reduce((acc, c) => acc + getMaxPoints(c.label), 0) || 1;
  const earnedPoints = checks.reduce((acc, c) => acc + (c.status !== 'error' ? c.points : 0), 0);
  const healthScore = Math.min(100, Math.round((earnedPoints / maxPoints) * 100));

  return {
    checks,
    healthScore,
    timestamp: new Date(),
  };
}

function getMaxPoints(label: string): number {
  return getToolPoints(label) || 5;
}
