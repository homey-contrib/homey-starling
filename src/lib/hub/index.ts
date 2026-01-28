/**
 * Hub Management Module
 *
 * Provides centralized management for Starling Hub connections:
 * - HubManager: Singleton orchestrator for all hub connections
 * - HubConnection: Individual hub connection with state management
 * - Poller: Polling scheduler for device state updates
 * - Types: TypeScript interfaces and constants
 */

// Types and constants
export {
  ConnectionState,
  HubConfig,
  HubStatus,
  DeviceWithHub,
  DeviceStateChange,
  PropertyChange,
  HubConnectionEvents,
  HubManagerEvents,
  PollerOptions,
  DeviceStateCache,
  PollResult,
  AppSettings,
  DEFAULT_SETTINGS,
} from './types';

// Core classes
export { HubManager } from './HubManager';
export { HubConnection } from './HubConnection';
export { Poller, PollerConfig, PollerEvents } from './Poller';
