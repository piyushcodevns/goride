const pricingRepository = require("../repositories/pricing.repository");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes

const cache = new Map();

class PricingCacheService {
  static getCacheKey(city, vehicleType) {
    return `${city}:${vehicleType}`;
  }

  static async getPricingConfig(city, vehicleType) {
    const cacheKey = this.getCacheKey(city, vehicleType);

    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const pricing =
      await pricingRepository.getActivePricingByVehicle(
        city,
        vehicleType
      );

    if (!pricing) {
      return null;
    }

    cache.set(cacheKey, {
      data: pricing,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return pricing;
  }

  static clear(city, vehicleType) {
    if (!city && !vehicleType) {
      cache.clear();
      return;
    }

    const cacheKey = this.getCacheKey(city, vehicleType);

    cache.delete(cacheKey);
  }

  static clearAll() {
    cache.clear();
  }

  static getStats() {
    return {
      entries: cache.size,
      ttl: CACHE_TTL_MS,
    };
  }
}

module.exports = PricingCacheService;