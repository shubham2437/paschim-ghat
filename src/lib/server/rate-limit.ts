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
 * Client identifier for rate limiting.
 *
 * On Cloudflare, `cf-connecting-ip` is set by Cloudflare's edge from the real
 * TCP connection and overwrites anything the client sends, so it can't be
 * spoofed. `x-forwarded-for` / `x-real-ip` are only used as a fallback for
 * local dev (`next dev`), where there is no Cloudflare edge in front.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : null;
  return ip || headers.get('x-real-ip') || 'anonymous';
}

/** Minimal shape of a Workers Rate Limiting binding (see wrangler.jsonc). */
interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

type EdgeLimiterName = 'ORDER_RATE_LIMITER' | 'CHECKOUT_RATE_LIMITER';

/**
 * Rate limit shared across every Cloudflare location and Worker isolate,
 * using a Workers Rate Limiting binding declared in wrangler.jsonc. The
 * in-memory limiter above only counts requests that happen to land on the
 * same isolate, so on its own it is easy to get around.
 *
 * Falls back to the in-memory limiter when the binding isn't available
 * (local `next dev`), so development keeps working.
 */
export async function edgeRateLimit(
  binding: EdgeLimiterName,
  key: string,
  fallback: { limit: number; windowMs: number }
): Promise<{ success: boolean }> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const env = getCloudflareContext().env as unknown as Partial<Record<EdgeLimiterName, RateLimitBinding>>;
    const limiter = env[binding];
    if (limiter) return await limiter.limit({ key });
  } catch {
    // Not running on Workers (e.g. `next dev`) — use the local limiter.
  }
  return rateLimit(`${binding}:${key}`, fallback);
}
