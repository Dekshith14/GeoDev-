/**
 * Terminal output utilities — centralized, consistent styling.
 *
 * Uses Chalk for colors. Respects NO_COLOR and CI environments.
 */

import chalk from 'chalk';
import { shouldUseColor } from '../utils/platform.js';

const useColor = shouldUseColor();

// Conditionally apply color
const c = {
  green: (s: string) => useColor ? chalk.green(s) : s,
  yellow: (s: string) => useColor ? chalk.yellow(s) : s,
  red: (s: string) => useColor ? chalk.red(s) : s,
  cyan: (s: string) => useColor ? chalk.cyan(s) : s,
  gray: (s: string) => useColor ? chalk.gray(s) : s,
  bold: (s: string) => useColor ? chalk.bold(s) : s,
  dim: (s: string) => useColor ? chalk.dim(s) : s,
  blue: (s: string) => useColor ? chalk.blue(s) : s,
  magenta: (s: string) => useColor ? chalk.magenta(s) : s,
  white: (s: string) => useColor ? chalk.white(s) : s,
};

// ─── Semantic symbols ─────────────────────────────────────────────────────────

export const SYMBOLS = {
  ok: c.green('✓'),
  warn: c.yellow('⚠'),
  error: c.red('✗'),
  info: c.cyan('ℹ'),
  bullet: c.dim('•'),
  arrow: c.dim('→'),
} as const;

// ─── Headers ─────────────────────────────────────────────────────────────────

export function printHeader(title: string): void {
  console.log('');
  console.log(c.bold(title));
  console.log(c.dim('─'.repeat(40)));
}

export function printSubHeader(title: string): void {
  console.log('');
  console.log(c.cyan(title));
  console.log(c.dim('─'.repeat(40)));
}

export function printSeparator(): void {
  console.log(c.dim('─'.repeat(40)));
}

// ─── Status lines ─────────────────────────────────────────────────────────────

export function printOk(label: string, detail: string = ''): void {
  const line = detail ? `${SYMBOLS.ok} ${padLabel(label)} ${c.dim(detail)}` : `${SYMBOLS.ok} ${label}`;
  console.log(line);
}

export function printWarn(label: string, detail: string = ''): void {
  const line = detail ? `${SYMBOLS.warn} ${padLabel(label)} ${c.yellow(detail)}` : `${SYMBOLS.warn} ${c.yellow(label)}`;
  console.log(line);
}

export function printError(label: string, detail: string = ''): void {
  const line = detail ? `${SYMBOLS.error} ${padLabel(label)} ${c.red(detail)}` : `${SYMBOLS.error} ${c.red(label)}`;
  console.log(line);
}

export function printInfo(label: string, detail: string = ''): void {
  const line = detail ? `${SYMBOLS.info} ${padLabel(label)} ${detail}` : `${SYMBOLS.info} ${label}`;
  console.log(line);
}

export function printSkip(label: string, detail: string = ''): void {
  const line = detail ? `${c.dim('-')} ${c.dim(padLabel(label))} ${c.dim(detail)}` : `${c.dim('-')} ${c.dim(label)}`;
  console.log(line);
}

// ─── Key-value pairs ──────────────────────────────────────────────────────────

export function printKeyValue(key: string, value: string): void {
  console.log(`  ${c.dim(padLabel(key, 16))} ${value}`);
}

export function printKeyValueList(pairs: Array<[string, string]>): void {
  for (const [key, value] of pairs) {
    printKeyValue(key, value);
  }
}

// ─── Score display ────────────────────────────────────────────────────────────

export function printHealthScore(score: number): void {
  const color = score >= 80 ? c.green : score >= 60 ? c.yellow : c.red;
  console.log('');
  printSeparator();
  console.log(`  ${c.bold('Project Health:')} ${color(String(score) + '/100')}`);
  console.log('');
}

// ─── Error display ────────────────────────────────────────────────────────────

export function printCliError(message: string, suggestion?: string): void {
  console.error('');
  console.error(`${SYMBOLS.error} ${c.red(message)}`);
  if (suggestion !== undefined) {
    console.error('');
    console.error(c.dim('  Suggestion:'));
    console.error(`  ${suggestion}`);
  }
  console.error('');
}

export function printFatalError(message: string, suggestion?: string): void {
  printCliError(message, suggestion);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function padLabel(label: string, width: number = 16): string {
  return label.padEnd(width);
}

export function printBlank(): void {
  console.log('');
}

export function printList(items: string[], icon: string = SYMBOLS.bullet): void {
  for (const item of items) {
    console.log(`  ${icon} ${item}`);
  }
}

export function printTable(rows: Array<[string, string]>, header?: [string, string]): void {
  const COL_WIDTH = 20;

  if (header !== undefined) {
    console.log(`  ${c.bold(header[0]!.padEnd(COL_WIDTH))} ${c.bold(header[1]!)}`);
    console.log(`  ${c.dim('─'.repeat(COL_WIDTH))} ${c.dim('─'.repeat(30))}`);
  }

  for (const [col1, col2] of rows) {
    console.log(`  ${col1.padEnd(COL_WIDTH)} ${col2}`);
  }
}

// ─── Brand banner ─────────────────────────────────────────────────────────────

export function printBanner(commandName: string): void {
  console.log('');
  const brand = useColor ? chalk.bold.blue('GeoDev') : 'GeoDev';
  console.log(`${brand} ${c.dim('·')} ${commandName}`);
  console.log(c.dim('─'.repeat(40)));
}
