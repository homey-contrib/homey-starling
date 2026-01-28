import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });
  });

  afterEach(() => {
    rateLimiter.clearAll();
  });

  it('should execute requests immediately when under limit', async () => {
    const results: number[] = [];
    const start = Date.now();

    await rateLimiter.execute('test', async () => {
      results.push(1);
      return 1;
    });

    await rateLimiter.execute('test', async () => {
      results.push(2);
      return 2;
    });

    const elapsed = Date.now() - start;

    expect(results).toEqual([1, 2]);
    expect(elapsed).toBeLessThan(100); // Should be nearly instant
  });

  it('should delay requests when limit is exceeded', async () => {
    const results: number[] = [];
    const start = Date.now();

    // Execute 3 requests with limit of 2 per 1000ms
    const promises = [
      rateLimiter.execute('test', async () => {
        results.push(1);
        return 1;
      }),
      rateLimiter.execute('test', async () => {
        results.push(2);
        return 2;
      }),
      rateLimiter.execute('test', async () => {
        results.push(3);
        return 3;
      }),
    ];

    await Promise.all(promises);

    const elapsed = Date.now() - start;

    expect(results).toEqual([1, 2, 3]);
    expect(elapsed).toBeGreaterThanOrEqual(900); // Should wait ~1000ms for third request
  });

  it('should handle different keys independently', async () => {
    const resultsA: number[] = [];
    const resultsB: number[] = [];
    const start = Date.now();

    await Promise.all([
      rateLimiter.execute('keyA', async () => {
        resultsA.push(1);
        return 1;
      }),
      rateLimiter.execute('keyA', async () => {
        resultsA.push(2);
        return 2;
      }),
      rateLimiter.execute('keyB', async () => {
        resultsB.push(1);
        return 1;
      }),
      rateLimiter.execute('keyB', async () => {
        resultsB.push(2);
        return 2;
      }),
    ]);

    const elapsed = Date.now() - start;

    expect(resultsA).toEqual([1, 2]);
    expect(resultsB).toEqual([1, 2]);
    expect(elapsed).toBeLessThan(100); // Should be nearly instant (2 per key is under limit)
  });

  it('should clear rate limit history for a key', async () => {
    // Fill up the limit
    await rateLimiter.execute('test', async () => 1);
    await rateLimiter.execute('test', async () => 2);

    // Clear the limit
    rateLimiter.clear('test');

    // Should execute immediately now
    const start = Date.now();
    await rateLimiter.execute('test', async () => 3);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('should handle errors in operations', async () => {
    const error = new Error('Test error');

    await expect(
      rateLimiter.execute('test', async () => {
        throw error;
      })
    ).rejects.toThrow('Test error');

    // Should still work for subsequent requests
    const result = await rateLimiter.execute('test', async () => 'success');
    expect(result).toBe('success');
  });
});
