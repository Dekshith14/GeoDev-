/**
 * Filesystem service — safe, cross-platform file operations.
 * Uses only Node.js fs APIs.
 */

import * as fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import * as path from 'node:path';
import { PermissionError } from '../utils/errors.js';

/**
 * Check if a path exists (file or directory).
 */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a file.
 */
export async function isFile(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory.
 */
export async function isDirectory(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read a file as a UTF-8 string.
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (isNodeError(err) && err.code === 'EACCES') {
      throw new PermissionError(filePath, err);
    }
    throw err;
  }
}

/**
 * Write text to a file, creating parent directories as needed.
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (err) {
    if (isNodeError(err) && err.code === 'EACCES') {
      throw new PermissionError(filePath, err);
    }
    throw err;
  }
}

/**
 * Read and parse a JSON file. Returns null if the file doesn't exist.
 * Throws for parse errors.
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  if (!await pathExists(filePath)) return null;
  const raw = await readTextFile(filePath);
  return JSON.parse(raw) as T;
}

/**
 * Write a value as formatted JSON to a file.
 */
export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (isNodeError(err) && err.code === 'EEXIST') return;
    throw err;
  }
}

/**
 * List files and directories in a directory (one level deep).
 * Returns an empty array if the directory doesn't exist.
 */
export async function listDir(dirPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Count lines in a text file efficiently.
 */
export async function countLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.length === 0) return 0;
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Get file size in bytes. Returns 0 if not accessible.
 */
export async function fileSize(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

/**
 * Walk a directory tree recursively, collecting file paths.
 * Respects an ignore list of directory/file names.
 */
export async function walkDirectory(
  rootDir: string,
  options: {
    ignoreNames?: string[];
    maxDepth?: number;
    currentDepth?: number;
  } = {}
): Promise<string[]> {
  const {
    ignoreNames = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', 'target', '.idea', '.vscode'],
    maxDepth = 10,
    currentDepth = 0,
  } = options;

  if (currentDepth > maxDepth) return [];

  const results: string[] = [];
  const entries = await listDir(rootDir);

  for (const entry of entries) {
    if (ignoreNames.includes(entry.name)) continue;

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isFile()) {
      results.push(fullPath);
    } else if (entry.isDirectory()) {
      const nested = await walkDirectory(fullPath, {
        ignoreNames,
        maxDepth,
        currentDepth: currentDepth + 1,
      });
      results.push(...nested);
    }
  }

  return results;
}

// ─── Type guard ───────────────────────────────────────────────────────────────

interface NodeError extends Error {
  code?: string;
}

function isNodeError(err: unknown): err is NodeError {
  return err instanceof Error && 'code' in err;
}
