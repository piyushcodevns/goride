const rideRepository = require("../../repositories/ride.repository");
const driverRepository = require("../../repositories/driver.repository");

const {
  getDriverHistory,
} = require("../../ai/services/aiData.service");

const {
  calculateDriverPerformanceScore,
} = require("../../ai/scoring/driverPerformance.score");

const {
  recommendDrivers,
} = require("../../ai/recommenders/driverRecommendation.recommender");

const {
  AI_MODEL_VERSION,
  AI_STATUS,
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
} = require("../../ai/utils/aiConstants");

const {
  NotFoundError,
  BadRequestError,
} = require("../../utils/AppError");

const resolveHistoryRange = ({
  fromDate,
  toDate,
} = {}) => {
  const end = toDate
    ? new Date(toDate)
    : new Date();

  if (Number.isNaN(end.getTime())) {
    throw new BadRequestError("Invalid toDate.");
  }

  const start = fromDate
    ? new Date(fromDate)
    : new Date(
        end.getTime() -
          DEFAULT_HISTORY_DAYS * 24 * 60 * 60 * 1000,
      );

  if (Number.isNaN(start.getTime())) {
    throw new BadRequestError("Invalid fromDate.");
  }

  if (start >= end) {
    throw new BadRequestError(
      "fromDate must be earlier than toDate.",
    );
  }

  const historyDays =
    (end.getTime() - start.getTime()) /
    (24 * 60 * 60 * 1000);

  if (
    historyDays < MIN_HISTORY_DAYS ||
    historyDays > MAX_HISTORY_DAYS
  ) {
    throw new BadRequestError(
      `History window must be between ${MIN_HISTORY_DAYS} and ${MAX_HISTORY_DAYS} days.`,
    );
  }

  return {
    fromDate: start,
    toDate: end,
  };
};

const recommendDriversForRide = async ({
  rideId,
  limit = 5,
  fromDate,
  toDate,
} = {}) => {
  if (!rideId) {
    throw new BadRequestError("rideId is required.");
  }

  const ride = await rideRepository.getRideById(rideId);

  if (!ride) {
    throw new NotFoundError("Ride not found.");
  }

  if (ride.status !== "REQUESTED") {
    throw new BadRequestError(
      "Driver recommendations are available only for requested rides.",
    );
  }

  if (ride.driverId) {
    throw new BadRequestError(
      "Ride already has a driver assigned.",
    );
  }

  const eligibleDrivers =
    await driverRepository.getEligibleDriversForRecommendation(
      ride.vehicleType,
    );

  if (!eligibleDrivers.length) {
    return {
      status: AI_STATUS.READY,
      modelVersion: AI_MODEL_VERSION,
      rideId: ride.id,
      totalEligibleDrivers: 0,
      recommendations: [],
      reason: "NO_ELIGIBLE_DRIVERS",
    };
  }

  const range = resolveHistoryRange({
    fromDate,
    toDate,
  });

  const driverHistory =
    await getDriverHistory(range);

  const performanceMap = new Map();

  for (const driver of driverHistory) {
    const performance =
      calculateDriverPerformanceScore(driver);

    performanceMap.set(
      driver.id,
      performance,
    );
  }

  const result = recommendDrivers({
    ride,
    drivers: eligibleDrivers,
    performanceMap,
    limit,
  });

  return {
    ...result,
    rideId: ride.id,
    fromDate: range.fromDate.toISOString(),
    toDate: range.toDate.toISOString(),
  };
};

module.exports = {
  recommendDriversForRide,
  resolveHistoryRange,
};
