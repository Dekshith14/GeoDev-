import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFramework } from '../../src/detectors/framework-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, '../fixtures');

describe('framework-detector', () => {
  describe('detectFramework', () => {
    it('detects Next.js from dependencies', async () => {
      const framework = await detectFramework(
        FIXTURES,
        ['next', 'react', 'react-dom']
      );
      expect(framework).toBe('Next.js');
    });

    it('detects Express.js from dependencies', async () => {
      const framework = await detectFramework(
        FIXTURES,
        ['express', 'body-parser']
      );
      expect(framework).toBe('Express.js');
    });

    it('detects NestJS from dependencies', async () => {
      const framework = await detectFramework(
        FIXTURES,
        ['@nestjs/core', '@nestjs/common']
      );
      expect(framework).toBe('NestJS');
    });

    it('detects Vue.js from dependencies', async () => {
      const framework = await detectFramework(FIXTURES, ['vue']);
      expect(framework).toBe('Vue.js');
    });

    it('returns null when no framework detected', async () => {
      const framework = await detectFramework(FIXTURES, ['lodash', 'uuid']);
      expect(framework).toBeNull();
    });

    it('returns null for empty dependency list', async () => {
      const framework = await detectFramework(FIXTURES, []);
      expect(framework).toBeNull();
    });
  });
});
