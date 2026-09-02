class PricingRulesEngine {
  /**
   * Enterprise Pricing Rules Engine
   *
   * This class is responsible ONLY for deciding
   * which pricing rules are applicable.
   *
   * It NEVER performs fare calculation.
   */

  static evaluate({
    rideDate = new Date(),

    isAirportRide = false,
    isPeakHour = false,
    isNightRide = false,
    isRaining = false,
    isEventRide = false,
  } = {}) {
    const date = rideDate instanceof Date
      ? rideDate
      : new Date(rideDate);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid ride date.");
    }

    const appliedRules = [];

    const weekend = this.isWeekend(date);

    if (isPeakHour) {
      appliedRules.push("PEAK_HOUR");
    }

    if (isNightRide) {
      appliedRules.push("NIGHT_RIDE");
    }

    if (weekend) {
      appliedRules.push("WEEKEND");
    }

    if (isAirportRide) {
      appliedRules.push("AIRPORT");
    }

    if (isRaining) {
      appliedRules.push("RAIN");
    }

    if (isEventRide) {
      appliedRules.push("EVENT");
    }

    return {
      isPeakHour,
      isNightRide,
      isWeekend: weekend,
      isAirportRide,
      isRaining,
      isEventRide,
      appliedRules,
      evaluatedAt: date.toISOString(),
    };
  }

  static isWeekend(date) {
    const day = date.getDay();

    return day === 0 || day === 6;
  }
}

module.exports = PricingRulesEngine;