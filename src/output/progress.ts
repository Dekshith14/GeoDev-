/**
 * Progress spinner helpers — wraps Ora.
 * Automatically disables spinners in CI/non-TTY environments.
 */

import ora, { type Ora } from 'ora';
import { isCI, isTTY } from '../utils/platform.js';

const SPINNER_ENABLED = isTTY() && !isCI();

export function createSpinner(text: string): Ora {
  return ora({
    text,
    isSilent: !SPINNER_ENABLED,
    spinner: 'dots',
  });
}

/**
 * Run an async operation with a spinner.
 * Returns the result of the operation.
 */
export async function withSpinner<T>(
  text: string,
  operation: (spinner: Ora) => Promise<T>
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await operation(spinner);
    return result;
  } catch (err) {
    spinner.fail(text);
    throw err;
  }
}
