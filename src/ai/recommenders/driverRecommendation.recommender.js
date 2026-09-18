const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  buildDriverRecommendationFeatures,
} = require("../featureEngineering/driverRecommendationFeatures");

const recommendDrivers = ({
  ride,
  drivers,
  performanceMap = new Map(),
  limit = 5,
}) => {
  if (!ride || !Array.isArray(drivers)) {
    throw new Error("ride and drivers are required");
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 5, 1),
    20,
  );

  const eligibleDrivers = drivers.filter((driver) => {
    if (driver?.status !== "APPROVED") {
      return false;
    }

    if (driver?.availability !== "AVAILABLE") {
      return false;
    }

    if (!driver?.vehicle) {
      return false;
    }

    if (driver.vehicle.status !== "APPROVED") {
      return false;
    }

    if (driver.vehicle.vehicleType !== ride.vehicleType) {
      return false;
    }

    // A driver with an active ride must never be recommended.
    if (driver.hasActiveRide === true) {
      return false;
    }

    return true;
  });

  if (!eligibleDrivers.length) {
    return {
      status: AI_STATUS.READY,
      modelVersion: AI_MODEL_VERSION,
      totalEligibleDrivers: 0,
      recommendations: [],
      reason: "NO_ELIGIBLE_DRIVERS",
    };
  }

  const locationAvailable = eligibleDrivers.some(
    (driver) =>
      driver?.latitude != null &&
      driver?.longitude != null,
  );

  const scored = eligibleDrivers.map((driver) => {
    const performance =
      performanceMap instanceof Map
        ? performanceMap.get(driver.id)
        : null;

    const features = buildDriverRecommendationFeatures({
      ride,
      driver,
      performance,
    });

    /*
     * Target model:
     * Performance 40%
     * Vehicle      25%
     * Rating       20%
     * Availability 10%
     * Location      5%
     *
     * Current schema has no live driver GPS.
     * Therefore location weight is redistributed proportionally
     * across the available non-location signals.
     */

    const baseSignals = [
      ["performanceScore", 40],
      ["vehicleMatch", 25],
      ["ratingScore", 20],
      ["availabilityScore", 10],
    ];

    const availableWeight = baseSignals.reduce(
      (total, [, weight]) => total + weight,
      0,
    );

    let score = 0;

    for (const [signal, weight] of baseSignals) {
      score +=
        features[signal] *
        ((weight / availableWeight) * 100);
    }

    if (
      features.locationSignalAvailable &&
      features.distanceScore !== null
    ) {
      score =
        score * 0.95 +
        features.distanceScore * 5;
    }

    const recommendationScore = Number(
      clamp(score, 0, 100).toFixed(2),
    );

    const reasons = [
      "VEHICLE_MATCH",
    ];

    if (features.performanceScore >= 0.8) {
      reasons.push("STRONG_PERFORMANCE");
    }

    if (features.ratingScore >= 0.8) {
      reasons.push("HIGH_RATING");
    }

    if (!features.locationSignalAvailable) {
      reasons.push("LOCATION_SIGNAL_UNAVAILABLE");
    }

    const evidenceSignals = [
      features.vehicleMatch,
      features.performanceScore,
      features.ratingScore,
      features.availabilityScore,
    ];

    const evidenceAverage =
      evidenceSignals.reduce(
        (sum, value) => sum + value,
        0,
      ) / evidenceSignals.length;

    const confidence = Number(
      clamp(
        0.5 + evidenceAverage * 0.5,
        0,
        1,
      ).toFixed(4),
    );

    return {
      driverId: driver.id,
      recommendationScore,
      distanceKm: null,
      confidence,
      reasons,
      features,
    };
  });

  scored.sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) {
      return b.recommendationScore - a.recommendationScore;
    }

    return a.driverId.localeCompare(b.driverId);
  });

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    totalEligibleDrivers: eligibleDrivers.length,
    locationSignal: locationAvailable
      ? "AVAILABLE"
      : "LOCATION_SIGNAL_UNAVAILABLE",
    recommendations: scored.slice(0, safeLimit),
  };
};

module.exports = {
  recommendDrivers,
};
