/**
 * `geodev inspect` — project inspection command.
 */

import type { Command } from 'commander';
import { analyzeProject } from '../analyzers/project-analyzer.js';
import { withSpinner } from '../output/progress.js';
import {
  printBanner,
  printSubHeader,
  printKeyValueList,
  printOk,
  printWarn,
  printCliError,
  printBlank,
} from '../output/terminal.js';
import { formatError, getExitCode } from '../utils/errors.js';
import type { ProjectInfo } from '../types/index.js';

export function registerInspectCommand(program: Command): void {
  program
    .command('inspect')
    .description('Inspect the current repository structure and project type')
    .action(async () => {
      await runInspect();
    });
}

async function runInspect(): Promise<void> {
  printBanner('inspect');
  const projectRoot = process.cwd();

  try {
    const info = await withSpinner('Inspecting project...', async (spinner) => {
      const result = await analyzeProject(projectRoot);
      spinner.succeed('Inspection complete');
      return result;
    });

    renderProjectInfo(info);
    process.exit(0);

  } catch (err) {
    printCliError('Unable to inspect repository.', formatError(err));
    process.exit(getExitCode(err));
  }
}

function renderProjectInfo(info: ProjectInfo): void {
  printSubHeader('Project');

  const rows: Array<[string, string]> = [
    ['Name', info.name ?? '(unnamed)'],
    ['Type', formatProjectType(info.type)],
    ['Language', info.language.slice(0, 3).join(', ') || 'Unknown'],
    ['Framework', info.framework ?? 'None detected'],
    ['Package Manager', info.packageManager],
    ['Docker', info.hasDocker ? 'Yes' : 'No'],
    ['Git', info.hasGit ? 'Yes' : 'No'],
    ['CI/CD', info.hasCiCd ? (info.ciCdProvider ?? 'Yes') : 'No'],
  ];

  if (info.version !== null) {
    rows.splice(1, 0, ['Version', info.version]);
  }

  printKeyValueList(rows);

  printSubHeader('Configuration Files');

  if (info.configFiles.length === 0) {
    console.log('  No configuration files detected.');
  } else {
    for (const file of info.configFiles) {
      printOk(file);
    }
  }

  printBlank();
}

function formatProjectType(type: string): string {
  const map: Record<string, string> = {
    nodejs: 'Node.js application',
    python: 'Python project',
    java: 'Java project',
    rust: 'Rust project',
    go: 'Go project',
    php: 'PHP project',
    ruby: 'Ruby project',
    dotnet: '.NET project',
    unknown: 'Unknown',
  };
  return map[type] ?? type;
}
