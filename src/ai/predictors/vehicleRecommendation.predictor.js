const { AI_MODEL_VERSION, AI_STATUS } = require("../utils/aiConstants");

const { mean } = require("../utils/aiMath");

const MIN_OBSERVATIONS = 24;

const buildVehicleRecommendation = ({ rides, requestedDistance } = {}) => {
  if (!Array.isArray(rides)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "VEHICLE_RECOMMENDATION",
      recommendation: null,
      confidence: 0,
      reason: "INVALID_VEHICLE_HISTORY",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const distance = Number(requestedDistance);

  if (!Number.isFinite(distance) || distance <= 0) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "VEHICLE_RECOMMENDATION",
      recommendation: null,
      confidence: 0,
      reason: "INVALID_REQUESTED_DISTANCE",
      observations: rides.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const validRides = rides.filter((ride) => {
    const rideDistance = Number(ride.distance);

    return (
      ride.status === "COMPLETED" &&
      Number.isFinite(rideDistance) &&
      rideDistance > 0 &&
      ride.vehicleType
    );
  });

  if (validRides.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "VEHICLE_RECOMMENDATION",
      recommendation: null,
      confidence: 0,
      reason: "INSUFFICIENT_VEHICLE_HISTORY",
      observations: validRides.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const grouped = {};

  for (const ride of validRides) {
    const type = ride.vehicleType;

    if (!grouped[type]) {
      grouped[type] = [];
    }

    grouped[type].push(ride);
  }

  const vehicleProfiles = Object.entries(grouped)
    .map(([vehicleType, vehicleRides]) => {
      const distances = vehicleRides.map((ride) => Number(ride.distance));

      const fares = vehicleRides
        .map((ride) => Number(ride.finalFare))
        .filter(Number.isFinite);

      const averageDistance = mean(distances);

      const averageFare = fares.length > 0 ? mean(fares) : null;

      const distanceDifference = Math.abs(averageDistance - distance);

      return {
        vehicleType,
        observations: vehicleRides.length,
        averageDistance: Number(averageDistance.toFixed(2)),
        averageFare:
          averageFare === null ? null : Number(averageFare.toFixed(2)),
        distanceDifference: Number(distanceDifference.toFixed(2)),
      };
    })
    .sort((a, b) => a.distanceDifference - b.distanceDifference);

  const recommendation = vehicleProfiles[0] || null;

  if (!recommendation) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "VEHICLE_RECOMMENDATION",
      recommendation: null,
      confidence: 0,
      reason: "NO_VEHICLE_PROFILE_AVAILABLE",
      observations: validRides.length,
    };
  }

  const confidence = Number(
    Math.min(1, recommendation.observations / validRides.length).toFixed(4),
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    feature: "VEHICLE_RECOMMENDATION",

    target: "HISTORICALLY_SIMILAR_COMPLETED_RIDE_VEHICLE",

    features: ["vehicleType", "distance", "finalFare", "rideStatus"],

    requestedDistance: distance,

    recommendation: {
      vehicleType: recommendation.vehicleType,
      historicalAverageDistance: recommendation.averageDistance,
      historicalAverageFare: recommendation.averageFare,
    },

    profiles: vehicleProfiles,

    observations: validRides.length,
    requiredMinimumObservations: MIN_OBSERVATIONS,

    confidence,
    confidenceType: "HEURISTIC",

    recommendationType: "HISTORICAL_DISTANCE_SIMILARITY",

    pricingAdjustmentAllowed: false,
  };
};

module.exports = {
  buildVehicleRecommendation,
};
