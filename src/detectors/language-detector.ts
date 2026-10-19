/**
 * Language detector — infers programming languages from file extensions.
 */

import * as path from 'node:path';

interface LanguageSignature {
  extensions: string[];
  language: string;
  /** Weight for determining "primary" language */
  weight: number;
}

const LANGUAGE_SIGNATURES: LanguageSignature[] = [
  { extensions: ['.ts', '.tsx'], language: 'TypeScript', weight: 10 },
  { extensions: ['.js', '.mjs', '.cjs', '.jsx'], language: 'JavaScript', weight: 8 },
  { extensions: ['.py', '.pyw'], language: 'Python', weight: 10 },
  { extensions: ['.java'], language: 'Java', weight: 10 },
  { extensions: ['.kt', '.kts'], language: 'Kotlin', weight: 10 },
  { extensions: ['.rs'], language: 'Rust', weight: 10 },
  { extensions: ['.go'], language: 'Go', weight: 10 },
  { extensions: ['.rb'], language: 'Ruby', weight: 10 },
  { extensions: ['.php'], language: 'PHP', weight: 10 },
  { extensions: ['.cs'], language: 'C#', weight: 10 },
  { extensions: ['.cpp', '.cc', '.cxx', '.c++'], language: 'C++', weight: 9 },
  { extensions: ['.c', '.h'], language: 'C', weight: 8 },
  { extensions: ['.swift'], language: 'Swift', weight: 10 },
  { extensions: ['.dart'], language: 'Dart', weight: 10 },
  { extensions: ['.scala'], language: 'Scala', weight: 10 },
  { extensions: ['.ex', '.exs'], language: 'Elixir', weight: 10 },
  { extensions: ['.hs'], language: 'Haskell', weight: 10 },
  { extensions: ['.sh', '.bash'], language: 'Shell', weight: 3 },
  { extensions: ['.ps1'], language: 'PowerShell', weight: 3 },
  { extensions: ['.css', '.scss', '.sass', '.less'], language: 'CSS', weight: 2 },
  { extensions: ['.html', '.htm'], language: 'HTML', weight: 2 },
  { extensions: ['.sql'], language: 'SQL', weight: 2 },
  { extensions: ['.json'], language: 'JSON', weight: 1 },
  { extensions: ['.yaml', '.yml'], language: 'YAML', weight: 1 },
  { extensions: ['.toml'], language: 'TOML', weight: 1 },
  { extensions: ['.md', '.mdx'], language: 'Markdown', weight: 1 },
];

const EXTENSION_TO_LANGUAGE = new Map<string, string>();
const EXTENSION_TO_WEIGHT = new Map<string, number>();

for (const sig of LANGUAGE_SIGNATURES) {
  for (const ext of sig.extensions) {
    EXTENSION_TO_LANGUAGE.set(ext, sig.language);
    EXTENSION_TO_WEIGHT.set(ext, sig.weight);
  }
}

/**
 * Detect the language of a single file by its extension.
 * Returns null if unknown.
 */
export function detectFileLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE.get(ext) ?? null;
}

/**
 * Get the weight for a file (used for primary language determination).
 */
export function getLanguageWeight(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_WEIGHT.get(ext) ?? 0;
}

/**
 * Analyze a list of file paths and return language statistics.
 */
export function analyzeLanguageDistribution(filePaths: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const filePath of filePaths) {
    const lang = detectFileLanguage(filePath);
    if (lang === null) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  return counts;
}

/**
 * Determine the primary language from a list of files.
 * Uses weighted scoring to prefer source languages over config files.
 */
export function detectPrimaryLanguage(filePaths: string[]): string | null {
  const scores = new Map<string, number>();

  for (const filePath of filePaths) {
    const lang = detectFileLanguage(filePath);
    const weight = getLanguageWeight(filePath);
    if (lang === null || weight === 0) continue;
    scores.set(lang, (scores.get(lang) ?? 0) + weight);
  }

  if (scores.size === 0) return null;

  let topLang = '';
  let topScore = -1;

  for (const [lang, score] of scores) {
    if (score > topScore) {
      topScore = score;
      topLang = lang;
    }
  }

  return topLang || null;
}

/**
 * Check if a file is a source file (not config/markup/data).
 */
export function isSourceFile(filePath: string): boolean {
  const weight = getLanguageWeight(filePath);
  return weight >= 8;
}
