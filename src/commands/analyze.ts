/**
 * `geodev analyze` — full repository analysis command.
 */

import type { Command } from 'commander';
import { analyzeCode } from '../analyzers/code-analyzer.js';
import { analyzeProject } from '../analyzers/project-analyzer.js';
import { buildGitReport } from '../analyzers/git-analyzer.js';
import { withSpinner } from '../output/progress.js';
import {
  printBanner,
  printSubHeader,
  printKeyValueList,
  printTable,
  printOk,
  printWarn,
  printCliError,
  printBlank,
} from '../output/terminal.js';
import { formatError, getExitCode } from '../utils/errors.js';
import type { AnalysisReport, GitReport, ProjectInfo } from '../types/index.js';
import { isTreeSitterAvailable } from '../parsers/tree-sitter/parser.js';

export function registerAnalyzeCommand(program: Command): void {
  program
    .command('analyze')
    .description('Run a full repository analysis (files, LoC, languages, structure, issues)')
    .option('--no-git', 'Skip Git analysis')
    .option('--no-tree-sitter', 'Skip Tree-sitter AST parsing')
    .action(async (opts: { git?: boolean; treeSitter?: boolean }) => {
      await runAnalyze({
        includeGit: opts.git !== false,
        includeTreeSitter: opts.treeSitter !== false,
      });
    });
}

async function runAnalyze(options: { includeGit: boolean; includeTreeSitter: boolean }): Promise<void> {
  printBanner('analyze');
  const projectRoot = process.cwd();

  try {
    // Run project analysis, code analysis, and optionally git in parallel
    const [projectInfo, codeReport, gitReport] = await withSpinner(
      'Analyzing repository...',
      async (spinner) => {
        const results = await Promise.allSettled([
          analyzeProject(projectRoot),
          analyzeCode(projectRoot, {
            maxParsedFiles: options.includeTreeSitter ? 100 : 0,
          }),
          options.includeGit ? buildGitReport(projectRoot).catch(() => null) : Promise.resolve(null),
        ]);

        spinner.succeed('Analysis complete');

        const proj = results[0]?.status === 'fulfilled' ? results[0].value : null;
        const code = results[1]?.status === 'fulfilled' ? results[1].value : null;
        const git = results[2]?.status === 'fulfilled' ? results[2].value : null;

        return [proj, code, git] as [ProjectInfo | null, AnalysisReport | null, GitReport | null];
      }
    );

    // ── Project overview ──────────────────────────────────────────────────────
    if (projectInfo !== null) {
      printSubHeader('Project');
      printKeyValueList([
        ['Name', projectInfo.name ?? '(unnamed)'],
        ['Type', projectInfo.type],
        ['Language', projectInfo.language.slice(0, 3).join(', ')],
        ['Framework', projectInfo.framework ?? 'None'],
        ['Package Manager', projectInfo.packageManager],
      ]);
    }

    // ── File statistics ───────────────────────────────────────────────────────
    if (codeReport !== null) {
      printSubHeader('File Statistics');
      printKeyValueList([
        ['Total files', String(codeReport.totalFiles)],
        ['Total directories', String(codeReport.totalDirectories)],
        ['Total lines', codeReport.totalLines.toLocaleString()],
      ]);

      // Language distribution
      if (codeReport.languageStats.length > 0) {
        printSubHeader('Language Distribution');
        printTable(
          codeReport.languageStats.slice(0, 8).map((s) => [
            s.language,
            `${s.fileCount} files  ${s.lineCount.toLocaleString()} lines  (${s.percentage}%)`,
          ]),
          ['Language', 'Files / Lines / Share']
        );
      }

      // Largest files
      if (codeReport.largestFiles.length > 0) {
        printSubHeader('Largest Files');
        printTable(
          codeReport.largestFiles.slice(0, 8).map((f) => [f.path, `${f.lines} lines`]),
          ['File', 'Lines']
        );
      }

      // Largest directories
      if (codeReport.largestDirs.length > 0) {
        printSubHeader('Largest Directories');
        printTable(
          codeReport.largestDirs.map((d) => [d.path, `${d.fileCount} files`]),
          ['Directory', 'Files']
        );
      }

      // Tree-sitter info
      const tsAvailable = await isTreeSitterAvailable();
      if (options.includeTreeSitter && tsAvailable && codeReport.parsedFiles.length > 0) {
        const totalFunctions = codeReport.parsedFiles.flatMap((f) => f.symbols.filter((s) => s.kind === 'function')).length;
        const totalClasses = codeReport.parsedFiles.flatMap((f) => f.symbols.filter((s) => s.kind === 'class')).length;
        const totalImports = codeReport.parsedFiles.flatMap((f) => f.symbols.filter((s) => s.kind === 'import')).length;

        printSubHeader('AST Analysis (Tree-sitter)');
        printKeyValueList([
          ['Parsed files', String(codeReport.parsedFiles.length)],
          ['Functions found', String(totalFunctions)],
          ['Classes found', String(totalClasses)],
          ['Import statements', String(totalImports)],
        ]);
      }

      // Potential issues
      if (codeReport.potentialIssues.length > 0) {
        printSubHeader('Potential Issues');
        for (const issue of codeReport.potentialIssues) {
          printWarn(issue);
        }
      }
    }

    // ── Git snapshot ──────────────────────────────────────────────────────────
    if (options.includeGit && gitReport !== null) {
      printSubHeader('Git Snapshot');
      printKeyValueList([
        ['Branch', gitReport.branch ?? 'detached'],
        ['Status', gitReport.isDirty ? 'Modified' : 'Clean'],
        ['Changed files', String(gitReport.changedFiles)],
        ['Total commits', gitReport.totalCommits !== null ? String(gitReport.totalCommits) : 'N/A'],
        ['Contributors', String(gitReport.contributors.length)],
      ]);
    }

    printBlank();
    process.exit(0);

  } catch (err) {
    printCliError('Analysis failed.', formatError(err));
    process.exit(getExitCode(err));
  }
}
