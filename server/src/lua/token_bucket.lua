-- PulseGate Atomic Token Bucket Rate Limiter
-- Keys:
--   KEYS[1]: Rate limit hash key (e.g. pg:ratelimit:{client_id}:{route_id})
-- Arguments:
--   ARGV[1]: capacity (number, maximum tokens)
--   ARGV[2]: refill_rate_per_sec (number, tokens refilled per second)
--   ARGV[3]: cost (number, tokens required for this request)
--   ARGV[4]: now_timestamp_secs (number, current timestamp in float seconds)
--   ARGV[5]: ttl_seconds (number, expiration time for the key)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

-- 1. Fetch current bucket state from Redis
local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local current_tokens = capacity
local last_updated = now

if data[1] and data[2] then
    current_tokens = tonumber(data[1])
    last_updated = tonumber(data[2])
end

-- 2. Calculate elapsed time and refilled tokens
local elapsed = math.max(0, now - last_updated)
local refilled_tokens = math.min(capacity, current_tokens + (elapsed * refill_rate))

-- 3. Quota Evaluation
local allowed = 0
local remaining = 0
local retry_after = 0

if refilled_tokens >= cost then
    -- Request Allowed
    allowed = 1
    remaining = refilled_tokens - cost
    retry_after = 0
else
    -- Request Denied (HTTP 429)
    allowed = 0
    remaining = refilled_tokens
    local deficit = cost - refilled_tokens
    retry_after = math.max(1, math.ceil(deficit / refill_rate))
end

-- 4. Atomically persist updated state and refresh TTL
redis.call('HSET', key, 'tokens', tostring(remaining), 'last_updated', tostring(now))
redis.call('EXPIRE', key, ttl)

-- 5. Return: [allowed (1/0), integer_remaining, retry_after, precise_remaining_float]
return { allowed, math.floor(remaining), retry_after, tostring(remaining) }

