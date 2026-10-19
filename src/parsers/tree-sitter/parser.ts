/**
 * Tree-sitter parser — extracts structural symbols from JS/TS source files.
 *
 * Design principles:
 * - Only supports JS/TS in V1; additional languages added later
 * - Actual AST traversal, not text pattern matching
 * - Gracefully degrades when tree-sitter is unavailable
 * - Never throws from public API — returns null on failure
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { detectFileLanguage } from '../../detectors/language-detector.js';
import type { ParsedFile, ParsedSymbol } from '../../types/index.js';

// ─── Tree-sitter lazy initialization ────────────────────────────────────────

let treeSitterLoaded = false;
let treeSitterError: Error | null = null;

// We use dynamic import so tree-sitter failures don't crash the whole CLI
let Parser: typeof import('tree-sitter') | null = null;
let TSJavaScript: unknown = null;
let TSTypeScript: { typescript: unknown; tsx: unknown } | null = null;

async function ensureTreeSitter(): Promise<boolean> {
  if (treeSitterLoaded) return Parser !== null;
  if (treeSitterError !== null) return false;

  try {
    // Dynamic import — isolates native module loading
    // tree-sitter is a CJS module, the constructor is the default export
    const tsModule = await import('tree-sitter') as { default?: unknown };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Parser = (tsModule.default ?? tsModule) as any;

    const jsModule = await import('tree-sitter-javascript') as { default?: unknown };
    TSJavaScript = (jsModule.default ?? jsModule) as unknown;

    const tsLangModule = await import('tree-sitter-typescript') as { default?: unknown; typescript?: unknown; tsx?: unknown };
    const tsLangRaw = (tsLangModule.default ?? tsLangModule) as Record<string, unknown>;
    TSTypeScript = {
      typescript: tsLangRaw['typescript'] ?? null,
      tsx: tsLangRaw['tsx'] ?? null,
    };

    treeSitterLoaded = true;
    return true;
  } catch (err) {
    treeSitterError = err instanceof Error ? err : new Error(String(err));
    treeSitterLoaded = true; // don't retry
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a file using Tree-sitter and extract structural symbols.
 * Returns null if the file type is not supported or if parsing fails.
 */
export async function parseFileWithTreeSitter(filePath: string): Promise<ParsedFile | null> {
  const language = detectFileLanguage(filePath);
  if (language !== 'TypeScript' && language !== 'JavaScript') return null;

  const available = await ensureTreeSitter();
  if (!available || Parser === null) return null;

  try {
    const source = await fs.readFile(filePath, 'utf-8');
    const lineCount = source.split('\n').length;

    const grammar = resolveGrammar(filePath, language);
    if (grammar === null) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new (Parser as any)();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (parser as any).setLanguage(grammar);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree = (parser as any).parse(source);

    const symbols = extractSymbols(tree.rootNode, source);

    return {
      filePath,
      language,
      lineCount,
      symbols,
    };
  } catch {
    return null;
  }
}

/**
 * Check whether Tree-sitter is available in this environment.
 */
export async function isTreeSitterAvailable(): Promise<boolean> {
  return ensureTreeSitter();
}

// ─── Grammar resolution ───────────────────────────────────────────────────────

function resolveGrammar(filePath: string, language: string): unknown | null {
  const ext = path.extname(filePath).toLowerCase();

  if (language === 'TypeScript') {
    if (ext === '.tsx' && TSTypeScript !== null) return TSTypeScript.tsx;
    if (TSTypeScript !== null) return TSTypeScript.typescript;
    return null;
  }

  if (language === 'JavaScript') {
    return TSJavaScript;
  }

  return null;
}

// ─── Symbol extraction ────────────────────────────────────────────────────────

type SyntaxNode = {
  type: string;
  text: string;
  startPosition: { row: number };
  childCount: number;
  children: SyntaxNode[];
  childForFieldName?: (name: string) => SyntaxNode | null;
  namedChildren: SyntaxNode[];
};

function extractSymbols(node: SyntaxNode, _source: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  visitNode(node, symbols);
  return symbols;
}

function visitNode(node: SyntaxNode, symbols: ParsedSymbol[]): void {
  switch (node.type) {
    case 'function_declaration':
    case 'function': {
      const name = getChildName(node, 'name');
      if (name) symbols.push({ kind: 'function', name, line: node.startPosition.row + 1 });
      break;
    }
    case 'method_definition': {
      const name = getChildName(node, 'name');
      if (name) symbols.push({ kind: 'function', name, line: node.startPosition.row + 1 });
      break;
    }
    case 'class_declaration': {
      const name = getChildName(node, 'name');
      if (name) symbols.push({ kind: 'class', name, line: node.startPosition.row + 1 });
      break;
    }
    case 'interface_declaration': {
      const name = getChildName(node, 'name');
      if (name) symbols.push({ kind: 'interface', name, line: node.startPosition.row + 1 });
      break;
    }
    case 'import_statement':
    case 'import_declaration': {
      const source = getChildText(node, 'source');
      if (source) {
        symbols.push({ kind: 'import', name: source.replace(/['"]/g, ''), line: node.startPosition.row + 1 });
      }
      break;
    }
    case 'export_statement': {
      // Walk the export's children to find declarations
      for (const child of node.namedChildren) {
        visitNode(child, symbols);
      }
      return; // Don't double-visit
    }
    case 'lexical_declaration':
    case 'variable_declaration': {
      const declarators = node.namedChildren.filter((c) => c.type === 'variable_declarator');
      for (const decl of declarators) {
        const name = getChildName(decl, 'name');
        if (name) symbols.push({ kind: 'variable', name, line: node.startPosition.row + 1 });
      }
      break;
    }
    case 'arrow_function': {
      // Arrow functions often appear as variable declarations — handled above
      break;
    }
  }

  // Recursively visit children
  for (const child of node.namedChildren) {
    visitNode(child, symbols);
  }
}

function getChildName(node: SyntaxNode, fieldName: string): string | null {
  if (typeof node.childForFieldName === 'function') {
    const child = node.childForFieldName(fieldName);
    return child?.text ?? null;
  }
  // Fallback: search by position in children
  return null;
}

function getChildText(node: SyntaxNode, fieldName: string): string | null {
  if (typeof node.childForFieldName === 'function') {
    const child = node.childForFieldName(fieldName);
    return child?.text ?? null;
  }
  return null;
}
