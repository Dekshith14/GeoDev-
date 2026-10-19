/**
 * Project analyzer — combines detectors to produce a full ProjectInfo.
 */

import { readJsonFile, pathExists, listDir } from '../services/filesystem.js';
import { joinPath } from '../utils/paths.js';
import { detectPackageManager } from '../detectors/package-manager-detector.js';
import { detectFramework } from '../detectors/framework-detector.js';
import { detectPrimaryLanguage, analyzeLanguageDistribution } from '../detectors/language-detector.js';
import { isGitRepo } from '../services/git.js';
import { walkDirectory } from '../services/filesystem.js';
import type { ProjectInfo, ProjectType, PackageManager } from '../types/index.js';

/** Files that indicate CI/CD providers */
const CI_INDICATORS: Array<{ path: string; name: string }> = [
  { path: '.github/workflows', name: 'GitHub Actions' },
  { path: '.gitlab-ci.yml', name: 'GitLab CI' },
  { path: 'Jenkinsfile', name: 'Jenkins' },
  { path: '.circleci/config.yml', name: 'CircleCI' },
  { path: 'azure-pipelines.yml', name: 'Azure Pipelines' },
  { path: '.travis.yml', name: 'Travis CI' },
  { path: 'bitbucket-pipelines.yml', name: 'Bitbucket Pipelines' },
  { path: '.drone.yml', name: 'Drone CI' },
  { path: 'Makefile', name: 'Makefile' },
];

/** Configuration files to look for and surface */
const INTERESTING_CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'jsconfig.json',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  'prettier.config.js',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  '.env',
  '.env.example',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'pom.xml',
  'build.gradle',
  'Cargo.toml',
  'go.mod',
  'jest.config.js',
  'jest.config.ts',
  'vitest.config.ts',
  '.github/workflows',
];

/**
 * Detect the project type from available indicator files.
 */
async function detectProjectType(projectRoot: string): Promise<ProjectType> {
  if (await pathExists(joinPath(projectRoot, 'package.json'))) return 'nodejs';
  if (await pathExists(joinPath(projectRoot, 'requirements.txt'))) return 'python';
  if (await pathExists(joinPath(projectRoot, 'pyproject.toml'))) return 'python';
  if (await pathExists(joinPath(projectRoot, 'pom.xml'))) return 'java';
  if (await pathExists(joinPath(projectRoot, 'build.gradle'))) return 'java';
  if (await pathExists(joinPath(projectRoot, 'build.gradle.kts'))) return 'java';
  if (await pathExists(joinPath(projectRoot, 'Cargo.toml'))) return 'rust';
  if (await pathExists(joinPath(projectRoot, 'go.mod'))) return 'go';
  if (await pathExists(joinPath(projectRoot, 'composer.json'))) return 'php';
  if (await pathExists(joinPath(projectRoot, 'Gemfile'))) return 'ruby';
  if (await pathExists(joinPath(projectRoot, '*.csproj'))) return 'dotnet';
  return 'unknown';
}

/**
 * Detect CI/CD provider by checking known indicator paths.
 */
async function detectCiCd(projectRoot: string): Promise<{ hasCiCd: boolean; provider: string | null }> {
  for (const indicator of CI_INDICATORS) {
    if (await pathExists(joinPath(projectRoot, indicator.path))) {
      return { hasCiCd: true, provider: indicator.name };
    }
  }
  return { hasCiCd: false, provider: null };
}

/**
 * Find interesting config files that exist in the project.
 */
async function findConfigFiles(projectRoot: string): Promise<string[]> {
  const found: string[] = [];
  for (const file of INTERESTING_CONFIG_FILES) {
    if (await pathExists(joinPath(projectRoot, file))) {
      found.push(file);
    }
  }
  return found;
}

/**
 * Build a complete ProjectInfo for the given directory.
 */
export async function analyzeProject(projectRoot: string): Promise<ProjectInfo> {
  // Read package.json if present
  const pkgPath = joinPath(projectRoot, 'package.json');
  const pkg = await readJsonFile<Record<string, unknown>>(pkgPath);

  // Gather all file paths for language detection
  const allFiles = await walkDirectory(projectRoot, {
    ignoreNames: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'],
  });

  const primaryLanguage = detectPrimaryLanguage(allFiles);
  const languageMap = analyzeLanguageDistribution(allFiles);
  const languages = Array.from(languageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
    .slice(0, 5);

  // Package manager
  const packageManager: PackageManager = await detectPackageManager(projectRoot, pkg ?? undefined);

  // Framework detection — gather deps from package.json
  const allDeps: string[] = [];
  if (pkg !== null) {
    const deps = pkg['dependencies'];
    const devDeps = pkg['devDependencies'];
    if (typeof deps === 'object' && deps !== null) allDeps.push(...Object.keys(deps));
    if (typeof devDeps === 'object' && devDeps !== null) allDeps.push(...Object.keys(devDeps));
  }
  const framework = await detectFramework(projectRoot, allDeps);

  // Project type
  const type = await detectProjectType(projectRoot);

  // Git
  const hasGit = await isGitRepo(projectRoot);

  // Docker
  const { detectDockerProject } = await import('../detectors/docker-detector.js');
  const docker = await detectDockerProject(projectRoot);

  // CI/CD
  const cicd = await detectCiCd(projectRoot);

  // Config files
  const configFiles = await findConfigFiles(projectRoot);

  // Name/version/description from package.json
  const name = typeof pkg?.['name'] === 'string' ? pkg['name'] : null;
  const version = typeof pkg?.['version'] === 'string' ? pkg['version'] : null;
  const description = typeof pkg?.['description'] === 'string' ? pkg['description'] : null;

  return {
    name,
    version,
    description,
    type,
    language: primaryLanguage ? [primaryLanguage, ...languages.filter((l) => l !== primaryLanguage)].slice(0, 5) : languages,
    framework,
    packageManager,
    hasDocker: docker.hasDockerfile || docker.hasComposeFile,
    hasGit,
    hasCiCd: cicd.hasCiCd,
    ciCdProvider: cicd.provider,
    configFiles,
    rootDir: projectRoot,
  };
}
