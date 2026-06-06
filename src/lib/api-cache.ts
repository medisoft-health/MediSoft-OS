/**
 * In-Memory TTL Cache for Innovation Module API Responses
 * 
 * Purpose: Reduce redundant AI calls for data that doesn't change frequently.
 * - Patient-specific data (zero-click, health report, predictive): 5 min TTL
 * - Population data (collective intelligence): 15 min TTL
 * - Athlete predictions: 10 min TTL (training data changes slowly)
 * - Smart pharmacy: 3 min TTL (prices/availability change faster)
 * 
 * This is a simple server-side cache. For production scale, consider Redis.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxEntries = 500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expiredEntries++;
      else validEntries++;
    }
    return { totalEntries: this.cache.size, validEntries, expiredEntries, maxEntries: this.maxEntries };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}

// Singleton instance
export const apiCache = new APICache();

// TTL constants (in seconds)
export const CACHE_TTL = {
  ZERO_CLICK: 5 * 60,
  PATIENT_REPORT: 5 * 60,
  COLLECTIVE: 15 * 60,
  ATHLETE_PREDICTION: 10 * 60,
  PREDICTIVE_HEALTH: 5 * 60,
  SMART_PHARMACY: 3 * 60,
} as const;

// Cache key generators
export const cacheKey = {
  zeroClick: (patientId: number) => `zero-click:${patientId}`,
  patientReport: (patientId: number) => `patient-report:${patientId}`,
  collective: () => `collective:global`,
  athletePrediction: (name: string, sport: string) => `athlete:${name}:${sport}`,
  predictiveHealth: (patientId: number) => `predictive:${patientId}`,
  smartPharmacy: (prescriptionId: string) => `pharmacy:${prescriptionId}`,
};

// Auto-cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => { apiCache.cleanup(); }, 10 * 60 * 1000);
}
