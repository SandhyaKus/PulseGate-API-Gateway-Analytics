const TokenBucket = require('../src/services/tokenBucket');
const {
  validateTokenBucketConfig,
  roundTokens,
  calculateRetryAfterSeconds
} = require('../src/utils/rateLimitUtils');

describe('Day 2: Token Bucket Rate Limiting Algorithm', () => {
  let mockTime = 1000000; // Base deterministic time in ms
  const deterministicClock = () => mockTime;

  beforeEach(() => {
    mockTime = 1000000;
  });

  // Test Case 1: New bucket starts full
  test('1. New bucket starts full', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    const state = bucket.getState();
    expect(state.capacity).toBe(10);
    expect(state.currentTokens).toBe(10);
    expect(state.lastRefillTimestamp).toBe(mockTime);
  });

  // Test Case 2: One request consumes one token
  test('2. One request consumes one token', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    const result = bucket.consume(1);

    expect(result).toEqual({
      allowed: true,
      limit: 10,
      remaining: 9,
      retryAfterSeconds: 0
    });
    expect(bucket.getState().currentTokens).toBe(9);
  });

  // Test Case 3: Ten requests exhaust capacity
  test('3. Ten requests exhaust capacity', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    for (let i = 1; i <= 10; i++) {
      const result = bucket.consume(1);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - i);
      expect(result.retryAfterSeconds).toBe(0);
    }

    expect(bucket.getState().currentTokens).toBe(0);
  });

  // Test Case 4: Eleventh immediate request is rejected
  test('4. Eleventh immediate request is rejected', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    // Exhaust 10 tokens at current time
    for (let i = 0; i < 10; i++) {
      bucket.consume(1);
    }

    // 11th request at same instant
    const rejection = bucket.consume(1);

    expect(rejection).toEqual({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfterSeconds: 1
    });
  });

  // Test Case 5: Tokens refill after elapsed time
  test('5. Tokens refill after elapsed time', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 2, // 2 tokens per second
      clock: deterministicClock
    });

    // Exhaust bucket
    for (let i = 0; i < 10; i++) {
      bucket.consume(1);
    }
    expect(bucket.getState().currentTokens).toBe(0);

    // Advance time by 3 seconds (should add 3 * 2 = 6 tokens)
    mockTime += 3000;

    const result = bucket.consume(1);
    expect(result.allowed).toBe(true);
    // 6 refilled - 1 consumed = 5 remaining
    expect(result.remaining).toBe(5);
    expect(bucket.getState().currentTokens).toBe(5);
  });

  // Test Case 6: Refill never exceeds capacity
  test('6. Refill never exceeds capacity', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 5,
      clock: deterministicClock
    });

    // Consume 2 tokens (8 remaining)
    bucket.consume(2);
    expect(bucket.getState().currentTokens).toBe(8);

    // Advance time by 100 seconds (would generate 500 tokens if uncapped)
    mockTime += 100000;

    const result = bucket.consume(1);
    // Capacity is capped at 10, minus 1 consumed = 9 remaining
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(bucket.getState().currentTokens).toBe(9);
  });

  // Test Case 7: Retry time is calculated correctly
  test('7. Retry time is calculated correctly', () => {
    const bucket = new TokenBucket({
      capacity: 5,
      refillRatePerSecond: 0.5, // 1 token every 2 seconds
      clock: deterministicClock
    });

    // Exhaust all 5 tokens
    for (let i = 0; i < 5; i++) {
      bucket.consume(1);
    }

    // Need 1 token: deficit = 1, rate = 0.5 -> ceil(1 / 0.5) = 2 seconds
    const rejection1 = bucket.consume(1);
    expect(rejection1.allowed).toBe(false);
    expect(rejection1.retryAfterSeconds).toBe(2);

    // Need 3 tokens: deficit = 3, rate = 0.5 -> ceil(3 / 0.5) = 6 seconds
    const rejection2 = bucket.consume(3);
    expect(rejection2.allowed).toBe(false);
    expect(rejection2.retryAfterSeconds).toBe(6);
  });

  // Test Case 8: Invalid configurations are rejected
  test('8. Invalid configurations are rejected', () => {
    // Non-positive capacity
    expect(() => new TokenBucket({ capacity: 0, refillRatePerSecond: 1 }))
      .toThrow(TypeError);
    expect(() => new TokenBucket({ capacity: -5, refillRatePerSecond: 1 }))
      .toThrow(TypeError);
    expect(() => new TokenBucket({ capacity: 'ten', refillRatePerSecond: 1 }))
      .toThrow(TypeError);

    // Non-positive refill rate
    expect(() => new TokenBucket({ capacity: 10, refillRatePerSecond: 0 }))
      .toThrow(TypeError);
    expect(() => new TokenBucket({ capacity: 10, refillRatePerSecond: -2 }))
      .toThrow(TypeError);
    expect(() => new TokenBucket({ capacity: 10, refillRatePerSecond: NaN }))
      .toThrow(TypeError);

    // Invalid clock
    expect(() => new TokenBucket({ capacity: 10, refillRatePerSecond: 1, clock: 'not-a-fn' }))
      .toThrow(TypeError);

    // Invalid consume cost
    const validBucket = new TokenBucket({ capacity: 10, refillRatePerSecond: 1 });
    expect(() => validBucket.consume(0)).toThrow(TypeError);
    expect(() => validBucket.consume(-1)).toThrow(TypeError);
    expect(() => validBucket.consume('invalid')).toThrow(TypeError);
  });

  // Test Case 9: Fractional refill is handled correctly
  test('9. Fractional refill is handled correctly', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 2, // 2 tokens/sec = 0.002 tokens/ms
      clock: deterministicClock
    });

    // Exhaust tokens
    for (let i = 0; i < 10; i++) {
      bucket.consume(1);
    }
    expect(bucket.getState().currentTokens).toBe(0);

    // Advance 250ms -> 0.25s * 2 = 0.5 tokens refilled
    mockTime += 250;

    // Consuming 1 token requires 0.5 more tokens
    const rejection = bucket.consume(1);
    expect(rejection.allowed).toBe(false);
    expect(rejection.remaining).toBe(0); // Math.floor(0.5) = 0
    expect(bucket.getState().currentTokens).toBe(0.5);

    // Advance another 250ms -> 0.5 + (0.25 * 2) = 1.0 token total
    mockTime += 250;
    const allowed = bucket.consume(1);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(0);
    expect(bucket.getState().currentTokens).toBe(0);
  });

  // Additional Edge Cases
  test('handles multi-token request costs', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    const res1 = bucket.consume(4);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(6);

    const res2 = bucket.consume(4);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(2);

    // Only 2 remaining, asking for 3
    const res3 = bucket.consume(3);
    expect(res3.allowed).toBe(false);
    expect(res3.remaining).toBe(2);
    expect(res3.retryAfterSeconds).toBe(1);
  });

  test('guards against clock drift / backwards timestamps', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    bucket.consume(5); // 5 tokens left
    expect(bucket.getState().currentTokens).toBe(5);

    // Simulate clock skew / backwards time
    mockTime -= 5000;
    const res = bucket.consume(1);

    expect(res.allowed).toBe(true);
    // Should not lose tokens or create negative elapsed time
    expect(res.remaining).toBe(4);
  });

  test('reset restores capacity cleanly', () => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 1,
      clock: deterministicClock
    });

    for (let i = 0; i < 10; i++) {
      bucket.consume(1);
    }
    expect(bucket.getState().currentTokens).toBe(0);

    bucket.reset();
    expect(bucket.getState().currentTokens).toBe(10);
  });
});

