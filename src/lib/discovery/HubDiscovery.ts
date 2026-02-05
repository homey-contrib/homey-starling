/**
 * Hub Discovery Module
 *
 * Discovers Starling Home Hubs on the local network using mDNS-SD.
 * Uses Homey's built-in discovery mechanism to find HomeKit devices,
 * then probes each to verify it's a Starling Hub with SDC API enabled.
 */

import * as http from 'http';
import * as https from 'https';
import Homey from 'homey';
import { StatusResponse } from '../api/types';
import { getLogger } from '../utils/Logger';

/**
 * Discovered hub information
 */
export interface DiscoveredHub {
  /** Unique identifier for this discovery result */
  id: string;
  /** Device name from mDNS */
  name: string;
  /** IP address */
  host: string;
  /** Port for SDC API (3080 or 3443) */
  port: number;
  /** Whether HTTPS is available */
  useHttps: boolean;
  /** API version if probed successfully */
  apiVersion?: string;
  /** Whether the hub has SDC API enabled and reachable */
  isStarlingHub: boolean;
  /** Timestamp of discovery */
  discoveredAt: Date;
}

/**
 * mDNS discovery result from Homey
 */
interface MdnsDiscoveryResult {
  id: string;
  address: string;
  host?: string;
  port?: number;
  name?: string;
  txt?: Record<string, string>;
}

/**
 * Hub Discovery Service
 *
 * Discovers and validates Starling Hubs on the local network.
 */
export class HubDiscovery {
  private readonly homey: Homey.App['homey'];
  private discoveredHubs: Map<string, DiscoveredHub> = new Map();
  private isScanning = false;
  private readonly logger = getLogger();

  /** Ports to probe for Starling SDC API */
  private static readonly PROBE_PORTS = [
    { port: 3080, useHttps: false },
    { port: 3443, useHttps: true },
  ];

  /** Timeout for probe requests (keep short for responsive UI) */
  private static readonly PROBE_TIMEOUT_MS = 1500;

  constructor(homey: Homey.App['homey']) {
    this.homey = homey;
  }

  /**
   * Get all discovered hubs
   */
  getDiscoveredHubs(): DiscoveredHub[] {
    return Array.from(this.discoveredHubs.values());
  }

  /**
   * Check if a scan is currently in progress
   */
  isScanningInProgress(): boolean {
    return this.isScanning;
  }

