class PricingRulesEngine {
  static evaluate({
    rideDate = new Date(),
    isAirportRide = false,
    isRaining = false,
    isEventRide = false,
  } = {}) {
    const date = rideDate instanceof Date ? rideDate : new Date(rideDate);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid ride date.");
    }

    const isPeakHour = this.isPeakHour(date);
    const isNightRide = this.isNightRide(date);
    const isWeekend = this.isWeekend(date);

    const appliedRules = [];

    if (isPeakHour) appliedRules.push("PEAK_HOUR");
    if (isNightRide) appliedRules.push("NIGHT_RIDE");
    if (isWeekend) appliedRules.push("WEEKEND");
    if (isAirportRide) appliedRules.push("AIRPORT");
    if (isRaining) appliedRules.push("RAIN");
    if (isEventRide) appliedRules.push("EVENT");

    return {
      isPeakHour,
      isNightRide,
      isWeekend,
      isAirportRide,
      isRaining,
      isEventRide,
      appliedRules,
      evaluatedAt: date.toISOString(),
    };
  }

  static isPeakHour(date) {
    const hour = date.getHours();

    return (
      (hour >= 7 && hour < 10) ||
      (hour >= 17 && hour < 21)
    );
  }

  static isNightRide(date) {
    const hour = date.getHours();

    return hour >= 22 || hour < 6;
  }

  static isWeekend(date) {
    const day = date.getDay();

    return day === 0 || day === 6;
  }
}

module.exports = PricingRulesEngine;