const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  mean,
  standardDeviation,
} = require("../utils/aiMath");

const MIN_OBSERVATIONS = 24;

const VALID_FARE_STATUS = "COMPLETED";

const getRealizedFare = (ride) => {
  const fare = Number(ride.finalFare);

  if (!Number.isFinite(fare) || fare < 0) {
    return null;
  }

  return fare;
};

const buildFareIntelligence = ({
  rides,
  demandPrediction = null,
}) => {
  if (!Array.isArray(rides)) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INVALID_FARE_HISTORY",
      observations: 0,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const validRides = rides.filter((ride) => {
    const fare = getRealizedFare(ride);
    const distance = Number(ride.distance);

    return (
      ride.status === VALID_FARE_STATUS &&
      fare !== null &&
      Number.isFinite(distance) &&
      distance > 0
    );
  });

  if (validRides.length < MIN_OBSERVATIONS) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INSUFFICIENT_VALID_FARE_HISTORY",
      observations: validRides.length,
      requiredMinimumObservations: MIN_OBSERVATIONS,
    };
  }

  const fares = validRides.map(getRealizedFare);

  const distances = validRides.map((ride) =>
    Number(ride.distance),
  );

  const farePerKm = validRides.map((ride) =>
    getRealizedFare(ride) / Number(ride.distance),
  );

  const averageFare = mean(fares);
  const fareStdDev = standardDeviation(fares);
  const averageDistance = mean(distances);
  const averageFarePerKm = mean(farePerKm);

  const sortedRides = [...validRides].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime(),
  );

  const midpoint = Math.floor(sortedRides.length / 2);

  const olderRides = sortedRides.slice(0, midpoint);
  const recentRides = sortedRides.slice(midpoint);

  const olderAverageFare = mean(
    olderRides.map(getRealizedFare),
  );

  const recentAverageFare = mean(
    recentRides.map(getRealizedFare),
  );

  const fareTrendPercent =
    olderAverageFare > 0
      ? ((recentAverageFare - olderAverageFare) /
          olderAverageFare) *
        100
      : 0;

  let fareTrend = "STABLE";

  if (fareTrendPercent >= 10) {
    fareTrend = "INCREASING";
  } else if (fareTrendPercent <= -10) {
    fareTrend = "DECREASING";
  }

  let demandPressure = "UNKNOWN";

  if (
    demandPrediction &&
    demandPrediction.status === AI_STATUS.READY
  ) {
    const predicted = Number(
      demandPrediction.predictedDemand,
    );

    const baseline = Number(
      demandPrediction.baselineDemand,
    );

    if (
      Number.isFinite(predicted) &&
      Number.isFinite(baseline) &&
      baseline > 0
    ) {
      const ratio = predicted / baseline;

      if (ratio >= 1.5) {
        demandPressure = "HIGH";
      } else if (ratio >= 1.15) {
        demandPressure = "MEDIUM";
      } else if (ratio < 0.85) {
        demandPressure = "LOW";
      } else {
        demandPressure = "NORMAL";
      }
    }
  }

  const coefficientOfVariation =
    averageFare > 0
      ? fareStdDev / averageFare
      : 1;

  const stabilityConfidence = clamp(
    1 - coefficientOfVariation,
    0,
    1,
  );

  const demandConfidence =
    demandPrediction &&
    demandPrediction.status === AI_STATUS.READY
      ? clamp(
          Number(demandPrediction.confidence || 0),
          0,
          1,
        )
      : 0;

  const confidence = Number(
    (
      stabilityConfidence * 0.6 +
      demandConfidence * 0.4
    ).toFixed(4),
  );

  const vehicleTypeBreakdown = {};

  for (const ride of validRides) {
    const type = ride.vehicleType;
    const fare = getRealizedFare(ride);

    if (!vehicleTypeBreakdown[type]) {
      vehicleTypeBreakdown[type] = {
        observations: 0,
        totalFare: 0,
        totalDistance: 0,
      };
    }

    vehicleTypeBreakdown[type].observations += 1;
    vehicleTypeBreakdown[type].totalFare += fare;
    vehicleTypeBreakdown[type].totalDistance +=
      Number(ride.distance);
  }

  for (const type of Object.keys(vehicleTypeBreakdown)) {
    const item = vehicleTypeBreakdown[type];

    item.averageFare = Number(
      (item.totalFare / item.observations).toFixed(2),
    );

    item.averageDistance = Number(
      (item.totalDistance / item.observations).toFixed(2),
    );

    item.averageFarePerKm =
      item.totalDistance > 0
        ? Number(
            (
              item.totalFare /
              item.totalDistance
            ).toFixed(2),
          )
        : 0;

    delete item.totalFare;
    delete item.totalDistance;
  }

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,

    observations: validRides.length,
    requiredMinimumObservations: MIN_OBSERVATIONS,

    target: "REALIZED_COMPLETED_RIDE_FARE",

    features: [
      "finalFare",
      "distance",
      "vehicleType",
      "createdAt",
      "historicalDemandSignal",
    ],

    metrics: {
      averageFare: Number(
        averageFare.toFixed(2),
      ),
      fareStdDev: Number(
        fareStdDev.toFixed(2),
      ),
      averageDistance: Number(
        averageDistance.toFixed(2),
      ),
      averageFarePerKm: Number(
        averageFarePerKm.toFixed(2),
      ),
      recentAverageFare: Number(
        recentAverageFare.toFixed(2),
      ),
      olderAverageFare: Number(
        olderAverageFare.toFixed(2),
      ),
    },

    fareTrend,
    fareTrendPercent: Number(
      fareTrendPercent.toFixed(2),
    ),

    demandPressure,

    vehicleTypeBreakdown,

    confidence,
    confidenceType: "HEURISTIC",

    intelligenceType:
      "STATISTICAL_FARE_INTELLIGENCE",

    pricingAdjustmentAllowed: false,
  };
};

module.exports = {
  buildFareIntelligence,
};
