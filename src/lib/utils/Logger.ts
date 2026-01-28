/**
 * Logger utility with debug mode support
 */

import Homey from 'homey';

export class Logger {
  private app: Homey.App;
  private debugEnabled: boolean = false;

  constructor(app: Homey.App) {
    this.app = app;
  }

  /**
   * Enable or disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Log informational message (always logged)
   */
  info(message: string, ...args: unknown[]): void {
    this.app.log(`[INFO] ${message}`, ...args);
  }

  /**
   * Log warning message (always logged)
   */
  warn(message: string, ...args: unknown[]): void {
    this.app.log(`[WARN] ${message}`, ...args);
  }

  /**
   * Log error message (always logged)
   */
  error(message: string, error?: Error, ...args: unknown[]): void {
    if (error) {
      this.app.error(`[ERROR] ${message}`, error, ...args);
    } else {
      this.app.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Log debug message (only when debug mode enabled)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.debugEnabled) {
      this.app.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log API request (debug mode only)
   */
  logApiRequest(method: string, url: string, body?: unknown): void {
    if (this.debugEnabled) {
      const bodyStr = body ? ` body=${JSON.stringify(body)}` : '';
      this.debug(`API ${method} ${url}${bodyStr}`);
    }
  }

  /**
   * Log API response (debug mode only)
   */
  logApiResponse(method: string, url: string, status: number, durationMs: number): void {
    if (this.debugEnabled) {
      this.debug(`API ${method} ${url} -> ${status} (${durationMs}ms)`);
    }
  }

  /**
   * Log device state change
   */
  logStateChange(deviceId: string, property: string, oldValue: unknown, newValue: unknown): void {
    if (this.debugEnabled) {
      this.debug(`Device ${deviceId}: ${property} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);
    }
  }
}

// Singleton instance - will be initialized by the app
let loggerInstance: Logger | null = null;

export function initLogger(app: Homey.App): Logger {
  loggerInstance = new Logger(app);
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initLogger first.');
  }
  return loggerInstance;
}
