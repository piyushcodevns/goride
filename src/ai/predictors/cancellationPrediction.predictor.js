const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  mean,
} = require("../utils/aiMath");

const MIN_OBSERVATIONS = 30;

const buildCancellationPrediction = ({
  rideHistory,
  vehicleType,
  distance,
  isScheduled,
} = {}) => {
  if (!Array.isArray(rideHistory)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "CANCELLATION_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_CANCELLATION_HISTORY",
      observations: 0,
      requiredMinimumObservations:
        MIN_OBSERVATIONS,
    };
  }

  const safeDistance = Number(distance);

  if (
    !Number.isFinite(safeDistance) ||
    safeDistance <= 0
  ) {
    return {
      status: AI_STATUS.BLOCKED,
      modelVersion: AI_MODEL_VERSION,
      feature: "CANCELLATION_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INVALID_DISTANCE",
      observations: rideHistory.length,
    };
  }

  const validHistory = rideHistory.filter(
    (ride) => {
      const rideDistance = Number(
        ride.distance,
      );

      return (
        Number.isFinite(rideDistance) &&
        rideDistance > 0 &&
        ride.vehicleType &&
        ride.createdAt &&
        [
          "REQUESTED",
          "ACCEPTED",
          "ARRIVED",
          "STARTED",
          "COMPLETED",
          "CANCELLED",
        ].includes(ride.status)
      );
    },
  );

  if (validHistory.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      feature: "CANCELLATION_PREDICTION",
      prediction: null,
      confidence: 0,
      reason: "INSUFFICIENT_CANCELLATION_HISTORY",
      observations: validHistory.length,
      requiredMinimumObservations:
        MIN_OBSERVATIONS,
    };
  }

  const cancelledCount =
    validHistory.filter(
      (ride) => ride.status === "CANCELLED",
    ).length;

  const overallCancellationRate =
    cancelledCount / validHistory.length;

  const vehicleHistory = validHistory.filter(
    (ride) =>
      !vehicleType ||
      ride.vehicleType === vehicleType,
  );

  const vehicleCancelledCount =
    vehicleHistory.filter(
      (ride) => ride.status === "CANCELLED",
    ).length;

  const vehicleCancellationRate =
    vehicleHistory.length > 0
      ? vehicleCancelledCount /
        vehicleHistory.length
      : overallCancellationRate;

  const distanceWindow = Math.max(
    2,
    safeDistance * 0.25,
  );

  const similarDistanceHistory =
    validHistory.filter((ride) => {
      const rideDistance = Number(
        ride.distance,
      );

      return (
        Math.abs(
          rideDistance - safeDistance,
        ) <= distanceWindow
      );
    });

  const similarDistanceRate =
    similarDistanceHistory.length > 0
      ? similarDistanceHistory.filter(
          (ride) =>
            ride.status === "CANCELLED",
        ).length /
        similarDistanceHistory.length
      : overallCancellationRate;

  const scheduledHistory =
    validHistory.filter(
      (ride) =>
        Boolean(ride.isScheduled) ===
        Boolean(isScheduled),
    );

  const scheduledRate =
    scheduledHistory.length > 0
      ? scheduledHistory.filter(
          (ride) =>
            ride.status === "CANCELLED",
        ).length /
        scheduledHistory.length
      : overallCancellationRate;

  const predictedProbability =
    mean([
      overallCancellationRate,
      vehicleCancellationRate,
      similarDistanceRate,
      scheduledRate,
    ]);

  let riskLevel = "LOW";

  if (predictedProbability >= 0.5) {
    riskLevel = "HIGH";
  } else if (predictedProbability >= 0.25) {
    riskLevel = "MEDIUM";
  }

  const sampleConfidence = clamp(
    validHistory.length / 100,
    0,
    1,
  );

  const segmentConfidence = clamp(
    (
      vehicleHistory.length +
      similarDistanceHistory.length +
      scheduledHistory.length
    ) /
      (validHistory.length * 3),
    0,
    1,
  );

  const confidence = Number(
    (
      sampleConfidence * 0.6 +
      segmentConfidence * 0.4
    ).toFixed(4),
  );

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    feature: "CANCELLATION_PREDICTION",

    target: "RIDE_FINAL_CANCELLATION_STATUS",

    prediction: Number(
      clamp(predictedProbability, 0, 1).toFixed(4),
    ),

    probabilityType:
      "HISTORICAL_CANCELLATION_RATE",

    riskLevel,

    features: [
      "vehicleType",
      "distance",
      "isScheduled",
      "scheduledFor",
      "createdAt",
    ],

    statistics: {
      overallCancellationRate:
        Number(
          overallCancellationRate.toFixed(4),
        ),
      vehicleCancellationRate:
        Number(
          vehicleCancellationRate.toFixed(4),
        ),
      similarDistanceCancellationRate:
        Number(
          similarDistanceRate.toFixed(4),
        ),
      scheduledCancellationRate:
        Number(
          scheduledRate.toFixed(4),
        ),
    },

    observations: validHistory.length,
    requiredMinimumObservations:
      MIN_OBSERVATIONS,

    confidence,
    confidenceType: "HEURISTIC",

    predictionType:
      "HISTORICAL_RATE_BASELINE",

    futureOutcomeUsedForPrediction: false,
  };
};

module.exports = {
  buildCancellationPrediction,
};
