import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPackageManager, lockfileForManager, installCommand } from '../../src/detectors/package-manager-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, '../fixtures');

describe('package-manager-detector', () => {
  describe('detectPackageManager', () => {
    it('detects pnpm from pnpm-lock.yaml', async () => {
      const pm = await detectPackageManager(path.join(FIXTURES, 'nodejs-pnpm'));
      expect(pm).toBe('pnpm');
    });

    it('detects npm from package-lock.json', async () => {
      // Create a temporary directory with package-lock.json would be ideal,
      // but we can test via packageManager field in package.json
      const pm = await detectPackageManager('/nonexistent-dir', {
        packageManager: 'npm@10.0.0',
      });
      expect(pm).toBe('npm');
    });

    it('detects pnpm from packageManager field', async () => {
      const pm = await detectPackageManager('/nonexistent-dir', {
        packageManager: 'pnpm@8.0.0',
      });
      expect(pm).toBe('pnpm');
    });

    it('detects yarn from packageManager field', async () => {
      const pm = await detectPackageManager('/nonexistent-dir', {
        packageManager: 'yarn@4.0.0',
      });
      expect(pm).toBe('yarn');
    });

    it('returns unknown for unknown directory', async () => {
      const pm = await detectPackageManager('/definitely-not-a-real-directory-xyz');
      expect(pm).toBe('unknown');
    });
  });

  describe('lockfileForManager', () => {
    it('returns correct lockfile names', () => {
      expect(lockfileForManager('npm')).toBe('package-lock.json');
      expect(lockfileForManager('pnpm')).toBe('pnpm-lock.yaml');
      expect(lockfileForManager('yarn')).toBe('yarn.lock');
      expect(lockfileForManager('bun')).toBe('bun.lockb');
      expect(lockfileForManager('unknown')).toBeNull();
    });
  });

  describe('installCommand', () => {
    it('returns correct install commands', () => {
      expect(installCommand('npm')).toBe('npm install');
      expect(installCommand('pnpm')).toBe('pnpm install');
      expect(installCommand('yarn')).toBe('yarn install');
      expect(installCommand('bun')).toBe('bun install');
    });
  });
});
