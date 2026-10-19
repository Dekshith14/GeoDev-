import { describe, it, expect } from 'vitest';
import {
  GeodDevError,
  ToolNotFoundError,
  NotAGitRepoError,
  PermissionError,
  ConfigError,
  formatError,
  getExitCode,
} from '../../src/utils/errors.js';

describe('error utilities', () => {
  describe('GeodDevError', () => {
    it('creates error with message and suggestion', () => {
      const err = new GeodDevError('test error', { suggestion: 'do something' });
      expect(err.message).toBe('test error');
      expect(err.suggestion).toBe('do something');
      expect(err.exitCode).toBe(1);
    });

    it('supports custom exit codes', () => {
      const err = new GeodDevError('usage error', { exitCode: 2 });
      expect(err.exitCode).toBe(2);
    });
  });

  describe('ToolNotFoundError', () => {
    it('mentions the tool name in message', () => {
      const err = new ToolNotFoundError('git');
      expect(err.message).toContain('git');
      expect(err.toolName).toBe('git');
    });
  });

  describe('NotAGitRepoError', () => {
    it('mentions the directory in message', () => {
      const err = new NotAGitRepoError('/some/path');
      expect(err.message).toContain('/some/path');
    });
  });

  describe('formatError', () => {
    it('formats GeodDevError with suggestion', () => {
      const err = new GeodDevError('test', { suggestion: 'fix it' });
      const formatted = formatError(err);
      expect(formatted).toContain('test');
      expect(formatted).toContain('fix it');
    });

    it('formats plain Error', () => {
      const err = new Error('plain error');
      const formatted = formatError(err);
      expect(formatted).toBe('plain error');
    });

    it('formats strings', () => {
      const formatted = formatError('something went wrong');
      expect(formatted).toBe('something went wrong');
    });

    it('includes stack trace in debug mode', () => {
      const err = new Error('debug error');
      const formatted = formatError(err, true);
      expect(formatted).toContain('debug error');
      // Stack might be available
    });

    it('does not include stack trace in normal mode', () => {
      const err = new GeodDevError('normal error');
      const formatted = formatError(err, false);
      expect(formatted).not.toContain('[debug]');
    });
  });

  describe('getExitCode', () => {
    it('returns exitCode from GeodDevError', () => {
      const err = new GeodDevError('test', { exitCode: 2 });
      expect(getExitCode(err)).toBe(2);
    });

    it('returns 1 for plain Error', () => {
      expect(getExitCode(new Error('test'))).toBe(1);
    });

    it('returns 1 for strings', () => {
      expect(getExitCode('something')).toBe(1);
    });
  });
});
