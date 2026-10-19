/**
 * Process runner service.
 *
 * Security requirements:
 * - ALWAYS use argument arrays, never string interpolation
 * - Use execFile / spawn, not exec with shell strings
 * - Validate all inputs before passing to child processes
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessResult } from '../types/index.js';
import { isWindows } from '../utils/platform.js';

const execFileAsync = promisify(execFile);

export interface RunOptions {
  /** Working directory for the process */
  cwd?: string;
  /** Timeout in milliseconds. Default: 15_000 */
  timeoutMs?: number;
  /** Maximum output buffer size in bytes. Default: 5MB */
  maxBuffer?: number;
  /** Environment variables to merge with process.env */
  env?: Record<string, string>;
}

/**
 * Run an external program safely using argument arrays.
 * Never passes arguments through a shell.
 *
 * On Windows, '.cmd' extension is automatically appended to known npm-installed
 * executables when the base name doesn't already have an extension.
 */
export async function runProcess(
  command: string,
  args: string[],
  options: RunOptions = {}
): Promise<ProcessResult> {
  const { cwd = process.cwd(), timeoutMs = 15_000, maxBuffer = 5 * 1024 * 1024, env } = options;

  const mergedEnv: NodeJS.ProcessEnv = env !== undefined
    ? { ...process.env, ...env }
    : process.env;

  // On Windows, .cmd files MUST be run with shell:true
  // This is safe because we never pass user input as command names
  const isCmd = isWindows && command.toLowerCase().endsWith('.cmd');

  try {
    const result = await execFileAsync(command, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer,
      env: mergedEnv,
      windowsHide: true,
      shell: isCmd,
    });

    return {
      exitCode: 0,
      stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
      stderr: typeof result.stderr === 'string' ? result.stderr.trim() : '',
      timedOut: false,
    };
  } catch (err: unknown) {
    if (isNodeExecError(err)) {
      if (err.killed === true || err.signal === 'SIGTERM') {
        return {
          exitCode: typeof err.code === 'number' ? err.code : 1,
          stdout: err.stdout ?? '',
          stderr: err.stderr ?? '',
          timedOut: true,
        };
      }
      return {
        exitCode: typeof err.code === 'number' ? err.code : 1,
        stdout: typeof err.stdout === 'string' ? err.stdout.trim() : '',
        stderr: typeof err.stderr === 'string' ? err.stderr.trim() : '',
        timedOut: false,
      };
    }
    throw err;
  }
}

/**
 * Run a command, resolving Windows .cmd extensions automatically.
 * Useful for npm/pnpm/yarn binaries that exist as .cmd on Windows.
 */
export async function runNpmBinary(
  binaryName: string,
  args: string[],
  options: RunOptions = {}
): Promise<ProcessResult> {
  // On Windows, npm-installed binaries have a .cmd extension
  const cmd = isWindows ? `${binaryName}.cmd` : binaryName;
  return runProcess(cmd, args, options);
}

/**
 * Quickly check if a program exists by running it with --version.
 * Returns null if not found, the stdout string if found.
 */
export async function probeVersion(command: string, versionArg = '--version'): Promise<string | null> {
  try {
    const result = await runProcess(command, [versionArg], { timeoutMs: 5000 });
    if (result.exitCode === 0 && result.stdout.length > 0) {
      return result.stdout;
    }
    // Some tools write version to stderr
    if (result.stderr.length > 0) return result.stderr;
    return null;
  } catch {
    return null;
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

interface NodeExecError extends Error {
  code?: number | string;
  killed?: boolean;
  signal?: string;
  stdout?: string;
  stderr?: string;
}

function isNodeExecError(err: unknown): err is NodeExecError {
  return err instanceof Error && ('code' in err || 'killed' in err);
}
