/**
 * Git analyzer — wraps the git service to produce structured GitReport.
 * Re-exports buildGitReport for use by commands.
 */

export { buildGitReport, isGitRepo } from '../services/git.js';
