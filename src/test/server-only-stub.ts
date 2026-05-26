/**
 * Stub for the `server-only` package, used during vitest runs.
 *
 * Real implementation throws at import time if loaded from a client
 * bundle. In tests we don't have that runtime distinction, so we
 * export nothing — the import just succeeds.
 */
export {};
