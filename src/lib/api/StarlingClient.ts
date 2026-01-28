/**
 * Starling Developer Connect API v2 Client
 *
 * Low-level HTTP client for communicating with Starling Home Hub.
 * Handles authentication, TLS, timeouts, and error mapping.
 */

import * as http from 'http';
import * as https from 'https';
import {
  StatusResponse,
  Device,
  ApiErrorResponse,
  ApiErrorCode,
  StreamStartResponse,
  StreamExtendResponse,
  StreamStopResponse,
} from './types';
import {
  StarlingApiError,
  StarlingConnectionError,
  StarlingTimeoutError,
} from './errors';
import { snapshotRateLimiter, writeRateLimiter } from '../utils/RateLimiter';

/**
 * Configuration for StarlingClient
 */
export interface StarlingClientConfig {
  /** Hub hostname or IP address */
  host: string;
  /** Port number (3080 for HTTP, 3443 for HTTPS) */
  port: number;
  /** API key for authentication */
  apiKey: string;
  /** Whether to use HTTPS */
  useHttps: boolean;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}

/**
 * Response wrapper for internal use
 */
interface HttpResponse<T> {
  statusCode: number;
  data: T;
}

/**
 * Low-level client for Starling Developer Connect API v2
 */
export class StarlingClient {
  private readonly host: string;
  private readonly port: number;
  private readonly apiKey: string;
  private readonly useHttps: boolean;
  private readonly timeoutMs: number;
  private readonly basePath = '/api/connect/v2';

