import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeDependencies } from '../../src/analyzers/dependency-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, '../fixtures');

describe('dependency-analyzer', () => {
  describe('analyzeDependencies', () => {
    it('correctly parses a Next.js package.json', async () => {
      const report = await analyzeDependencies(path.join(FIXTURES, 'nodejs-nextjs'));
      expect(report.dependencyCount).toBe(3); // next, react, react-dom
      expect(report.devDependencyCount).toBe(3); // typescript, @types/react, @types/node
      expect(report.packageManager).toBeDefined();
    });

    it('identifies dependency names correctly', async () => {
      const report = await analyzeDependencies(path.join(FIXTURES, 'nodejs-nextjs'));
      const depNames = report.dependencies.map((d) => d.name);
      expect(depNames).toContain('next');
      expect(depNames).toContain('react');
      expect(depNames).toContain('react-dom');
    });

    it('identifies dev dependency names', async () => {
      const report = await analyzeDependencies(path.join(FIXTURES, 'nodejs-nextjs'));
      const devDepNames = report.devDependencies.map((d) => d.name);
      expect(devDepNames).toContain('typescript');
    });

    it('detects pnpm from lockfile', async () => {
      const report = await analyzeDependencies(path.join(FIXTURES, 'nodejs-pnpm'));
      expect(report.packageManager).toBe('pnpm');
      expect(report.hasLockfile).toBe(true);
      expect(report.lockfileType).toBe('pnpm-lock.yaml');
    });

    it('includes version specifiers', async () => {
      const report = await analyzeDependencies(path.join(FIXTURES, 'nodejs-nextjs'));
      const next = report.dependencies.find((d) => d.name === 'next');
      expect(next?.specifiedVersion).toBe('^14.0.0');
    });
  });
});
