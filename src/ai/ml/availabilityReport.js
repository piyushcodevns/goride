const prisma = require("../../config/prisma");
const { DATASET_CONTRACTS } = require("./contracts");
const { assessReadiness } = require("./readiness");
const { getDatasetSnapshot, getRange } = require("./datasetRepository");

const EMPTY_RANGE = { from: null, to: null };

const getCoverageDays = (range) => {
  if (!range.from || !range.to) return 0;
  return Number(((new Date(range.to) - new Date(range.from)) / 86400000).toFixed(4));
};

const summarize = (feature, records, range, extra = {}) => {
  const validation = {
    valid: true,
    observations: records.length,
    timeCoverageDays: getCoverageDays(range),
    ...extra,
  };
  const readiness = assessReadiness(feature, validation);
  return {
    feature,
    samples: records.length,
    timeRange: range,
    timeCoverageDays: validation.timeCoverageDays,
    status: readiness.status,
    reason: readiness.reason,
    minimumSamples: DATASET_CONTRACTS[feature]?.minimumSamples ?? null,
    minimumTimeCoverageDays: DATASET_CONTRACTS[feature]?.minimumTimeCoverageDays ?? null,
  };
};

const getAvailabilityReport = async ({ fromDate, toDate } = {}) => {
  const snapshot = await getDatasetSnapshot({ fromDate, toDate });
  const [users, drivers, vehicles, rides, completedRides, cancelledRides, reviews, payments,
    successfulPayments, coupons, couponUsages, fareAudits] = await Promise.all([
    prisma.user.count(),
    prisma.driver.count(),
    prisma.vehicle.count(),
    prisma.ride.count(),
    prisma.ride.count({ where: { status: "COMPLETED" } }),
    prisma.ride.count({ where: { status: "CANCELLED" } }),
    prisma.rideReview.count(),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.coupon.count(),
    prisma.couponUsage.count(),
    prisma.fareAudit.count(),
  ]);

  const rideRange = snapshot.ranges.rides;
  const completed = snapshot.rides.filter((ride) => ride.status === "COMPLETED");
  const cancelled = snapshot.rides.filter((ride) => ride.status === "CANCELLED");
  const vehicleTypes = [...new Set(snapshot.rides.map((ride) => ride.vehicleType))];
  const driversWithRides = new Set(snapshot.rides.map((ride) => ride.driverId).filter(Boolean));
  const rideHours = new Set(snapshot.rides.map((ride) => new Date(ride.createdAt).getUTCHours()));
  const rideDays = new Set(snapshot.rides.map((ride) => new Date(ride.createdAt).toISOString().slice(0, 10)));

  return {
    generatedAt: new Date().toISOString(),
    source: "PostgreSQL via Prisma read-only queries",
    counts: {
      users, drivers, vehicles, rides, completedRides, cancelledRides, reviews,
      payments, successfulPayments, coupons, couponUsages, fareAudits,
    },
    coverage: {
      historicalRange: rideRange,
      dailyRideCoverage: rideDays.size,
      hourlyRideCoverage: rideHours.size,
      vehicleTypes,
      driversWithRides: driversWithRides.size,
      completedRideRange: getRange(completed),
      cancelledRideRange: getRange(cancelled),
      paymentRange: snapshot.ranges.payments,
      ratingRange: snapshot.ranges.ratings,
    },
    features: {
      fare: summarize("fare", completed, getRange(completed)),
      demand: summarize("demand", snapshot.rides, rideRange),
      cancellation: summarize("cancellation", snapshot.rides, rideRange, {
        classBalance: { positive: cancelled.length, negative: snapshot.rides.length - cancelled.length },
      }),
      vehicle: summarize("vehicle", completed, getRange(completed)),
      rating: summarize("rating", snapshot.ratings, snapshot.ranges.ratings),
      revenue: summarize("revenue", snapshot.payments, snapshot.ranges.payments),
      eta: {
        feature: "eta",
        samples: 0,
        timeRange: EMPTY_RANGE,
        status: "DATA_BLOCKED",
        reason: "ACTUAL_TRIP_DURATION_NOT_PERSISTED",
      },
      weather: {
        feature: "weather",
        samples: 0,
        timeRange: EMPTY_RANGE,
        status: "DATA_BLOCKED",
        reason: "HISTORICAL_WEATHER_NOT_PERSISTED",
      },
      fraud: {
        feature: "fraud",
        samples: 0,
        timeRange: EMPTY_RANGE,
        status: "DATA_BLOCKED",
        reason: "TRUSTED_FRAUD_LABELS_NOT_PERSISTED",
      },
    },
  };
};

const formatAvailabilityReport = (report) => {
  const lines = [
    "GoRide AI/ML data availability",
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    "",
    "Feature       Samples  Coverage days  Status             Reason",
    "------------  -------  -------------  -----------------  ------------------------------",
  ];

  for (const feature of Object.values(report.features)) {
    lines.push(
      `${feature.feature.padEnd(12)}  ${String(feature.samples).padStart(7)}  ` +
      `${String(feature.timeCoverageDays ?? 0).padStart(13)}  ` +
      `${feature.status.padEnd(17)}  ${feature.reason}`,
    );
  }

  return lines.join("\n");
};

module.exports = { getAvailabilityReport, formatAvailabilityReport };
