/**
 * Code analyzer — walks the repository and produces file/language statistics.
 * Uses Tree-sitter for AST parsing of JS/TS files.
 */

import * as path from 'node:path';
import { walkDirectory, countLines, listDir } from '../services/filesystem.js';
import { detectFileLanguage, analyzeLanguageDistribution } from '../detectors/language-detector.js';
import { parseFileWithTreeSitter } from '../parsers/tree-sitter/parser.js';
import type { AnalysisReport, LanguageStat, ParsedFile } from '../types/index.js';

/**
 * Build a full repository analysis report.
 */
export async function analyzeCode(
  projectRoot: string,
  options: {
    ignoreNames?: string[];
    maxParsedFiles?: number;
  } = {}
): Promise<AnalysisReport> {
  const {
    ignoreNames = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', 'target'],
    maxParsedFiles = 100,
  } = options;

  // Walk all files
  const allFiles = await walkDirectory(projectRoot, { ignoreNames });
  const totalFiles = allFiles.length;

  // Count directories
  const allDirs = await countDirectories(projectRoot, ignoreNames);

  // Count lines per file and accumulate totals
  const fileSizes: Array<{ path: string; lines: number }> = [];
  const languageLineCounts = new Map<string, number>();
  let totalLines = 0;

  await Promise.all(
    allFiles.map(async (filePath) => {
      const lines = await countLines(filePath);
      const lang = detectFileLanguage(filePath);
      const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');

      fileSizes.push({ path: rel, lines });
      totalLines += lines;

      if (lang !== null) {
        languageLineCounts.set(lang, (languageLineCounts.get(lang) ?? 0) + lines);
      }
    })
  );

  // Language distribution
  const langFileCounts = analyzeLanguageDistribution(allFiles);
  const totalLangLines = Array.from(languageLineCounts.values()).reduce((a, b) => a + b, 0) || 1;

  const languageStats: LanguageStat[] = Array.from(langFileCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([language, fileCount]) => {
      const lineCount = languageLineCounts.get(language) ?? 0;
      return {
        language,
        fileCount,
        lineCount,
        percentage: Math.round((lineCount / totalLangLines) * 100),
      };
    });

  // Largest files (top 10)
  const largestFiles = fileSizes
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

  // Largest directories (by file count)
  const dirFileCounts = new Map<string, number>();
  for (const filePath of allFiles) {
    const rel = path.relative(projectRoot, path.dirname(filePath)).replace(/\\/g, '/');
    const topDir = rel.split('/')[0] ?? '.';
    dirFileCounts.set(topDir, (dirFileCounts.get(topDir) ?? 0) + 1);
  }
  const largestDirs = Array.from(dirFileCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p, fileCount]) => ({ path: p, fileCount }));

  // Config files detection
  const configFiles = allFiles
    .filter((f) => {
      const base = path.basename(f);
      return (
        base.startsWith('.') ||
        base.includes('config') ||
        base.includes('rc') ||
        base === 'Makefile' ||
        base === 'Dockerfile'
      );
    })
    .map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'))
    .slice(0, 20);

  // Tree-sitter parsing for JS/TS source files
  const sourceFiles = allFiles.filter((f) => {
    const lang = detectFileLanguage(f);
    return lang === 'TypeScript' || lang === 'JavaScript';
  });

  const parsedFiles: ParsedFile[] = [];
  const filesToParse = sourceFiles.slice(0, maxParsedFiles);

  for (const filePath of filesToParse) {
    try {
      const parsed = await parseFileWithTreeSitter(filePath);
      if (parsed !== null) parsedFiles.push(parsed);
    } catch {
      // Skip files that fail to parse — don't break the entire analysis
    }
  }

  // Detect potential issues
  const potentialIssues = detectPotentialIssues(allFiles, projectRoot);

  return {
    rootDir: projectRoot,
    totalFiles,
    totalDirectories: allDirs,
    totalLines,
    languageStats,
    largestFiles,
    largestDirs,
    configFiles,
    potentialIssues,
    parsedFiles,
  };
}

async function countDirectories(root: string, ignoreNames: string[]): Promise<number> {
  let count = 0;
  const stack = [root];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    const entries = await listDir(dir);
    for (const entry of entries) {
      if (ignoreNames.includes(entry.name)) continue;
      if (entry.isDirectory()) {
        count++;
        stack.push(path.join(dir, entry.name));
      }
    }
  }

  return count;
}

function detectPotentialIssues(filePaths: string[], projectRoot: string): string[] {
  const issues: string[] = [];
  const relPaths = filePaths.map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'));

  const hasEnv = relPaths.some((p) => p === '.env');
  const hasEnvExample = relPaths.some((p) => p === '.env.example' || p === '.env.sample');

  if (hasEnv && !hasEnvExample) {
    issues.push('.env file found but no .env.example — consider documenting required variables');
  }

  const hasGitignore = relPaths.some((p) => p === '.gitignore');
  if (!hasGitignore) {
    issues.push('No .gitignore found — sensitive files may be accidentally committed');
  }

  const hasManyJsTs = filePaths.filter((f) => {
    const lang = detectFileLanguage(f);
    return lang === 'JavaScript' || lang === 'TypeScript';
  }).length;

  const hasTsConfig = relPaths.some((p) => p.includes('tsconfig'));
  if (hasManyJsTs > 5 && !hasTsConfig) {
    issues.push('TypeScript/JavaScript project without tsconfig.json detected');
  }

  return issues;
}
