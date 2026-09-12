const {
  AI_MODEL_VERSION,
  AI_STATUS,
  clamp,
} = require("../utils/aiConstants");

const {
  mean,
  standardDeviation,
  zScore,
} = require("../utils/aiMath");

const detectRideAnomalies = (rides) => {
  if (!Array.isArray(rides) || rides.length < 10) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INSUFFICIENT_RIDE_HISTORY",
      observations: Array.isArray(rides) ? rides.length : 0,
      requiredMinimumObservations: 10,
      anomalies: [],
    };
  }

  const distances = rides
    .map((ride) => Number(ride.distance || 0))
    .filter(Number.isFinite);

  const fares = rides
    .map((ride) =>
      Number(ride.finalFare ?? ride.estimatedFare ?? 0),
    )
    .filter(Number.isFinite);

  const distanceMean = mean(distances);
  const distanceStdDev = standardDeviation(distances);

  const fareMean = mean(fares);
  const fareStdDev = standardDeviation(fares);

  const anomalies = [];

  for (const ride of rides) {
    const distance = Number(ride.distance || 0);
    const fare = Number(
      ride.finalFare ?? ride.estimatedFare ?? 0,
    );

    const distanceZ = zScore(distance, distances);
    const fareZ = zScore(fare, fares);

    const reasons = [];
    let anomalyScore = 0;

    if (Math.abs(distanceZ) >= 3) {
      anomalyScore += 50;
      reasons.push("UNUSUAL_DISTANCE");
    }

    if (Math.abs(fareZ) >= 3) {
      anomalyScore += 50;
      reasons.push("UNUSUAL_FARE");
    }

    if (ride.status === "CANCELLED") {
      const cancellationRatio =
        rides.filter(
          (item) => item.status === "CANCELLED",
        ).length / rides.length;

      if (cancellationRatio >= 0.5) {
        anomalyScore += 25;
        reasons.push("HIGH_CANCELLATION_PATTERN");
      }
    }

    if (anomalyScore > 0) {
      anomalies.push({
        rideId: ride.id,
        userId: ride.userId,
        driverId: ride.driverId,
        anomalyScore: Number(
          clamp(anomalyScore, 0, 100).toFixed(2),
        ),
        reasons,
        metrics: {
          distance,
          fare,
          distanceZScore: Number(distanceZ.toFixed(4)),
          fareZScore: Number(fareZ.toFixed(4)),
        },
      });
    }
  }

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    observations: rides.length,
    statistics: {
      distanceMean: Number(distanceMean.toFixed(2)),
      distanceStdDev: Number(distanceStdDev.toFixed(2)),
      fareMean: Number(fareMean.toFixed(2)),
      fareStdDev: Number(fareStdDev.toFixed(2)),
    },
    anomalies: anomalies.sort(
      (a, b) => b.anomalyScore - a.anomalyScore,
    ),
  };
};

const detectPaymentAnomalies = (payments) => {
  if (!Array.isArray(payments) || payments.length < 10) {
    return {
      status: AI_STATUS.INSUFFICIENT_DATA,
      modelVersion: AI_MODEL_VERSION,
      reason: "INSUFFICIENT_PAYMENT_HISTORY",
      observations: Array.isArray(payments)
        ? payments.length
        : 0,
      requiredMinimumObservations: 10,
      anomalies: [],
    };
  }

  const amounts = payments
    .map((payment) => Number(payment.amount || 0))
    .filter(Number.isFinite);

  const anomalies = [];

  for (const payment of payments) {
    const amount = Number(payment.amount || 0);
    const amountZ = zScore(amount, amounts);

    const reasons = [];
    let score = 0;

    if (Math.abs(amountZ) >= 3) {
      score += 70;
      reasons.push("UNUSUAL_PAYMENT_AMOUNT");
    }

    if (payment.status === "FAILED") {
      score += 20;
      reasons.push("FAILED_PAYMENT");
    }

    if (
      payment.transactionId &&
      payment.status !== "SUCCESS"
    ) {
      score += 10;
      reasons.push("TRANSACTION_STATUS_MISMATCH");
    }

    if (score > 0) {
      anomalies.push({
        paymentId: payment.id,
        userId: payment.userId,
        rideId: payment.rideId,
        anomalyScore: Number(
          clamp(score, 0, 100).toFixed(2),
        ),
        reasons,
        amount,
        amountZScore: Number(amountZ.toFixed(4)),
      });
    }
  }

  return {
    status: AI_STATUS.READY,
    modelVersion: AI_MODEL_VERSION,
    observations: payments.length,
    anomalies: anomalies.sort(
      (a, b) => b.anomalyScore - a.anomalyScore,
    ),
  };
};

module.exports = {
  detectRideAnomalies,
  detectPaymentAnomalies,
};
