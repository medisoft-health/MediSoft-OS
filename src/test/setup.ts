/**
 * Vitest global setup. Runs once before every test file.
 *
 * Currently a no-op besides crypto polyfill (Node ≥20 has it native).
 * Add expect-extend matchers or msw handlers here as the test suite grows.
 */

// Pin a deterministic Date.now baseline only when tests opt in via
// `vi.setSystemTime`. We don't globally freeze time — that breaks too
// many small tests.

export {};
