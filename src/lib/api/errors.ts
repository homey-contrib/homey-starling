/**
 * Custom error classes for Starling API interactions
 */

import { ApiErrorCode } from './types';

/**
 * Base error class for Starling API errors
 */
export class StarlingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StarlingError';
    Object.setPrototypeOf(this, StarlingError.prototype);
  }
}

/**
 * Error thrown when API returns an error response
 */
export class StarlingApiError extends StarlingError {
  public readonly code: ApiErrorCode | string;
  public readonly statusCode: number;

  constructor(code: ApiErrorCode | string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'StarlingApiError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, StarlingApiError.prototype);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'INVALID_API_KEY':
        return 'API key rejected. Please verify key in settings.';
      case 'DEVICE_NOT_FOUND':
        return 'Device no longer available on hub.';
      case 'READ_ONLY_PROPERTY':
        return 'This property cannot be changed.';
      case 'INVALID_VALUE':
        return 'Value not accepted by device.';
      case 'SET_ERROR':
        return 'Google Home rejected the change.';
      case 'NO_SNAPSHOT_AVAILABLE':
        return 'Camera snapshot unavailable.';
      case 'STREAM_REQUEST_REFUSED':
        return 'Could not start video stream.';
      default:
        return this.message;
    }
  }
}

/**
 * Error thrown when connection to hub fails
 */
export class StarlingConnectionError extends StarlingError {
  public readonly host: string;
  public readonly cause?: Error;

  constructor(host: string, message: string, cause?: Error) {
    super(message);
    this.name = 'StarlingConnectionError';
    this.host = host;
    this.cause = cause;
    Object.setPrototypeOf(this, StarlingConnectionError.prototype);
  }
}

/**
 * Error thrown when operation times out
 */
export class StarlingTimeoutError extends StarlingError {
  public readonly operation: string;
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'StarlingTimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, StarlingTimeoutError.prototype);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class StarlingRateLimitError extends StarlingError {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
    this.name = 'StarlingRateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, StarlingRateLimitError.prototype);
  }
}
