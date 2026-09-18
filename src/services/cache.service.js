const DEFAULT_TTL_MS = Number(
  process.env.CACHE_TTL_MS || 5 * 60 * 1000
);

const MAX_CACHE_ENTRIES = Number(
  process.env.CACHE_MAX_ENTRIES || 5000
);

const cache = new Map();

class CacheService {
  /**
   * Get cached value with LRU refresh
   */
  static get(key) {
    const cached = cache.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }

    // Refresh insertion order for LRU behavior
    cache.delete(key);
    cache.set(key, cached);

    return cached.data;
  }

  /**
   * Store value in cache with capacity limit
   */
  static set(key, value, ttl = DEFAULT_TTL_MS) {
    // If key already exists, delete it first to update position
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest entry (least recently used)
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl,
    });

    return value;
  }

  /**
   * Check cache exists
   */
  static has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  static delete(key) {
    cache.delete(key);
  }

  /**
   * Clear complete cache
   */
  static clearAll() {
    cache.clear();
  }

  /**
   * Clean expired entries
   */
  static cleanExpired() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of cache.entries()) {
      if (item.expiresAt <= now) {
        cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Cache statistics
   */
  static getStats() {
    return {
      entries: cache.size,
      maxEntries: MAX_CACHE_ENTRIES,
      ttl: DEFAULT_TTL_MS,
    };
  }
}

// Periodic sweep for expired cache keys (runs every 5 minutes)
const sweepTimer = setInterval(() => {
  CacheService.cleanExpired();
}, 5 * 60 * 1000);

// Ensure the sweep interval does not prevent Node process from exiting
if (sweepTimer && typeof sweepTimer.unref === "function") {
  sweepTimer.unref();
}

module.exports = CacheService;
