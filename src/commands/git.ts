/**
 * `geodev git` — Git repository status and history.
 */

import type { Command } from 'commander';
import { buildGitReport } from '../analyzers/git-analyzer.js';
import { withSpinner } from '../output/progress.js';
import {
  printBanner,
  printSubHeader,
  printKeyValueList,
  printWarn,
  printCliError,
  printBlank,
} from '../output/terminal.js';
import { formatError, getExitCode, NotAGitRepoError } from '../utils/errors.js';
import type { GitReport } from '../types/index.js';

export function registerGitCommand(program: Command): void {
  program
    .command('git')
    .description('Inspect Git repository state, history, and contributors')
    .action(async () => {
      await runGit();
    });
}

async function runGit(): Promise<void> {
  printBanner('git');
  const projectRoot = process.cwd();

  try {
    const report = await withSpinner('Reading git repository...', async (spinner) => {
      const result = await buildGitReport(projectRoot);
      spinner.succeed('Git data read');
      return result;
    });

    renderGitReport(report);
    process.exit(0);

  } catch (err) {
    if (err instanceof NotAGitRepoError) {
      printCliError(
        'Not a Git repository.',
        'Run `git init` to initialize a repository, or navigate to a directory that contains one.'
      );
      process.exit(1);
    }
    printCliError('Unable to read Git repository.', formatError(err));
    process.exit(getExitCode(err));
  }
}

function renderGitReport(report: GitReport): void {
  printSubHeader('Repository');

  const statusLabel = report.isDirty ? 'Modified' : 'Clean';
  const branchLabel = report.isDetachedHead ? 'Detached HEAD' : (report.branch ?? 'unknown');

  const rows: Array<[string, string]> = [
    ['Branch', branchLabel],
    ['Status', statusLabel],
  ];

  if (report.ahead > 0 || report.behind > 0) {
    rows.push(['Sync', `↑${report.ahead} ↓${report.behind}`]);
  }

  if (report.totalCommits !== null) {
    rows.push(['Total commits', String(report.totalCommits)]);
  }

  printKeyValueList(rows);

  // File status
  printSubHeader('Working Tree');
  printKeyValueList([
    ['Changed files', String(report.changedFiles)],
    ['Staged files', String(report.stagedFiles)],
    ['Untracked', String(report.untrackedFiles)],
  ]);

  // Remotes
  if (report.remotes.length > 0) {
    printSubHeader('Remotes');
    for (const remote of report.remotes) {
      console.log(`  ${remote.name.padEnd(12)} ${remote.url}`);
    }
  }

  // Recent commits
  if (report.recentCommits.length > 0) {
    printSubHeader('Recent Commits');
    for (const commit of report.recentCommits) {
      const date = commit.date.slice(0, 10);
      console.log(`  ${commit.shortHash}  ${commit.message.slice(0, 60).padEnd(62)}  ${date}`);
    }
  }

  // Contributors
  if (report.contributors.length > 0) {
    printSubHeader('Contributors');
    for (const author of report.contributors.slice(0, 10)) {
      console.log(`  • ${author}`);
    }
  }

  printBlank();
}
