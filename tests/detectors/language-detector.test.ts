import { describe, it, expect } from 'vitest';
import {
  detectFileLanguage,
  detectPrimaryLanguage,
  analyzeLanguageDistribution,
  isSourceFile,
} from '../../src/detectors/language-detector.js';

describe('language-detector', () => {
  describe('detectFileLanguage', () => {
    it('detects TypeScript files', () => {
      expect(detectFileLanguage('src/app.ts')).toBe('TypeScript');
      expect(detectFileLanguage('src/component.tsx')).toBe('TypeScript');
    });

    it('detects JavaScript files', () => {
      expect(detectFileLanguage('index.js')).toBe('JavaScript');
      expect(detectFileLanguage('app.mjs')).toBe('JavaScript');
      expect(detectFileLanguage('server.cjs')).toBe('JavaScript');
    });

    it('detects Python files', () => {
      expect(detectFileLanguage('main.py')).toBe('Python');
    });

    it('detects Java files', () => {
      expect(detectFileLanguage('Main.java')).toBe('Java');
    });

    it('detects Go files', () => {
      expect(detectFileLanguage('main.go')).toBe('Go');
    });

    it('detects Rust files', () => {
      expect(detectFileLanguage('lib.rs')).toBe('Rust');
    });

    it('returns null for unknown extensions', () => {
      expect(detectFileLanguage('file.xyz')).toBeNull();
      expect(detectFileLanguage('Makefile')).toBeNull();
    });

    it('is case-insensitive for extensions', () => {
      expect(detectFileLanguage('FILE.TS')).toBe('TypeScript');
      expect(detectFileLanguage('App.JS')).toBe('JavaScript');
    });
  });

  describe('detectPrimaryLanguage', () => {
    it('returns TypeScript when most weighted files are .ts', () => {
      const files = [
        'src/a.ts', 'src/b.ts', 'src/c.ts',
        'config.json', 'README.md'
      ];
      expect(detectPrimaryLanguage(files)).toBe('TypeScript');
    });

    it('returns null for empty file list', () => {
      expect(detectPrimaryLanguage([])).toBeNull();
    });

    it('prefers source files over config files', () => {
      const files = [
        'data.json', 'data.yaml', 'config.yml',
        'app.py', 'main.py'
      ];
      expect(detectPrimaryLanguage(files)).toBe('Python');
    });
  });

  describe('analyzeLanguageDistribution', () => {
    it('counts files per language', () => {
      const files = ['a.ts', 'b.ts', 'c.js', 'd.py'];
      const dist = analyzeLanguageDistribution(files);
      expect(dist.get('TypeScript')).toBe(2);
      expect(dist.get('JavaScript')).toBe(1);
      expect(dist.get('Python')).toBe(1);
    });
  });

  describe('isSourceFile', () => {
    it('returns true for source files', () => {
      expect(isSourceFile('app.ts')).toBe(true);
      expect(isSourceFile('main.py')).toBe(true);
      expect(isSourceFile('Main.java')).toBe(true);
    });

    it('returns false for config/data files', () => {
      expect(isSourceFile('config.json')).toBe(false);
      expect(isSourceFile('README.md')).toBe(false);
    });
  });
});
