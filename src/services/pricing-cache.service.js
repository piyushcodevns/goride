const pricingRepository = require("../repositories/pricing.repository");
const CacheService = require("./cache.service");

class PricingCacheService {
  /**
   * -----------------------------
   * Pricing Cache Key
   * -----------------------------
   */

  static getPricingCacheKey(city, vehicleType) {
    return `pricing:${city}:${vehicleType}`;
  }

  /**
   * -----------------------------
   * Pricing Wrapper
   * -----------------------------
   */

  static async getPricingConfig(city, vehicleType) {
    const key = this.getPricingCacheKey(city, vehicleType);

    const cached = CacheService.get(key);

    if (cached) {
      return cached;
    }

    const pricing =
      await pricingRepository.getActivePricingByVehicle(
        city,
        vehicleType
      );

    if (!pricing) {
      return null;
    }

    CacheService.set(key, pricing);

    return pricing;
  }

  /**
   * -----------------------------
   * Clear Pricing Cache
   * -----------------------------
   */

  static clear(city, vehicleType) {
    if (!city && !vehicleType) {
      CacheService.clearAll();
      return;
    }

    CacheService.delete(
      this.getPricingCacheKey(city, vehicleType)
    );
  }

  /**
   * -----------------------------
   * Cache Stats
   * -----------------------------
   */

  static getStats() {
    return CacheService.getStats();
  }
}

module.exports = PricingCacheService;