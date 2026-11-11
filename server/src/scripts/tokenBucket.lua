-- PulseGate Redis Lua Atomic Token Bucket
-- Keys:
--   KEYS[1]: rate:{clientId}:{routeId}
-- Arguments:
--   ARGV[1]: capacity (number, maximum tokens)
--   ARGV[2]: refillRatePerSecond (number, tokens per second)
--   ARGV[3]: cost (number, tokens consumed for this request, default 1)
--   ARGV[4]: clientTimestampSecs (optional number, 0 to use Redis server TIME)
--   ARGV[5]: ttlSeconds (number, key expiration time in seconds)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local passed_timestamp = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

-- 1. Determine current timestamp using Redis server TIME or passed timestamp
local now = 0
if passed_timestamp and passed_timestamp > 0 then
    now = passed_timestamp
else
    local server_time = redis.call('TIME')
    -- server_time[1] is unix epoch in seconds, server_time[2] is microseconds
    now = tonumber(server_time[1]) + (tonumber(server_time[2]) / 1000000)
end

-- 2. Read existing bucket state
local data = redis.call('HMGET', key, 'tokens', 'lastRefillTimestamp')
local current_tokens = capacity
local last_refill = now

if data[1] and data[2] then
    current_tokens = tonumber(data[1])
    last_refill = tonumber(data[2])
end

-- 3. Calculate elapsed time and continuous token replenishment
local elapsed = math.max(0, now - last_refill)
local refilled_tokens = math.min(capacity, current_tokens + (elapsed * refill_rate))

-- 4. Evaluate request quota
local allowed = 0
local remaining = 0
local retry_after = 0

if refilled_tokens >= cost then
    -- Allowed
    allowed = 1
    remaining = refilled_tokens - cost
    retry_after = 0
else
    -- Rejected (Quota Exceeded)
    allowed = 0
    remaining = refilled_tokens
    local deficit = cost - refilled_tokens
    retry_after = math.max(1, math.ceil(deficit / refill_rate))
end

-- 5. Atomically update Redis state
redis.call('HSET', key, 'tokens', tostring(remaining), 'lastRefillTimestamp', tostring(now))

-- 6. Set TTL to reclaim memory when idle
if ttl and ttl > 0 then
    redis.call('EXPIRE', key, ttl)
end

-- 7. Return structured array: [allowed (1 or 0), integer_remaining, retry_after, float_remaining_str]
return { allowed, math.floor(remaining), retry_after, tostring(remaining) }

