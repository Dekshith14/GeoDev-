/**
 * Framework detector — identifies frameworks from project files and dependencies.
 */

import { pathExists } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';

interface FrameworkSignature {
  name: string;
  /** Dependency names that indicate this framework */
  deps?: string[];
  /** Files that indicate this framework */
  files?: string[];
  /** Scripts in package.json that indicate this framework */
  scripts?: string[];
}

const FRAMEWORK_SIGNATURES: FrameworkSignature[] = [
  // JavaScript/TypeScript frameworks
  { name: 'Next.js', deps: ['next'], files: ['next.config.js', 'next.config.ts', 'next.config.mjs'] },
  { name: 'Nuxt.js', deps: ['nuxt'], files: ['nuxt.config.js', 'nuxt.config.ts'] },
  { name: 'SvelteKit', deps: ['@sveltejs/kit'], files: ['svelte.config.js'] },
  { name: 'Svelte', deps: ['svelte'] },
  { name: 'Astro', deps: ['astro'], files: ['astro.config.mjs', 'astro.config.ts'] },
  { name: 'Remix', deps: ['@remix-run/node', '@remix-run/react'] },
  { name: 'Vite', deps: ['vite'], files: ['vite.config.ts', 'vite.config.js'] },
  { name: 'React', deps: ['react', 'react-dom'] },
  { name: 'Vue.js', deps: ['vue'] },
  { name: 'Angular', deps: ['@angular/core'], files: ['angular.json'] },
  { name: 'Express.js', deps: ['express'] },
  { name: 'Fastify', deps: ['fastify'] },
  { name: 'Hono', deps: ['hono'] },
  { name: 'NestJS', deps: ['@nestjs/core'] },
  { name: 'Electron', deps: ['electron'] },
  // Python
  { name: 'Django', files: ['manage.py', 'django_settings.py'] },
  { name: 'Flask', files: ['app.py'] },
  { name: 'FastAPI', files: ['main.py'] },
  // Java / Kotlin
  { name: 'Spring Boot', files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  // Go
  { name: 'Gin', files: ['go.mod'] },
  // Rust
  { name: 'Actix', files: ['Cargo.toml'] },
];

/**
 * Detect the framework used in a project.
 *
 * @param projectRoot - Absolute path to the project directory
 * @param allDeps - All dependency names (deps + devDeps combined)
 */
export async function detectFramework(
  projectRoot: string,
  allDeps: string[]
): Promise<string | null> {
  const depSet = new Set(allDeps);

  for (const sig of FRAMEWORK_SIGNATURES) {
    // Check dependency match
    if (sig.deps !== undefined) {
      const hasMatch = sig.deps.some((d) => depSet.has(d));
      if (hasMatch) return sig.name;
    }

    // Check file match
    if (sig.files !== undefined) {
      for (const file of sig.files) {
        if (await pathExists(joinPath(projectRoot, file))) {
          return sig.name;
        }
      }
    }
  }

  return null;
}
