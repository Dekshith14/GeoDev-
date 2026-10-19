/**
 * `geodev init` — initialize GeoDev configuration in the current repository.
 */

import type { Command } from 'commander';
import * as clack from '@clack/prompts';
import { isInitialized, saveConfig, DEFAULT_CONFIG } from '../config/config.js';
import { geodevConfigPath, geodevDir } from '../utils/paths.js';
import { formatError, getExitCode } from '../utils/errors.js';
import { printBanner, printOk, printWarn, printCliError } from '../output/terminal.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize GeoDev configuration in the current repository')
    .option('--force', 'Overwrite existing configuration without prompting')
    .action(async (opts: { force?: boolean }) => {
      await runInit(opts.force === true);
    });
}

async function runInit(force: boolean): Promise<void> {
  printBanner('init');
  const projectRoot = process.cwd();

  try {
    const alreadyInitialized = await isInitialized(projectRoot);

    if (alreadyInitialized && !force) {
      clack.intro('');
      const shouldOverwrite = await clack.confirm({
        message: `GeoDev is already initialized in this directory.\n  Config: ${geodevConfigPath(projectRoot)}\n\n  Overwrite?`,
        initialValue: false,
      });

      if (clack.isCancel(shouldOverwrite) || !shouldOverwrite) {
        clack.cancel('Initialization cancelled. Existing configuration preserved.');
        process.exit(0);
      }
    }

    await saveConfig(projectRoot, DEFAULT_CONFIG);

    printOk('Created', geodevDir(projectRoot));
    printOk('Config', geodevConfigPath(projectRoot));
    console.log('');
    console.log('  Run `geodev doctor` to check your development environment.');
    console.log('');

  } catch (err) {
    printCliError('Failed to initialize GeoDev.', formatError(err));
    process.exit(getExitCode(err));
  }
}