  constructor(config: StarlingClientConfig) {
    this.host = config.host;
    this.port = config.port;
    this.apiKey = config.apiKey;
    this.useHttps = config.useHttps;
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  /**
   * Get the base URL for this client
   */
  getBaseUrl(): string {
    const protocol = this.useHttps ? 'https' : 'http';
    return `${protocol}://${this.host}:${this.port}${this.basePath}`;
  }

  /**
   * Make an HTTP request to the Starling API
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>
  ): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = `${this.basePath}${path}`;
      const queryString = `key=${encodeURIComponent(this.apiKey)}`;
      const fullPath = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;

      const options: http.RequestOptions = {
        hostname: this.host,
        port: this.port,
        path: fullPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: this.timeoutMs,
      };

      // For HTTPS, disable certificate validation for local hubs
      if (this.useHttps) {
        (options as https.RequestOptions).rejectUnauthorized = false;
      }

      const transport = this.useHttps ? https : http;

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          const statusCode = res.statusCode ?? 500;

          try {
            const data = responseBody ? JSON.parse(responseBody) as T : ({} as T);

            // Check for API error responses
            if (statusCode >= 400) {
              const errorResponse = data as unknown as ApiErrorResponse;
              reject(
                new StarlingApiError(
                  errorResponse.code || 'UNKNOWN_ERROR',
                  errorResponse.message || `HTTP ${statusCode}`,
                  statusCode
                )
              );
              return;
            }

            resolve({ statusCode, data });
          } catch (parseError) {
            reject(
              new StarlingApiError(
                'PARSE_ERROR',
                `Failed to parse response: ${responseBody.substring(0, 100)}`,
                statusCode
              )
            );
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(
          new StarlingConnectionError(
            this.host,
            `Connection failed: ${error.message}`,
            error
          )
        );
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new StarlingTimeoutError(`${method} ${path}`, this.timeoutMs));
      });

      // Send request body for POST requests
      if (body && method === 'POST') {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  // ============================================================
  // Status & Discovery Endpoints
  // ============================================================

  /**
   * Get API status and readiness
   *
   * Call this first to verify the hub is ready and check permissions.
   */
  async getStatus(): Promise<StatusResponse> {
    const response = await this.request<StatusResponse>('GET', '/status');
    return response.data;
  }

  /**
   * Get all devices from the hub
   *
   * Transforms raw API responses to properly structure faceDetected properties.
   */
  async getDevices(): Promise<Device[]> {
    interface RawDevicesResponse {
      devices: Record<string, unknown>[];
    }
    const response = await this.request<RawDevicesResponse>('GET', '/devices');
    const rawDevices = response.data.devices || [];

    // Transform each device to properly structure faceDetected properties
    return rawDevices.map((raw) => this.transformDevice(raw));
  }

  /**
   * Transform raw API device response to structured Device type
   *
   * The Starling API returns faceDetected:PersonName as flat properties.
   * This transforms them into a proper Record<string, boolean>.
   */
  private transformDevice(raw: Record<string, unknown>): Device {
    const device = { ...raw } as Record<string, unknown>;
    const faceDetected: Record<string, boolean> = {};
    const keysToRemove: string[] = [];

    // Extract faceDetected:* properties
    for (const key of Object.keys(raw)) {
      if (key.startsWith('faceDetected:')) {
        const personName = key.substring('faceDetected:'.length);
        faceDetected[personName] = raw[key] as boolean;
        keysToRemove.push(key);
      }
    }

    // Remove flat faceDetected:* properties and add structured object
    for (const key of keysToRemove) {
      delete device[key];
    }

    // Only add faceDetected if there are faces
    if (Object.keys(faceDetected).length > 0) {
      device.faceDetected = faceDetected;
    }

    return device as unknown as Device;
  }

  /**
   * Get a single device by ID
   */
  async getDevice(deviceId: string): Promise<Device> {
    const response = await this.request<Record<string, unknown>>(
      'GET',
      `/devices/${encodeURIComponent(deviceId)}`
    );
    return this.transformDevice(response.data);
  }

  /**
   * Get a single property value from a device
   */
  async getDeviceProperty<T = unknown>(
    deviceId: string,
    property: string
  ): Promise<T> {
    interface PropertyResponse {
      value: T;
    }
    const response = await this.request<PropertyResponse>(
      'GET',
      `/devices/${encodeURIComponent(deviceId)}/${encodeURIComponent(property)}`
    );
    return response.data.value;
  }

  // ============================================================
  // Device Control Endpoints
  // ============================================================

  /**
   * Set a device property
   *
   * Rate limited to 1 request per second per device.
   */
  async setDeviceProperty(
    deviceId: string,
    property: string,
    value: unknown
  ): Promise<void> {
    const rateLimitKey = `write:${deviceId}`;

    await writeRateLimiter.execute(rateLimitKey, async () => {
      await this.request<Record<string, unknown>>(
        'POST',
        `/devices/${encodeURIComponent(deviceId)}`,
        { [property]: value }
      );
    });
  }

  /**
   * Set multiple device properties at once
   *
   * Rate limited to 1 request per second per device.
   */
  async setDeviceProperties(
    deviceId: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    const rateLimitKey = `write:${deviceId}`;

    await writeRateLimiter.execute(rateLimitKey, async () => {
      await this.request<Record<string, unknown>>(
        'POST',
        `/devices/${encodeURIComponent(deviceId)}`,
        properties
      );
    });
  }

  // ============================================================
  // Camera Endpoints
  // ============================================================

  /**
   * Get a camera snapshot
   *
   * Rate limited to 1 request per 10 seconds per camera.
   * Returns the raw image data as a Buffer.
   */
  async getSnapshot(deviceId: string): Promise<Buffer> {
    const rateLimitKey = `snapshot:${deviceId}`;

    return snapshotRateLimiter.execute(rateLimitKey, async () => {
      return this.requestBinary(
        'GET',
        `/devices/${encodeURIComponent(deviceId)}/snapshot`
      );
    });
  }

  // ============================================================
  // WebRTC Streaming Endpoints
  // ============================================================

  /**
   * Start a WebRTC stream for a camera
   *
   * Initiates WebRTC negotiation by sending an SDP offer and receiving an answer.
   * The stream will timeout after 2 minutes unless extended.
   *
   * Requires API version 2.0+ and 2021+ model Nest cameras.
   *
   * @param deviceId - Camera device ID
   * @param offerSdp - Raw SDP offer string (SDC V2 API does NOT use base64 encoding)
   * @returns SDP answer and stream ID for managing the stream
   */
  async startStream(deviceId: string, offerSdp: string): Promise<StreamStartResponse> {
    const response = await this.request<StreamStartResponse>(
      'POST',
      `/devices/${encodeURIComponent(deviceId)}/stream`,
      { offer: offerSdp }
    );
    return response.data;
  }

  /**
   * Extend an active camera stream
   *
   * Active streams timeout after 2 minutes. Call this every 60 seconds
   * to keep the stream alive.
   *
   * @param deviceId - Camera device ID
   * @param streamId - Stream ID from startStream()
   */
  async extendStream(deviceId: string, streamId: string): Promise<StreamExtendResponse> {
    const response = await this.request<StreamExtendResponse>(
      'POST',
      `/devices/${encodeURIComponent(deviceId)}/stream/${encodeURIComponent(streamId)}/extend`
    );
    return response.data;
  }

  /**
   * Stop an active camera stream
   *
   * @param deviceId - Camera device ID
   * @param streamId - Stream ID from startStream()
   */
  async stopStream(deviceId: string, streamId: string): Promise<StreamStopResponse> {
    const response = await this.request<StreamStopResponse>(
      'POST',
      `/devices/${encodeURIComponent(deviceId)}/stream/${encodeURIComponent(streamId)}/stop`
    );
    return response.data;
  }

  /**
   * Make a binary HTTP request (for snapshots)
   */
  private async requestBinary(method: 'GET', path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const url = `${this.basePath}${path}`;
      const queryString = `key=${encodeURIComponent(this.apiKey)}`;
      const fullPath = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;

      const options: http.RequestOptions = {
        hostname: this.host,
        port: this.port,
        path: fullPath,
        method,
        timeout: this.timeoutMs,
      };

      if (this.useHttps) {
        (options as https.RequestOptions).rejectUnauthorized = false;
      }

      const transport = this.useHttps ? https : http;

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const statusCode = res.statusCode ?? 500;

          if (statusCode >= 400) {
            // Try to parse error response
            const responseBody = Buffer.concat(chunks).toString('utf-8');
            try {
              const errorResponse = JSON.parse(responseBody) as ApiErrorResponse;
              reject(
                new StarlingApiError(
                  errorResponse.code || 'SNAPSHOT_ERROR',
                  errorResponse.message || `HTTP ${statusCode}`,
                  statusCode
                )
              );
            } catch {
              reject(
                new StarlingApiError(
                  'NO_SNAPSHOT_AVAILABLE' as ApiErrorCode,
                  `Failed to get snapshot: HTTP ${statusCode}`,
                  statusCode
                )
              );
            }
            return;
          }

          resolve(Buffer.concat(chunks));
        });
      });

      req.on('error', (error: Error) => {
        reject(
          new StarlingConnectionError(
            this.host,
            `Snapshot request failed: ${error.message}`,
            error
          )
        );
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new StarlingTimeoutError(`${method} ${path}`, this.timeoutMs));
      });

      req.end();
    });
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Test connectivity to the hub
   *
   * Returns the status response if successful, throws on failure.
   */
  async testConnection(): Promise<StatusResponse> {
    const status = await this.getStatus();

    if (!status.apiReady) {
      throw new StarlingApiError(
        'API_NOT_READY',
        'Starling Hub API is not ready',
        503
      );
    }

    return status;
  }

  /**
   * Check if the API key has specific permissions
   */
  async checkPermissions(): Promise<StatusResponse['permissions']> {
    const status = await this.getStatus();
    return status.permissions;
  }
}
