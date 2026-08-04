const DEFAULT_TTL_MS = Number(
  process.env.CACHE_TTL_MS || 5 * 60 * 1000
);

const cache = new Map();

class CacheService {
  /**
   * Get cached value
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

    return cached.data;
  }

  /**
   * Store value in cache
   */
  static set(key, value, ttl = DEFAULT_TTL_MS) {
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
   * Cache statistics
   */
  static getStats() {
    return {
      entries: cache.size,
      ttl: DEFAULT_TTL_MS,
    };
  }
}

module.exports = CacheService;