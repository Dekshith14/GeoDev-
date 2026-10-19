/**
 * Git service — thin wrapper around simple-git.
 * Provides typed access to repository state.
 */

import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';
import type { GitReport, GitCommit, GitRemote } from '../types/index.js';
import { NotAGitRepoError } from '../utils/errors.js';

/**
 * Create a simple-git instance for the given directory.
 */
export function createGitClient(dir: string): SimpleGit {
  const options: Partial<SimpleGitOptions> = {
    baseDir: dir,
    binary: 'git',
    maxConcurrentProcesses: 4,
    timeout: {
      block: 10000,
    },
  };
  return simpleGit(options);
}

/**
 * Check if a directory is a Git repository.
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const git = createGitClient(dir);
    await git.status();
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a complete GitReport for the given directory.
 */
export async function buildGitReport(dir: string): Promise<GitReport> {
  const git = createGitClient(dir);

  // Verify it's a git repository first
  const repoExists = await isGitRepo(dir);
  if (!repoExists) {
    throw new NotAGitRepoError(dir);
  }

  const [status, log, remoteList, shortlog] = await Promise.allSettled([
    git.status(),
    git.log({ maxCount: 10 }),
    git.getRemotes(true),
    git.raw(['shortlog', '-sn', '--all', '--no-merges']),
  ]);

  // Status
  const statusResult = status.status === 'fulfilled' ? status.value : null;
  const isDetached = statusResult?.detached ?? false;
  const branch = isDetached ? null : (statusResult?.current ?? null);
  const isDirty = (statusResult?.files.length ?? 0) > 0;
  const changedFiles = statusResult?.files.filter((f) => f.index !== '?' || f.working_dir !== '?').length ?? 0;
  const stagedFiles = statusResult?.staged.length ?? 0;
  const untrackedFiles = statusResult?.files.filter((f) => f.index === '?' && f.working_dir === '?').length ?? 0;
  const ahead = statusResult?.ahead ?? 0;
  const behind = statusResult?.behind ?? 0;

  // Commits
  const logResult = log.status === 'fulfilled' ? log.value : null;
  const recentCommits: GitCommit[] = (logResult?.all ?? []).map((c) => ({
    hash: c.hash,
    shortHash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
    date: c.date,
  }));

  // Remotes — strip credentials from URLs
  const remotesResult = remoteList.status === 'fulfilled' ? remoteList.value : [];
  const remotes: GitRemote[] = remotesResult.map((r) => ({
    name: r.name,
    url: sanitizeRemoteUrl(r.refs.fetch ?? r.refs.push ?? ''),
  }));

  // Contributors
  const shortlogResult = shortlog.status === 'fulfilled' ? shortlog.value : '';
  const contributors = parseShortlog(shortlogResult);

  // Total commit count
  let totalCommits: number | null = null;
  try {
    const countStr = await git.raw(['rev-list', '--count', 'HEAD']);
    totalCommits = parseInt(countStr.trim(), 10);
    if (isNaN(totalCommits)) totalCommits = null;
  } catch {
    totalCommits = null;
  }

  return {
    isRepo: true,
    branch,
    isDetachedHead: isDetached,
    isDirty,
    changedFiles,
    stagedFiles,
    untrackedFiles,
    recentCommits,
    remotes,
    contributors,
    ahead,
    behind,
    totalCommits,
  };
}

/**
 * Remove credentials from remote URLs to avoid accidentally printing secrets.
 * e.g. https://user:token@github.com/foo/bar → https://github.com/foo/bar
 */
function sanitizeRemoteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    // Not a parseable URL (e.g. SSH format): return as-is
    return url;
  }
}

/**
 * Parse git shortlog output into contributor names.
 * Format: "  N\tAuthor Name"
 */
function parseShortlog(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.trim().split('\t');
      return parts[1]?.trim() ?? '';
    })
    .filter(Boolean);
}
