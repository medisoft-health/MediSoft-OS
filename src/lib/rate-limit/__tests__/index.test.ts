import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  POLICIES,
  _resetForTests,
  buildRateLimitKey,
  checkRateLimit,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

const TINY: RateLimitPolicy = { id: "tiny_test", limit: 3, windowMs: 1_000 };

describe("rate-limit / in-memory store", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("allows up to `limit` requests within the window", async () => {
    const r1 = await checkRateLimit("user-1", TINY);
    const r2 = await checkRateLimit("user-1", TINY);
    const r3 = await checkRateLimit("user-1", TINY);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks the `limit + 1`th request", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit("user-2", TINY);
    const blocked = await checkRateLimit("user-2", TINY);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBeGreaterThanOrEqual(1);
  });

  it("isolates different actor keys", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit("user-A", TINY);
    const blockedA = await checkRateLimit("user-A", TINY);
    const freshB = await checkRateLimit("user-B", TINY);
    expect(blockedA.ok).toBe(false);
    expect(freshB.ok).toBe(true);
  });

  it("decrements `remaining` consistently", async () => {
    const a = await checkRateLimit("user-3", TINY);
    const b = await checkRateLimit("user-3", TINY);
    const c = await checkRateLimit("user-3", TINY);
    expect(a.remaining).toBe(2);
    expect(b.remaining).toBe(1);
    expect(c.remaining).toBe(0);
  });

  it("recovers after the window slides past", async () => {
    vi.useFakeTimers();
    try {
      const t0 = Date.now();
      vi.setSystemTime(t0);
      for (let i = 0; i < 3; i++) await checkRateLimit("user-4", TINY);
      expect((await checkRateLimit("user-4", TINY)).ok).toBe(false);

      // Slide past the window (+1.1s for safety).
      vi.setSystemTime(t0 + 1_100);
      const next = await checkRateLimit("user-4", TINY);
      expect(next.ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports `resetAt` as ms epoch", async () => {
    const before = Date.now();
    const r = await checkRateLimit("user-5", TINY);
    expect(r.resetAt).toBeGreaterThanOrEqual(before);
    expect(r.resetAt).toBeLessThanOrEqual(before + TINY.windowMs + 100);
  });
});

describe("rate-limit / policy presets", () => {
  it("ships three AI policies with sane defaults", () => {
    expect(POLICIES.AI_TRANSCRIBE.limit).toBeGreaterThan(0);
    expect(POLICIES.AI_GEMINI.limit).toBeGreaterThan(0);
    expect(POLICIES.PHARMAX_ANALYZE.limit).toBeGreaterThan(0);
    expect(POLICIES.AI_TRANSCRIBE.windowMs).toBe(60_000);
  });
});

describe("rate-limit / key builder", () => {
  it("produces a deterministic key", () => {
    expect(buildRateLimitKey("u-1", "ai_gemini")).toBe("ai_gemini:u-1");
  });

  it("separates policies for the same actor", () => {
    const a = buildRateLimitKey("u-1", "ai_gemini");
    const b = buildRateLimitKey("u-1", "ai_transcribe");
    expect(a).not.toBe(b);
  });
});
