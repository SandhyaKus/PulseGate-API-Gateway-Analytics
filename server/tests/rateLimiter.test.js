const redisService = require('../src/services/redis');
const { RedisRateLimiter } = require('../src/services/rateLimiter');

describe('Day 3: Redis-backed Atomic Token Bucket (Integration with Real Redis)', () => {
  let rateLimiter;
  let testKeyPrefix;
  let client;

  beforeAll(async () => {
    client = await redisService.connect();
    rateLimiter = new RedisRateLimiter({ redisService });
  });

  afterAll(async () => {
    // Clean up test keys created during tests
    if (client && redisService.isConnected) {
      const keys = await client.keys('rate:test_*');
      if (keys.length > 0) {
        await client.del(keys);
      }
      await redisService.disconnect();
    }
  });

  beforeEach(() => {
    testKeyPrefix = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  });

  // 1. New bucket initialization
  test('1. Initializes new bucket with full capacity and executes first request', async () => {
    const clientId = `${testKeyPrefix}_init`;
    const routeId = 'products';

    const result = await rateLimiter.consume({
      clientId,
      routeId,
      capacity: 10,
      refillRatePerSecond: 1,
      cost: 1
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.retryAfterSeconds).toBe(0);
    expect(result.source).toBe('redis-lua');

    // Verify raw Redis state
    const state = await rateLimiter.getBucketState(clientId, routeId);
    expect(state).not.toBeNull();
    expect(state.tokens).toBe(9);
    expect(state.lastRefillTimestamp).toBeGreaterThan(0);
    expect(state.ttl).toBeGreaterThan(0);
  });

  // 2. Successful token consumption
  test('2. Successfully consumes tokens on consecutive requests', async () => {
    const clientId = `${testKeyPrefix}_consume`;
    const routeId = 'api_v1';

    for (let expectedRemaining = 4; expectedRemaining >= 0; expectedRemaining--) {
      const result = await rateLimiter.consume({
        clientId,
        routeId,
        capacity: 5,
        refillRatePerSecond: 1,
        cost: 1
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(expectedRemaining);
    }
  });

  // 3. Exhausted bucket rejection
  test('3. Rejects requests when bucket capacity is exhausted (HTTP 429 logic)', async () => {
    const clientId = `${testKeyPrefix}_exhaust`;
    const routeId = 'orders';

    // Exhaust 3 tokens
    for (let i = 0; i < 3; i++) {
      const res = await rateLimiter.consume({
        clientId,
        routeId,
        capacity: 3,
        refillRatePerSecond: 1,
        cost: 1
      });
      expect(res.allowed).toBe(true);
    }

    // 4th request must be rejected
    const rejection = await rateLimiter.consume({
      clientId,
      routeId,
      capacity: 3,
      refillRatePerSecond: 1,
      cost: 1
    });

    expect(rejection.allowed).toBe(false);
    expect(rejection.remaining).toBe(0);
    expect(rejection.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  // 4. Token refill
  test('4. Refills tokens based on elapsed time without exceeding capacity', async () => {
    const clientId = `${testKeyPrefix}_refill`;
    const routeId = 'search';
    const baseTime = 1700000000;

    // Start at T = baseTime, exhaust 5 tokens
    for (let i = 0; i < 5; i++) {
      await rateLimiter.consume({
        clientId,
        routeId,
        capacity: 5,
        refillRatePerSecond: 2, // 2 tokens per sec
        cost: 1,
        nowTimestampSecs: baseTime
      });
    }

    // Advance 2 seconds -> refilled = 2s * 2 tokens/s = 4 tokens
    // Consuming 1 token -> remaining = 4 - 1 = 3
    const resultAfterElapsed = await rateLimiter.consume({
      clientId,
      routeId,
      capacity: 5,
      refillRatePerSecond: 2,
      cost: 1,
      nowTimestampSecs: baseTime + 2
    });

    expect(resultAfterElapsed.allowed).toBe(true);
    expect(resultAfterElapsed.remaining).toBe(3);

    // Advance 100 seconds (capacity capped at 5)
    // Consuming 1 token -> remaining = 5 - 1 = 4
    const resultAfterLongIdle = await rateLimiter.consume({
      clientId,
      routeId,
      capacity: 5,
      refillRatePerSecond: 2,
      cost: 1,
      nowTimestampSecs: baseTime + 102
    });

    expect(resultAfterLongIdle.allowed).toBe(true);
    expect(resultAfterLongIdle.remaining).toBe(4);
  });

  // 5. TTL configuration
  test('5. Sets an appropriate TTL on the Redis key for garbage collection', async () => {
    const clientId = `${testKeyPrefix}_ttl`;
    const routeId = 'checkout';

    await rateLimiter.consume({
      clientId,
      routeId,
      capacity: 10,
      refillRatePerSecond: 1
    });

    const state = await rateLimiter.getBucketState(clientId, routeId);
    expect(state.ttl).toBeGreaterThanOrEqual(50); // Default TTL formula gives >= 60s
  });

  // 6. Concurrency Test: 100 concurrent requests against capacity 10
  test('6. Concurrency Test: Exactly 10 out of 100 concurrent requests are allowed with zero double-spending', async () => {
    const clientId = `${testKeyPrefix}_concurrency_100`;
    const routeId = 'burst_endpoint';
    const capacity = 10;
    const refillRate = 0.1; // Slow refill so 100 requests happen simultaneously
    const totalRequests = 100;

    // Dispatch 100 simultaneous concurrent asynchronous promises
    const promises = Array.from({ length: totalRequests }).map(() =>
      rateLimiter.consume({
        clientId,
        routeId,
        capacity,
        refillRatePerSecond: refillRate,
        cost: 1
      })
    );

    const results = await Promise.all(promises);

    const allowed = results.filter((r) => r.allowed);
    const rejected = results.filter((r) => !r.allowed);

    // Strict assertions: No race condition, atomic evaluation
    expect(allowed.length).toBe(10);
    expect(rejected.length).toBe(90);
    expect(allowed.length + rejected.length).toBe(100);

    // Verify all allowed requests had remaining tokens >= 0
    allowed.forEach((r) => {
      expect(r.remaining).toBeGreaterThanOrEqual(0);
      expect(r.retryAfterSeconds).toBe(0);
    });

    // Verify all rejected requests got retry timing
    rejected.forEach((r) => {
      expect(r.remaining).toBe(0);
      expect(r.retryAfterSeconds).toBeGreaterThan(0);
    });

    // Verify final state in Redis (integer tokens remaining is 0)
    const finalState = await rateLimiter.getBucketState(clientId, routeId);
    expect(Math.floor(finalState.tokens)).toBe(0);
    expect(finalState.tokens).toBeLessThan(1);
  });

  // 7. Two gateway processes sharing the same Redis key
  test('7. Two gateway instances sharing the same Redis key coordinate quota atomically', async () => {
    const clientId = `${testKeyPrefix}_multi_gateway`;
    const routeId = 'shared_route';

    // Simulate Gateway Process A and Gateway Process B
    const gatewayInstanceA = new RedisRateLimiter({ redisService });
    const gatewayInstanceB = new RedisRateLimiter({ redisService });

    const config = {
      clientId,
      routeId,
      capacity: 6,
      refillRatePerSecond: 0.1,
      cost: 1
    };

    // Gateway A consumes 3 tokens
    const a1 = await gatewayInstanceA.consume(config);
    const a2 = await gatewayInstanceA.consume(config);
    const a3 = await gatewayInstanceA.consume(config);
    expect(a3.remaining).toBe(3);

    // Gateway B consumes 3 tokens
    const b1 = await gatewayInstanceB.consume(config);
    const b2 = await gatewayInstanceB.consume(config);
    const b3 = await gatewayInstanceB.consume(config);
    expect(b3.remaining).toBe(0);

    // Now bucket has 0 tokens left across both processes
    // Gateway A tries to consume -> rejected
    const a4 = await gatewayInstanceA.consume(config);
    expect(a4.allowed).toBe(false);

    // Gateway B tries to consume -> rejected
    const b4 = await gatewayInstanceB.consume(config);
    expect(b4.allowed).toBe(false);
  });

  // 8. Redis failure handling (Fallback to in-memory)
  test('8. Handles Redis service failure gracefully using in-memory fallback', async () => {
    // Create an isolated rate limiter with a mock disconnected Redis service
    const mockDisconnectedRedis = {
      getClient: () => null,
      isConnected: false
    };

    const resilientLimiter = new RedisRateLimiter({
      redisService: mockDisconnectedRedis,
      fallbackToMemory: true
    });

    const result = await resilientLimiter.consume({
      clientId: 'offline_client',
      routeId: 'route_1',
      capacity: 5,
      refillRatePerSecond: 1
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.source).toBe('in-memory-fallback');
  });
});
