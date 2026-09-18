const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  buildDriverPerformanceFeatures,
} = require("../featureEngineering/driverPerformanceFeatures");

const MIN_RIDES = 10;

const calculateDriverPerformanceScore = (driver) => {
  const features = buildDriverPerformanceFeatures(driver);

  if (features.totalRides < MIN_RIDES) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      driverId: driver.id,
      reason: "INSUFFICIENT_DRIVER_HISTORY",
      observations: features.totalRides,
      requiredMinimumRides: MIN_RIDES,
    };
  }

  const score =
    features.reliabilityScore * 40 +
    features.normalizedRating * 30 +
    features.activityScore * 15 +
    features.experienceScore * 15;

  const normalizedScore = Number(
    clamp(score, 0, 100).toFixed(2),
  );

  let grade = "D";

  if (normalizedScore >= 90) {
    grade = "A+";
  } else if (normalizedScore >= 80) {
    grade = "A";
  } else if (normalizedScore >= 70) {
    grade = "B";
  } else if (normalizedScore >= 60) {
    grade = "C";
  }

  const confidence = clamp(
    Math.min(features.totalRides / 100, 1) * 0.7 +
      Math.min(features.totalRatings / 20, 1) * 0.3,
    0,
    1,
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    driverId: driver.id,
    score: normalizedScore,
    grade,
    confidence: Number(confidence.toFixed(4)),
    features: {
      totalRides: features.totalRides,
      completedRides: features.completedRides,
      cancelledRides: features.cancelledRides,
      rejects: features.totalRejects,
      completionRate: Number(
        features.completionRate.toFixed(4),
      ),
      cancellationRate: Number(
        features.cancellationRate.toFixed(4),
      ),
      rejectionRate: Number(
        features.rejectionRate.toFixed(4),
      ),
      rating: features.rating,
      experience: features.experience,
    },
  };
};

module.exports = {
  calculateDriverPerformanceScore,
};
