#!/usr/bin/env node
/**
 * GeoDev CLI entry point.
 *
 * This file only:
 * 1. Creates the Commander program
 * 2. Registers commands
 * 3. Sets global options
 * 4. Handles top-level errors
 *
 * NO business logic belongs here.
 */

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { registerInitCommand } from './commands/init.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerInspectCommand } from './commands/inspect.js';
import { registerDepsCommand } from './commands/deps.js';
import { registerGitCommand } from './commands/git.js';
import { registerAnalyzeCommand } from './commands/analyze.js';
import { printCliError } from './output/terminal.js';
import { formatError } from './utils/errors.js';

// ─── Read package.json for version ───────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let version = '0.1.0';
try {
  const require = createRequire(import.meta.url);
  // In dist/, go up one level to find package.json
  const pkg = require(path.join(__dirname, '..', 'package.json')) as { version?: string };
  version = pkg.version ?? '0.1.0';
} catch {
  // Fallback when running from source with tsx
  try {
    const require = createRequire(import.meta.url);
    const pkg = require(path.join(__dirname, 'package.json')) as { version?: string };
    version = pkg.version ?? '0.1.0';
  } catch {
    // Use default
  }
}

// ─── Global debug flag ────────────────────────────────────────────────────────

let debugMode = false;

// ─── Program setup ────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('geodev')
  .description('Autonomous developer intelligence CLI — inspect, diagnose, and understand your repository')
  .version(version, '-V, --version', 'Output the current version')
  .option('--debug', 'Enable verbose debug output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts<{ debug?: boolean }>();
    if (opts.debug === true) {
      debugMode = true;
      process.env['GEODEV_DEBUG'] = '1';
    }
  })
  .addHelpText('after', `
Examples:
  $ geodev init          Initialize GeoDev in this repository
  $ geodev doctor        Check your development environment
  $ geodev inspect       Inspect project type and structure
  $ geodev deps          Analyze dependencies
  $ geodev git           Show Git repository status
  $ geodev analyze       Full repository analysis

Exit Codes:
  0  Success
  1  Detected problems or analysis failure
  2  Invalid CLI usage

Documentation:
  https://github.com/geodev/geodev#readme
`);

// ─── Register all commands ────────────────────────────────────────────────────

registerInitCommand(program);
registerDoctorCommand(program);
registerInspectCommand(program);
registerDepsCommand(program);
registerGitCommand(program);
registerAnalyzeCommand(program);

// ─── Error handling ───────────────────────────────────────────────────────────

program.configureOutput({
  writeErr: (str) => process.stderr.write(str),
});

// Handle unknown commands
program.on('command:*', (operands: string[]) => {
  printCliError(
    `Unknown command: ${operands[0] ?? ''}`,
    'Run `geodev --help` to see available commands.'
  );
  process.exit(2);
});

// ─── Parse ────────────────────────────────────────────────────────────────────

try {
  await program.parseAsync(process.argv);
} catch (err: unknown) {
  printCliError('Unexpected error.', formatError(err, debugMode));
  process.exit(1);
}
