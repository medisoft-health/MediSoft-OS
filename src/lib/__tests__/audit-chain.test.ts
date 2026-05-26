import { describe, expect, it } from "vitest";
import { computeRowHash, GENESIS_HASH } from "@/lib/audit-chain";

/**
 * Tests for the tamper-evident hash chain.
 *
 * These are pure-function tests — no DB needed. They verify that:
 *   1) Hash output is deterministic
 *   2) Changing any field changes the hash
 *   3) Chain links are order-dependent
 *   4) Genesis hash is the expected sentinel
 */

const ROW_1 = {
  id: 1,
  actorId: "user-abc",
  action: "patient.create",
  resourceType: "patient",
  resourceId: "42",
  patientId: 42,
  metadata: { firstName: "Ahmed", lastName: "Mostafa" },
  ipAddress: "10.0.0.1",
  createdAt: new Date("2026-01-15T10:30:00Z"),
};

const ROW_2 = {
  id: 2,
  actorId: "user-abc",
  action: "vitals.record",
  resourceType: "vital",
  resourceId: "v-001",
  patientId: 42,
  metadata: { bp: "120/80" },
  ipAddress: "10.0.0.1",
  createdAt: new Date("2026-01-15T10:31:00Z"),
};

describe("GENESIS_HASH", () => {
  it("is 64 zeros (SHA-256 hex length)", () => {
    expect(GENESIS_HASH).toBe("0".repeat(64));
    expect(GENESIS_HASH.length).toBe(64);
  });
});

describe("computeRowHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = computeRowHash(GENESIS_HASH, ROW_1);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs produce the same hash", () => {
    const a = computeRowHash(GENESIS_HASH, ROW_1);
    const b = computeRowHash(GENESIS_HASH, ROW_1);
    expect(a).toBe(b);
  });

  it("changes when any content field changes", () => {
    const baseline = computeRowHash(GENESIS_HASH, ROW_1);

    // Change action
    expect(
      computeRowHash(GENESIS_HASH, { ...ROW_1, action: "patient.update" }),
    ).not.toBe(baseline);

    // Change actorId
    expect(
      computeRowHash(GENESIS_HASH, { ...ROW_1, actorId: "user-xyz" }),
    ).not.toBe(baseline);

    // Change metadata
    expect(
      computeRowHash(GENESIS_HASH, { ...ROW_1, metadata: { firstName: "Layla" } }),
    ).not.toBe(baseline);

    // Change id
    expect(
      computeRowHash(GENESIS_HASH, { ...ROW_1, id: 999 }),
    ).not.toBe(baseline);

    // Change createdAt
    expect(
      computeRowHash(GENESIS_HASH, {
        ...ROW_1,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      }),
    ).not.toBe(baseline);

    // Change IP
    expect(
      computeRowHash(GENESIS_HASH, { ...ROW_1, ipAddress: "192.168.1.1" }),
    ).not.toBe(baseline);
  });

  it("changes when the previousHash changes (chain sensitivity)", () => {
    const withGenesis = computeRowHash(GENESIS_HASH, ROW_1);
    const withOtherPrev = computeRowHash("a".repeat(64), ROW_1);
    expect(withGenesis).not.toBe(withOtherPrev);
  });

  it("handles null fields deterministically", () => {
    const rowWithNulls = {
      ...ROW_1,
      actorId: null,
      resourceId: null,
      patientId: null,
      metadata: null,
      ipAddress: null,
    };
    const a = computeRowHash(GENESIS_HASH, rowWithNulls);
    const b = computeRowHash(GENESIS_HASH, rowWithNulls);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("chain linking", () => {
  it("two rows form a valid chain when linked", () => {
    const hash1 = computeRowHash(GENESIS_HASH, ROW_1);
    const hash2 = computeRowHash(hash1, ROW_2);

    // Both are valid hex
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash2).toMatch(/^[0-9a-f]{64}$/);

    // They're different (different content)
    expect(hash1).not.toBe(hash2);

    // Recomputing with the correct previousHash gives the same result
    expect(computeRowHash(hash1, ROW_2)).toBe(hash2);

    // Using the WRONG previousHash gives a different result — tamper detected
    expect(computeRowHash(GENESIS_HASH, ROW_2)).not.toBe(hash2);
  });

  it("swapping row order changes the chain hashes", () => {
    // Forward order: genesis → ROW_1 → ROW_2
    const h1_fwd = computeRowHash(GENESIS_HASH, ROW_1);
    const h2_fwd = computeRowHash(h1_fwd, ROW_2);

    // Reverse order: genesis → ROW_2 → ROW_1
    const h1_rev = computeRowHash(GENESIS_HASH, ROW_2);
    const h2_rev = computeRowHash(h1_rev, ROW_1);

    // Neither hash pair matches — order matters
    expect(h1_fwd).not.toBe(h1_rev);
    expect(h2_fwd).not.toBe(h2_rev);
  });
});

describe("metadata serialization stability", () => {
  it("produces the same hash regardless of key insertion order", () => {
    const meta1 = { z: "last", a: "first", m: "middle" };
    const meta2 = { a: "first", m: "middle", z: "last" };

    const h1 = computeRowHash(GENESIS_HASH, { ...ROW_1, metadata: meta1 });
    const h2 = computeRowHash(GENESIS_HASH, { ...ROW_1, metadata: meta2 });
    expect(h1).toBe(h2);
  });
});
