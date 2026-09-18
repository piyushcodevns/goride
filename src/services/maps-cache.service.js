const CacheService = require("./cache.service");

const ROUTE_CACHE_TTL =
  Number(process.env.MAPS_ROUTE_CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour

const GEOCODE_CACHE_TTL =
  Number(process.env.MAPS_GEOCODE_CACHE_TTL_MS) || 24 * 60 * 60 * 1000; // 24 hours

class MapsCacheService {
  /**
   * -----------------------------
   * Route Cache
   * -----------------------------
   */

  static getRouteKey(startLatitude, startLongitude, endLatitude, endLongitude) {
    return `maps:route:${startLatitude},${startLongitude}:${endLatitude},${endLongitude}`;
  }

  static getRoute(startLatitude, startLongitude, endLatitude, endLongitude) {
    const key = this.getRouteKey(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );

    return CacheService.get(key);
  }

  static setRoute(
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude,
    data,
  ) {
    const key = this.getRouteKey(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );

    return CacheService.set(key, data, ROUTE_CACHE_TTL);
  }

  /**
   * -----------------------------
   * Geocode Cache
   * -----------------------------
   */

  static getGeocodeKey(address) {
    return `maps:geocode:${address.toLowerCase().trim()}`;
  }

  static getGeocode(address) {
    return CacheService.get(this.getGeocodeKey(address));
  }

  static setGeocode(address, data) {
    return CacheService.set(
      this.getGeocodeKey(address),
      data,
      GEOCODE_CACHE_TTL,
    );
  }

  /**
   * -----------------------------
   * Reverse Geocode Cache
   * -----------------------------
   */

  static getReverseGeocodeKey(latitude, longitude) {
    return `maps:reverse:${latitude},${longitude}`;
  }

  static getReverseGeocode(latitude, longitude) {
    return CacheService.get(this.getReverseGeocodeKey(latitude, longitude));
  }

  static setReverseGeocode(latitude, longitude, data) {
    return CacheService.set(
      this.getReverseGeocodeKey(latitude, longitude),
      data,
      GEOCODE_CACHE_TTL,
    );
  }

  /**
   * -----------------------------
   * Clear Maps Cache
   * -----------------------------
   */

  static clearAll() {
    CacheService.clearAll();
  }
}

module.exports = MapsCacheService;
