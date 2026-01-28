/**
 * Poller - Polling scheduler for device state updates
 *
 * Schedules regular polling of a HubConnection and handles:
 * - Interval-based polling
 * - Preventing overlapping polls
 * - Manual refresh triggers
 * - Error handling with callbacks
 */

import { EventEmitter } from 'events';
import { HubConnection } from './HubConnection';
import { PollResult } from './types';

/**
 * Events emitted by Poller
 */
export interface PollerEvents {
  /** Emitted after each successful poll */
  poll: (result: PollResult) => void;
  /** Emitted when a poll fails */
  error: (error: Error) => void;
  /** Emitted when polling starts */
  start: () => void;
  /** Emitted when polling stops */
  stop: () => void;
}

/**
 * Type-safe event emitter for Poller
 */
declare interface Poller {
  on<K extends keyof PollerEvents>(event: K, listener: PollerEvents[K]): this;
  emit<K extends keyof PollerEvents>(
    event: K,
    ...args: Parameters<PollerEvents[K]>
  ): boolean;
}

/**
 * Poller configuration
 */
export interface PollerConfig {
  /** Interval between polls in milliseconds */
  intervalMs: number;
  /** Whether to poll immediately on start (default: true) */
  immediate?: boolean;
}

/**
 * Polling scheduler for a HubConnection
 */
class Poller extends EventEmitter {
  private readonly connection: HubConnection;
  private intervalMs: number;
  private readonly immediate: boolean;

  private intervalId: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private isRunning: boolean = false;
  private pollCount: number = 0;
  private lastPollResult: PollResult | null = null;

  constructor(connection: HubConnection, config: PollerConfig) {
    super();
    this.connection = connection;
    this.intervalMs = config.intervalMs;
    this.immediate = config.immediate ?? true;
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('start');

    // Immediate first poll if configured
    if (this.immediate) {
      void this.poll();
    }

    // Start interval
    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.intervalMs);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.emit('stop');
  }

  /**
   * Check if poller is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get poll count since start
   */
  getPollCount(): number {
    return this.pollCount;
  }

  /**
   * Get last poll result
   */
  getLastPollResult(): PollResult | null {
    return this.lastPollResult;
  }

  /**
   * Trigger an immediate poll (manual refresh)
   *
   * This does not affect the regular polling schedule.
   */
  async refresh(): Promise<PollResult> {
    return this.poll();
  }

  /**
   * Update the poll interval
   *
   * Requires restart to take effect.
   */
  setInterval(newIntervalMs: number): void {
    if (newIntervalMs !== this.intervalMs) {
      const wasRunning = this.isRunning;
      this.stop();
      this.intervalMs = newIntervalMs;
      if (wasRunning) {
        this.start();
      }
    }
  }

  /**
   * Execute a poll operation
   */
  private async poll(): Promise<PollResult> {
    // Prevent overlapping polls
    if (this.isPolling) {
      return this.lastPollResult || {
        success: false,
        error: 'Poll already in progress',
        changes: [],
        durationMs: 0,
      };
    }

    this.isPolling = true;
    const startTime = Date.now();

    let result: PollResult;

    try {
      const { devices, changes } = await this.connection.refreshDevices();

      result = {
        success: true,
        devices,
        changes,
        durationMs: Date.now() - startTime,
      };

      this.pollCount++;
      this.lastPollResult = result;
      this.emit('poll', result);
    } catch (error) {
      result = {
        success: false,
        error: (error as Error).message,
        changes: [],
        durationMs: Date.now() - startTime,
      };

      this.lastPollResult = result;
      this.emit('error', error as Error);
    } finally {
      this.isPolling = false;
    }

    return result;
  }
}

export { Poller };
