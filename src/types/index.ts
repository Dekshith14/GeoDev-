/**
 * Core type definitions for GeoDev.
 * Keep this file lean — only shared interfaces belong here.
 */

// ─── Platform ────────────────────────────────────────────────────────────────

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

// ─── Tool detection ───────────────────────────────────────────────────────────

export interface ToolInfo {
  name: string;
  installed: boolean;
  version: string | null;
  path: string | null;
}

// ─── Environment ──────────────────────────────────────────────────────────────

export interface EnvVarStatus {
  name: string;
  present: boolean;
  /** Never store the actual value — only presence */
}

export interface PortStatus {
  port: number;
  inUse: boolean;
  pid?: number;
}

// ─── Doctor ──────────────────────────────────────────────────────────────────

export interface DoctorCheck {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'skip';
  detail: string;
  points: number; /** Points contributed to health score */
}

export interface DoctorReport {
  checks: DoctorCheck[];
  healthScore: number; /** 0–100 */
  timestamp: Date;
}

// ─── Project inspection ───────────────────────────────────────────────────────

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
export type ProjectType =
  | 'nodejs'
  | 'python'
  | 'java'
  | 'rust'
  | 'go'
  | 'php'
  | 'ruby'
  | 'dotnet'
  | 'unknown';

export interface ProjectInfo {
  name: string | null;
  version: string | null;
  description: string | null;
  type: ProjectType;
  language: string[];
  framework: string | null;
  packageManager: PackageManager;
  hasDocker: boolean;
  hasGit: boolean;
  hasCiCd: boolean;
  ciCdProvider: string | null;
  configFiles: string[];
  rootDir: string;
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

export interface DependencyEntry {
  name: string;
  specifiedVersion: string;
  resolvedVersion: string | null;
}

export interface DependencyReport {
  packageManager: PackageManager;
  dependencyCount: number;
  devDependencyCount: number;
  peerDependencyCount: number;
  hasLockfile: boolean;
  lockfileType: string | null;
  dependencies: DependencyEntry[];
  devDependencies: DependencyEntry[];
}

// ─── Git ─────────────────────────────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitRemote {
  name: string;
  url: string;
}

export interface GitReport {
  isRepo: boolean;
  branch: string | null;
  isDetachedHead: boolean;
  isDirty: boolean;
  changedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  recentCommits: GitCommit[];
  remotes: GitRemote[];
  contributors: string[];
  ahead: number;
  behind: number;
  totalCommits: number | null;
}

// ─── Code analysis ───────────────────────────────────────────────────────────

export interface LanguageStat {
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

export interface ParsedSymbol {
  kind: 'function' | 'class' | 'interface' | 'import' | 'export' | 'variable';
  name: string;
  line: number;
}

export interface ParsedFile {
  filePath: string;
  language: string;
  lineCount: number;
  symbols: ParsedSymbol[];
}

export interface AnalysisReport {
  rootDir: string;
  totalFiles: number;
  totalDirectories: number;
  totalLines: number;
  languageStats: LanguageStat[];
  largestFiles: Array<{ path: string; lines: number }>;
  largestDirs: Array<{ path: string; fileCount: number }>;
  configFiles: string[];
  potentialIssues: string[];
  parsedFiles: ParsedFile[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface GeodDevConfig {
  version: 1;
  ignore: string[];
  analysis: {
    dependencies: boolean;
    git: boolean;
    code: boolean;
  };
}

// ─── Process execution ────────────────────────────────────────────────────────

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// ─── AI provider (stub for V3) ────────────────────────────────────────────────

export interface AIProvider {
  generate(prompt: string): Promise<string>;
}
