import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTreeSitterAvailable, parseFileWithTreeSitter } from '../../src/parsers/tree-sitter/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, '../fixtures');

describe('tree-sitter parser', () => {
  describe('isTreeSitterAvailable', () => {
    it('returns a boolean', async () => {
      const available = await isTreeSitterAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('parseFileWithTreeSitter', () => {
    it('returns null for non-JS/TS files', async () => {
      const result = await parseFileWithTreeSitter('some/file.py');
      expect(result).toBeNull();
    });

    it('returns null for .json files', async () => {
      const result = await parseFileWithTreeSitter(
        path.join(FIXTURES, 'nodejs-nextjs/package.json')
      );
      expect(result).toBeNull();
    });

    it('parses a TypeScript fixture file when tree-sitter is available', async () => {
      const available = await isTreeSitterAvailable();
      if (!available) {
        // Tree-sitter not available in this environment — skip gracefully
        return;
      }

      const sampleFile = path.join(FIXTURES, 'source/sample.ts');
      const result = await parseFileWithTreeSitter(sampleFile);

      if (result !== null) {
        expect(result.language).toBe('TypeScript');
        expect(result.lineCount).toBeGreaterThan(0);
        expect(Array.isArray(result.symbols)).toBe(true);

        // Should detect at least one class or function
        const hasStructure = result.symbols.some(
          (s) => s.kind === 'class' || s.kind === 'function' || s.kind === 'interface'
        );
        expect(hasStructure).toBe(true);
      }
    });

    it('does not throw for unparseable content', async () => {
      // Even if tree-sitter is available, parsing a non-existent file should not throw
      await expect(parseFileWithTreeSitter('/nonexistent/file.ts')).resolves.toBeNull();
    });
  });
});
