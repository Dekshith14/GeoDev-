import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import fs from 'node:fs/promises';
import {
  pathExists,
  isFile,
  isDirectory,
  readTextFile,
  writeTextFile,
  readJsonFile,
  writeJsonFile,
  countLines,
  walkDirectory,
} from '../../src/services/filesystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('filesystem service', () => {
  const fixtures = path.join(__dirname, '../fixtures');

  describe('pathExists', () => {
    it('returns true for existing files', async () => {
      const result = await pathExists(path.join(fixtures, 'nodejs-nextjs/package.json'));
      expect(result).toBe(true);
    });

    it('returns false for non-existent paths', async () => {
      const result = await pathExists('/this/path/does/not/exist/xyz');
      expect(result).toBe(false);
    });
  });

  describe('isFile', () => {
    it('returns true for files', async () => {
      expect(await isFile(path.join(fixtures, 'nodejs-nextjs/package.json'))).toBe(true);
    });

    it('returns false for directories', async () => {
      expect(await isFile(fixtures)).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('returns true for directories', async () => {
      expect(await isDirectory(fixtures)).toBe(true);
    });

    it('returns false for files', async () => {
      expect(await isDirectory(path.join(fixtures, 'nodejs-nextjs/package.json'))).toBe(false);
    });
  });

  describe('readTextFile', () => {
    it('reads existing files', async () => {
      const content = await readTextFile(path.join(fixtures, 'nodejs-nextjs/package.json'));
      expect(content).toContain('"name"');
    });

    it('throws for non-existent files', async () => {
      await expect(readTextFile('/nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('readJsonFile', () => {
    it('parses JSON files', async () => {
      const json = await readJsonFile<{ name: string }>(path.join(fixtures, 'nodejs-nextjs/package.json'));
      expect(json).not.toBeNull();
      expect(json?.name).toBe('my-app');
    });

    it('returns null for non-existent files', async () => {
      const result = await readJsonFile('/nonexistent/file.json');
      expect(result).toBeNull();
    });
  });

  describe('writeTextFile and readTextFile', () => {
    it('writes and reads files', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'geodev-test-'));
      const tmpFile = path.join(tmpDir, 'test.txt');
      try {
        await writeTextFile(tmpFile, 'hello world');
        const content = await readTextFile(tmpFile);
        expect(content).toBe('hello world');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('countLines', () => {
    it('counts lines in a file', async () => {
      const lines = await countLines(path.join(fixtures, 'nodejs-nextjs/package.json'));
      expect(lines).toBeGreaterThan(0);
    });

    it('returns 0 for non-existent files', async () => {
      const lines = await countLines('/nonexistent/file.txt');
      expect(lines).toBe(0);
    });
  });

  describe('walkDirectory', () => {
    it('returns files in a directory', async () => {
      const files = await walkDirectory(path.join(fixtures, 'nodejs-nextjs'));
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.endsWith('package.json'))).toBe(true);
    });

    it('respects ignoreNames', async () => {
      const files = await walkDirectory(fixtures, {
        ignoreNames: ['nodejs-nextjs'],
      });
      expect(files.every((f) => !f.includes('nodejs-nextjs'))).toBe(true);
    });
  });
});