  /**
   * Start a discovery scan
   *
   * This uses Homey's mDNS-SD discovery to find HomeKit devices,
   * then probes each to determine if it's a Starling Hub with SDC API.
   *
   * @returns Promise that resolves when initial scan is complete
   */
  async startScan(): Promise<DiscoveredHub[]> {
    if (this.isScanning) {
      this.logger.debug('[HubDiscovery] Scan already in progress');
      return this.getDiscoveredHubs();
    }

    this.isScanning = true;
    this.discoveredHubs.clear();

    try {
      // Get the discovery strategy
      this.logger.debug('[HubDiscovery] Getting discovery strategy...');
      const strategy = this.homey.discovery.getStrategy('starling-hub');

      if (!strategy) {
        this.logger.error('[HubDiscovery] Discovery strategy not found!');
        throw new Error('Discovery strategy not found');
      }

      // Get current discovery results
      const results = strategy.getDiscoveryResults();
      this.logger.debug(
        `[HubDiscovery] Current discovery results: ${Object.keys(results).length} devices`
      );
      this.logger.debug(`[HubDiscovery] Results: ${JSON.stringify(results, null, 2)}`);

      // Process each result in parallel
      const probePromises = Object.values(results).map((result) =>
        this.processDiscoveryResult(result as unknown as MdnsDiscoveryResult)
      );

      await Promise.allSettled(probePromises);
      this.logger.debug(
        `[HubDiscovery] Finished probing existing results, found ${this.discoveredHubs.size} Starling hubs`
      );

      // Listen for new discoveries during the scan period
      const discoveryHandler = (result: unknown) => {
        this.logger.debug(`[HubDiscovery] New discovery result: ${JSON.stringify(result)}`);
        void this.processDiscoveryResult(result as MdnsDiscoveryResult);
      };

      strategy.on('result', discoveryHandler);

      // Scan for a fixed duration, then stop listening
      this.logger.debug('[HubDiscovery] Waiting 2 seconds for more discoveries...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      strategy.off('result', discoveryHandler);

      this.logger.debug(
        `[HubDiscovery] Scan complete, total hubs found: ${this.discoveredHubs.size}`
      );
      return this.getDiscoveredHubs();
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Process a single mDNS discovery result
   */
  private async processDiscoveryResult(result: MdnsDiscoveryResult): Promise<void> {
    const address = result.address;
    const mdnsName = result.name ?? result.host ?? address;

    this.logger.debug(`[HubDiscovery] Processing: ${mdnsName} at ${address}`);

    // Skip if we've already processed this address
    const existingByAddress = Array.from(this.discoveredHubs.values()).find(
      (h) => h.host === address
    );
    if (existingByAddress) {
      this.logger.debug(`[HubDiscovery] Already processed ${address}`);
      return;
    }

    // Probe both ports to check for Starling SDC API
    for (const { port, useHttps } of HubDiscovery.PROBE_PORTS) {
      try {
        this.logger.debug(
          `[HubDiscovery] Probing ${address} port ${port} ${useHttps ? '(HTTPS)' : '(HTTP)'}`
        );
        const probeResult = await this.probeForStarlingApi(address, port, useHttps);

        if (probeResult.isStarling) {
          this.logger.debug(`[HubDiscovery] Found Starling Hub at ${address}:${port}`);
          const hub: DiscoveredHub = {
            id: `${address}:${port}`,
            name: mdnsName,
            host: address,
            port,
            useHttps,
            apiVersion: probeResult.apiVersion,
            isStarlingHub: true,
            discoveredAt: new Date(),
          };

          this.discoveredHubs.set(hub.id, hub);
          return; // Found Starling on this device, no need to probe other port
        } else {
          this.logger.debug(`[HubDiscovery] Not a Starling Hub: ${address}:${port}`);
        }
      } catch (err) {
        this.logger.debug(`[HubDiscovery] Probe failed: ${address}:${port} ${String(err)}`);
        // Probe failed, continue to next port
      }
    }
  }

  /**
   * Probe an address/port combination to check if it's a Starling Hub
   *
   * We attempt to access the status endpoint without an API key.
   * Starling will return an "INVALID_API_KEY" error, which confirms
   * it's a Starling Hub. Other devices will return 404 or different errors.
   */
  private async probeForStarlingApi(
    host: string,
    port: number,
    useHttps: boolean
  ): Promise<{ isStarling: boolean; apiVersion?: string }> {
    return new Promise((resolve) => {
      const path = '/api/connect/v2/status?key=probe';

      const options: http.RequestOptions = {
        hostname: host,
        port,
        path,
        method: 'GET',
        timeout: HubDiscovery.PROBE_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
      };

      if (useHttps) {
        (options as https.RequestOptions).rejectUnauthorized = false;
      }

      const transport = useHttps ? https : http;

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          try {
            const data = JSON.parse(body) as Record<string, unknown>;

            // Check for Starling-specific error codes
            if (data.code === 'INVALID_API_KEY' || data.code === 'MISSING_API_KEY') {
              // This is definitely a Starling Hub
              resolve({ isStarling: true });
              return;
            }

            // Check if this is a valid status response (in case we somehow got a valid key)
            if (data.apiReady !== undefined && data.apiVersion) {
              resolve({
                isStarling: true,
                apiVersion: data.apiVersion as string,
              });
              return;
            }

            // Not a Starling Hub
            resolve({ isStarling: false });
          } catch {
            // Response wasn't JSON - not a Starling Hub
            resolve({ isStarling: false });
          }
        });
      });

      req.on('error', () => {
        resolve({ isStarling: false });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ isStarling: false });
      });

      req.end();
    });
  }

  /**
   * Validate a hub with an API key
   *
   * Used after the user provides an API key for a discovered hub.
   */
  async validateHub(
    host: string,
    port: number,
    useHttps: boolean,
    apiKey: string
  ): Promise<StatusResponse> {
    return new Promise((resolve, reject) => {
      const path = `/api/connect/v2/status?key=${encodeURIComponent(apiKey)}`;

      const options: http.RequestOptions = {
        hostname: host,
        port,
        path,
        method: 'GET',
        timeout: 10000,
        headers: {
          Accept: 'application/json',
        },
      };

      if (useHttps) {
        (options as https.RequestOptions).rejectUnauthorized = false;
      }

      const transport = useHttps ? https : http;

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const statusCode = res.statusCode ?? 500;
          const body = Buffer.concat(chunks).toString('utf-8');

          try {
            const data = JSON.parse(body) as StatusResponse;

            if (statusCode >= 400) {
              const errorData = data as unknown as { code?: string; message?: string };
              reject(new Error(errorData.message ?? `HTTP ${statusCode}`));
              return;
            }

            if (!data.apiReady) {
              reject(new Error('Starling Hub API is not ready'));
              return;
            }

            resolve(data);
          } catch {
            reject(new Error('Invalid response from hub'));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(new Error(`Connection failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.end();
    });
  }

  /**
   * Clear all discovered hubs
   */
  clearDiscoveredHubs(): void {
    this.discoveredHubs.clear();
  }
}
