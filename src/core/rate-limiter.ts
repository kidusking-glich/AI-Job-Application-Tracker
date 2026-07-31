import { HttpException, HttpStatus } from '@nestjs/common';

interface RateLimiterEntry {
  count: number;
  resetAt: number;
}

/**
 * Small in-memory sliding-window rate limiter keyed by string.
 *
 * State lives in process memory only — fine for a single-instance deployment.
 * If the app is ever scaled horizontally, swap this for a Redis-backed limiter
 * without changing call sites (the API stays the same).
 */
export class RateLimiter {
  private readonly entries = new Map<string, RateLimiterEntry>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly message: string,
  ) {}

  /**
   * Throws HTTP 429 (Too Many Requests) once the key has exhausted its
   * attempts. NestJS has no built-in TooManyRequestsException, so we use
   * HttpException with HttpStatus.TOO_MANY_REQUESTS directly.
   */
  check(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry && now < entry.resetAt && entry.count >= this.maxAttempts) {
      throw new HttpException(this.message, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (entry && now >= entry.resetAt) {
      this.entries.delete(key);
    }
  }

  registerFailure(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);
    const nextCount = (entry && now < entry.resetAt ? entry.count : 0) + 1;
    this.entries.set(key, { count: nextCount, resetAt: now + this.windowMs });
  }

  clear(key: string): void {
    this.entries.delete(key);
  }
}
