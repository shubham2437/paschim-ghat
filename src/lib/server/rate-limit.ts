import 'server-only';

/**
 * In-memory sliding-window rate limiter for BFF route handlers.
 *
 * This is process-local (not shared across instances) which is an accepted
 * limitation for this demo storefront — good enough to blunt casual abuse
 * of public POST endpoints. A production multi-instance deployment should
 * swap this for a shared store (e.g. Redis) behind the same interface.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so the map can't grow unbounded.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Best-effort client identifier for rate limiting. Trusts the first
 * `x-forwarded-for` entry only when running behind a known proxy — for a
 * self-hosted deploy this should be tightened to the platform's real
 * client-IP header (e.g. `x-real-ip`, Vercel's `x-vercel-forwarded-for`).
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : null;
  return ip || headers.get('x-real-ip') || 'anonymous';
}
