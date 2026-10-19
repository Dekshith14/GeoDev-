/**
 * Error types and error-handling utilities for GeoDev.
 *
 * Philosophy: never show raw stack traces to users.
 * Always provide actionable messages.
 */

/**
 * Base error class for GeoDev. Carries an optional suggestion
 * that the CLI output layer can display below the error message.
 */
export class GeodDevError extends Error {
  public readonly suggestion: string | undefined;
  public readonly exitCode: number;

  constructor(message: string, options?: { suggestion?: string; exitCode?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'GeodDevError';
    this.suggestion = options?.suggestion;
    this.exitCode = options?.exitCode ?? 1;
  }
}

/**
 * Thrown when a required external tool (e.g. git, node) is not found.
 */
export class ToolNotFoundError extends GeodDevError {
  public readonly toolName: string;

  constructor(toolName: string) {
    super(`${toolName} is not installed or could not be found in PATH.`, {
      suggestion: `Install ${toolName} and ensure it is available in your PATH, then run:\n  geodev doctor`,
      exitCode: 1,
    });
    this.name = 'ToolNotFoundError';
    this.toolName = toolName;
  }
}

/**
 * Thrown when the current directory is not a Git repository.
 */
export class NotAGitRepoError extends GeodDevError {
  constructor(dir: string) {
    super(`The directory is not a Git repository: ${dir}`, {
      suggestion: `Run \`git init\` to initialize a repository, or change to a directory that contains one.`,
      exitCode: 1,
    });
    this.name = 'NotAGitRepoError';
  }
}

/**
 * Thrown for filesystem permission errors.
 */
export class PermissionError extends GeodDevError {
  constructor(path: string, cause?: unknown) {
    super(`Permission denied: ${path}`, {
      suggestion: `Check file system permissions for: ${path}`,
      exitCode: 1,
      cause,
    });
    this.name = 'PermissionError';
  }
}

/**
 * Thrown when configuration is invalid or missing.
 */
export class ConfigError extends GeodDevError {
  constructor(message: string, suggestion?: string) {
    super(message, {
      suggestion: suggestion ?? 'Run `geodev init` to create a valid configuration.',
      exitCode: 1,
    });
    this.name = 'ConfigError';
  }
}

/**
 * Format any unknown error into a safe, user-friendly string.
 * Never exposes stack traces unless debug mode is active.
 */
export function formatError(err: unknown, debug: boolean = false): string {
  if (err instanceof GeodDevError) {
    let msg = err.message;
    if (err.suggestion) {
      msg += `\n\nSuggestion:\n  ${err.suggestion}`;
    }
    if (debug && err.stack) {
      msg += `\n\n[debug] Stack:\n${err.stack}`;
    }
    if (debug && err.cause !== undefined) {
      msg += `\n\n[debug] Cause:\n${String(err.cause)}`;
    }
    return msg;
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (debug && err.stack) {
      return `${msg}\n\n[debug] Stack:\n${err.stack}`;
    }
    return msg;
  }

  return String(err);
}

/**
 * Extract exit code from an error. Defaults to 1.
 */
export function getExitCode(err: unknown): number {
  if (err instanceof GeodDevError) return err.exitCode;
  return 1;
}
