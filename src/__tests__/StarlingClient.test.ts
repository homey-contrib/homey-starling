/**
 * Unit tests for StarlingClient
 *
 * Tests the client configuration and URL generation.
 * HTTP mocking is complex in Node.js; these tests focus on
 * the synchronous parts of the client.
 */

import { StarlingClient, StarlingClientConfig } from '../lib/api/StarlingClient';

describe('StarlingClient', () => {
  const httpConfig: StarlingClientConfig = {
    host: '192.168.1.100',
    port: 3080,
    apiKey: 'test-api-key',
    useHttps: false,
    timeoutMs: 5000,
  };

  const httpsConfig: StarlingClientConfig = {
    host: '192.168.1.100',
    port: 3443,
    apiKey: 'test-api-key',
    useHttps: true,
    timeoutMs: 10000,
  };

  describe('constructor', () => {
    it('should create client with HTTP configuration', () => {
      const client = new StarlingClient(httpConfig);
      expect(client).toBeInstanceOf(StarlingClient);
    });

    it('should create client with HTTPS configuration', () => {
      const client = new StarlingClient(httpsConfig);
      expect(client).toBeInstanceOf(StarlingClient);
    });

    it('should create client with default timeout', () => {
      const config: StarlingClientConfig = {
        host: '192.168.1.100',
        port: 3080,
        apiKey: 'test-key',
        useHttps: false,
      };
      const client = new StarlingClient(config);
      expect(client).toBeInstanceOf(StarlingClient);
    });
  });

  describe('getBaseUrl', () => {
    it('should return HTTP URL when useHttps is false', () => {
      const client = new StarlingClient(httpConfig);
      expect(client.getBaseUrl()).toBe(
        'http://192.168.1.100:3080/api/connect/v2'
      );
    });

    it('should return HTTPS URL when useHttps is true', () => {
      const client = new StarlingClient(httpsConfig);
      expect(client.getBaseUrl()).toBe(
        'https://192.168.1.100:3443/api/connect/v2'
      );
    });

    it('should handle different host values', () => {
      const client = new StarlingClient({
        ...httpConfig,
        host: 'starling-hub.local',
      });
      expect(client.getBaseUrl()).toBe(
        'http://starling-hub.local:3080/api/connect/v2'
      );
    });

    it('should handle different port values', () => {
      const client = new StarlingClient({
        ...httpConfig,
        port: 8080,
      });
      expect(client.getBaseUrl()).toBe(
        'http://192.168.1.100:8080/api/connect/v2'
      );
    });
  });
});
