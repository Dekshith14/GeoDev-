/**
 * `geodev deps` — dependency analysis command.
 */

import type { Command } from 'commander';
import { analyzeDependencies } from '../analyzers/dependency-analyzer.js';
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
import type { DependencyReport } from '../types/index.js';

export function registerDepsCommand(program: Command): void {
  program
    .command('deps')
    .description('Analyze project dependencies and lockfiles')
    .option('--show-dev', 'Also list dev dependencies')
    .option('--limit <n>', 'Max dependencies to show in list', '20')
    .action(async (opts: { showDev?: boolean; limit?: string }) => {
      await runDeps({
        showDev: opts.showDev === true,
        limit: parseInt(opts.limit ?? '20', 10),
      });
    });
}

async function runDeps(options: { showDev: boolean; limit: number }): Promise<void> {
  printBanner('deps');
  const projectRoot = process.cwd();

  try {
    const report = await withSpinner('Analyzing dependencies...', async (spinner) => {
      const result = await analyzeDependencies(projectRoot);
      spinner.succeed('Dependency analysis complete');
      return result;
    });

    renderDepsReport(report, options);
    process.exit(0);

  } catch (err) {
    printCliError('Unable to analyze dependencies.', formatError(err));
    process.exit(getExitCode(err));
  }
}

function renderDepsReport(report: DependencyReport, options: { showDev: boolean; limit: number }): void {
  printSubHeader('Overview');

  const rows: Array<[string, string]> = [
    ['Package Manager', report.packageManager],
    ['Dependencies', String(report.dependencyCount)],
    ['Dev Dependencies', String(report.devDependencyCount)],
    ['Peer Dependencies', String(report.peerDependencyCount)],
    ['Lockfile', report.hasLockfile ? (report.lockfileType ?? 'yes') : 'missing ⚠'],
  ];
  printKeyValueList(rows);

  if (!report.hasLockfile) {
    console.log('');
    printWarn('Lockfile', 'not found — reproducible installs may not be guaranteed');
  }

  // Production dependencies list
  if (report.dependencies.length > 0) {
    printSubHeader(`Production Dependencies (${report.dependencyCount})`);
    const slice = report.dependencies.slice(0, options.limit);
    printTable(
      slice.map((d) => [d.name, d.resolvedVersion ?? d.specifiedVersion]),
      ['Package', 'Version']
    );
    if (report.dependencies.length > options.limit) {
      console.log(`  ... and ${report.dependencies.length - options.limit} more`);
    }
  }

  // Dev dependencies list
  if (options.showDev && report.devDependencies.length > 0) {
    printSubHeader(`Dev Dependencies (${report.devDependencyCount})`);
    const slice = report.devDependencies.slice(0, options.limit);
    printTable(
      slice.map((d) => [d.name, d.resolvedVersion ?? d.specifiedVersion]),
      ['Package', 'Version']
    );
    if (report.devDependencies.length > options.limit) {
      console.log(`  ... and ${report.devDependencies.length - options.limit} more`);
    }
  } else if (!options.showDev && report.devDependencyCount > 0) {
    printBlank();
    console.log(`  ${report.devDependencyCount} dev dependencies (use --show-dev to list them)`);
  }

  printBlank();
}
