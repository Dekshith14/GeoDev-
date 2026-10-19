import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  isCI,
  isTTY,
  executableExtension,
  normalizeSeparator,
} from '../../src/utils/platform.js';

describe('platform utils', () => {
  describe('detectPlatform', () => {
    it('returns a valid platform value', () => {
      const platform = detectPlatform();
      expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);
    });
  });

  describe('isCI', () => {
    it('returns a boolean', () => {
      expect(typeof isCI()).toBe('boolean');
    });

    it('returns true when CI env var is set', () => {
      const original = process.env['CI'];
      process.env['CI'] = 'true';
      expect(isCI()).toBe(true);
      if (original === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = original;
      }
    });
  });

  describe('isTTY', () => {
    it('returns a boolean', () => {
      expect(typeof isTTY()).toBe('boolean');
    });
  });

  describe('executableExtension', () => {
    it('returns .cmd on Windows, empty string otherwise', () => {
      const ext = executableExtension();
      if (process.platform === 'win32') {
        expect(ext).toBe('.cmd');
      } else {
        expect(ext).toBe('');
      }
    });
  });

  describe('normalizeSeparator', () => {
    it('converts backslashes to forward slashes on Windows', () => {
      const result = normalizeSeparator('foo\\bar\\baz');
      if (process.platform === 'win32') {
        expect(result).toBe('foo/bar/baz');
      } else {
        expect(result).toBe('foo\\bar\\baz');
      }
    });

    it('leaves forward slashes unchanged', () => {
      expect(normalizeSeparator('foo/bar/baz')).toBe('foo/bar/baz');
    });
  });
});
