/**
 * Hub Management Types
 */

import { Device, StatusResponse } from '../api/types';

/**
 * Connection state for a hub
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

/**
 * Configuration for a Starling Hub
 */
export interface HubConfig {
  /** Unique identifier for this hub configuration */
  id: string;
  /** User-friendly name for the hub */
  name: string;
  /** Hub hostname or IP address */
  host: string;
  /** Port number (3080 for HTTP, 3443 for HTTPS) */
  port: number;
  /** Whether to use HTTPS */
  useHttps: boolean;
  /** API key for authentication */
  apiKey: string;
  /** Poll interval in milliseconds (default: 5000) */
  pollIntervalMs?: number;
}

/**
 * Runtime status of a hub connection
 */
export interface HubStatus {
  /** Hub configuration */
  config: HubConfig;
  /** Current connection state */
  state: ConnectionState;
  /** Whether the hub is considered online */
  isOnline: boolean;
  /** Timestamp of last successful poll */
  lastPoll: Date | null;
  /** Timestamp when grace period started (if in grace period) */
  gracePeriodStarted: Date | null;
  /** Last error message */
  lastError: string | null;
  /** API permissions (if known) */
  permissions: StatusResponse['permissions'] | null;
  /** API version reported by hub */
  apiVersion: string | null;
  /** Number of devices on this hub */
  deviceCount: number;
}

/**
 * Device state with hub context
 */
export interface DeviceWithHub {
  /** The device data */
  device: Device;
  /** ID of the hub this device belongs to */
  hubId: string;
  /** Composite unique ID (hubId:deviceId) */
  compositeId: string;
}

/**
 * State change event data
 */
export interface DeviceStateChange {
  /** Device that changed */
  device: Device;
  /** Hub ID */
  hubId: string;
  /** Properties that changed */
  changes: PropertyChange[];
  /** Timestamp of the change */
  timestamp: Date;
}

/**
 * Individual property change
 */
export interface PropertyChange {
  /** Property name */
  property: string;
  /** Previous value */
  oldValue: unknown;
  /** New value */
  newValue: unknown;
}

/**
 * Events emitted by HubConnection
 */
export interface HubConnectionEvents {
  /** Emitted when connection state changes */
  stateChange: (state: ConnectionState, previousState: ConnectionState) => void;
  /** Emitted when hub goes online (connected or reconnected) */
  online: () => void;
  /** Emitted when hub goes offline (after grace period) */
  offline: (error: string) => void;
  /** Emitted on connection error during grace period */
  error: (error: Error) => void;
  /** Emitted when devices are updated */
  devicesUpdated: (devices: Device[]) => void;
  /** Emitted when a device state changes */
  deviceStateChange: (change: DeviceStateChange) => void;
  /** Emitted when a new device is discovered */
  deviceAdded: (device: Device) => void;
  /** Emitted when a device is no longer present */
  deviceRemoved: (deviceId: string) => void;
}

/**
 * Events emitted by HubManager
 */
export interface HubManagerEvents {
  /** Emitted when a hub comes online */
  hubOnline: (hubId: string) => void;
  /** Emitted when a hub goes offline */
  hubOffline: (hubId: string, error: string) => void;
  /** Emitted when a hub is added */
  hubAdded: (hubId: string, config: HubConfig) => void;
  /** Emitted when a hub is removed */
  hubRemoved: (hubId: string) => void;
  /** Emitted when any device state changes */
  deviceStateChange: (change: DeviceStateChange) => void;
  /** Emitted when a device is added to any hub */
  deviceAdded: (hubId: string, device: Device) => void;
  /** Emitted when a device is removed from any hub */
  deviceRemoved: (hubId: string, deviceId: string) => void;
}

/**
 * Options for polling
 */
export interface PollerOptions {
  /** Interval between polls in milliseconds */
  intervalMs: number;
  /** Whether to poll immediately on start */
  immediate?: boolean;
  /** Callback when poll fails */
  onError?: (error: Error) => void;
}

/**
 * Cached device state for change detection
 */
export interface DeviceStateCache {
  /** Device states keyed by device ID */
  devices: Map<string, Device>;
  /** Last update timestamp */
  lastUpdate: Date | null;
}

/**
 * Result of a poll operation
 */
export interface PollResult {
  /** Whether the poll was successful */
  success: boolean;
  /** Current devices (if successful) */
  devices?: Device[];
  /** Error message (if failed) */
  error?: string;
  /** Detected state changes */
  changes: DeviceStateChange[];
  /** Duration of the poll in milliseconds */
  durationMs: number;
}

/**
 * Settings stored for the app
 */
export interface AppSettings {
  /** Configured hubs */
  hubs: HubConfig[];
  /** Default poll interval */
  defaultPollIntervalMs: number;
  /** Debug mode enabled */
  debugMode: boolean;
  /** Grace period duration */
  gracePeriodMs: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  hubs: [],
  defaultPollIntervalMs: 5000, // 5 seconds - captures events that clear after ~5s
  debugMode: false,
  gracePeriodMs: 45000, // 45 seconds
};
