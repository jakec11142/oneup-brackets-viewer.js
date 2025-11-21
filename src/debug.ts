/**
 * Debug utility for brackets-viewer
 * Only logs when debug mode is enabled
 */

let debugEnabled = false;

export const debug = {
  /** Enable or disable debug logging */
  setEnabled(enabled: boolean): void {
    debugEnabled = enabled;
  },

  /** Check if debug is enabled */
  isEnabled(): boolean {
    return debugEnabled;
  },

  /** Log info message */
  log(...args: unknown[]): void {
    if (debugEnabled) {
      console.log('[brackets-viewer]', ...args);
    }
  },

  /** Log warning message */
  warn(...args: unknown[]): void {
    if (debugEnabled) {
      console.warn('[brackets-viewer]', ...args);
    }
  },

  /** Log error message (always shown) */
  error(...args: unknown[]): void {
    console.error('[brackets-viewer]', ...args);
  },
};
