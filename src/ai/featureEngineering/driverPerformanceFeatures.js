const { clamp } = require("../utils/aiConstants");

const buildDriverPerformanceFeatures = (driver) => {
  const rides = Array.isArray(driver.rides) ? driver.rides : [];
  const rejects = Array.isArray(driver.rideRejects)
    ? driver.rideRejects
    : [];

  const totalRides = rides.length;

  const completedRides = rides.filter(
    (r) => r.status === "COMPLETED"
  ).length;

  const cancelledRides = rides.filter(
    (r) => r.status === "CANCELLED"
  ).length;

  const acceptedRides = rides.filter((r) =>
    ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"].includes(
      r.status
    )
  ).length;

  const completionRate =
    totalRides > 0
      ? completedRides / totalRides
      : 0;

  const cancellationRate =
    totalRides > 0
      ? cancelledRides / totalRides
      : 0;

  const rejectionRate =
    totalRides + rejects.length > 0
      ? rejects.length / (totalRides + rejects.length)
      : 0;

  const rating = Number(driver.averageRating || 0);

  const normalizedRating =
    rating > 0
      ? clamp(rating / 5, 0, 1)
      : 0;

  const experience = Number(driver.experience || 0);

  const experienceScore = clamp(
    experience / 10,
    0,
    1
  );

  const activityScore = clamp(
    totalRides / 100,
    0,
    1
  );

  const reliabilityScore = clamp(
    completionRate * 0.6 +
      (1 - cancellationRate) * 0.2 +
      (1 - rejectionRate) * 0.2,
    0,
    1
  );

  return {
    driverId: driver.id,
    totalRides,
    completedRides,
    acceptedRides,
    cancelledRides,
    totalRejects: rejects.length,
    completionRate,
    cancellationRate,
    rejectionRate,
    rating,
    normalizedRating,
    experience,
    experienceScore,
    activityScore,
    reliabilityScore,
    availability: driver.availability,
    status: driver.status,
    totalRatings: Number(driver.totalRatings || 0),
  };
};

const buildDriverPerformanceDataset = (drivers) =>
  drivers
    .map(buildDriverPerformanceFeatures)
    .filter((d) => d.totalRides > 0);

module.exports = {
  buildDriverPerformanceFeatures,
  buildDriverPerformanceDataset,
};
