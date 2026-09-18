const { clamp } = require("../utils/aiConstants");

const haversineDistanceKm = (
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) => {
  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const normalizeDistanceScore = (distanceKm) => {
  if (distanceKm === null) {
    return null;
  }

  return clamp(1 - Number(distanceKm) / 20, 0, 1);
};

const buildDriverRecommendationFeatures = ({
  ride,
  driver,
  performance,
}) => {
  const vehicle = driver?.vehicle || null;

  // Current Driver schema has no live GPS fields.
  // Never fabricate driver coordinates.
  const distanceKm = null;

  const vehicleMatch =
    vehicle &&
    vehicle.status === "APPROVED" &&
    vehicle.vehicleType &&
    ride?.vehicleType &&
    vehicle.vehicleType === ride.vehicleType
      ? 1
      : 0;

  const availabilityScore =
    driver?.availability === "AVAILABLE" ? 1 : 0;

  const statusScore =
    driver?.status === "APPROVED" ? 1 : 0;

  const performanceScore = clamp(
    Number(performance?.score || 0) / 100,
    0,
    1,
  );

  const ratingScore = clamp(
    Number(driver?.averageRating || 0) / 5,
    0,
    1,
  );

  const distanceScore = normalizeDistanceScore(distanceKm);

  return {
    driverId: driver?.id,
    distanceKm,
    locationSignalAvailable: distanceKm !== null,
    vehicleMatch,
    availabilityScore,
    statusScore,
    performanceScore,
    ratingScore,
    distanceScore,
  };
};

module.exports = {
  haversineDistanceKm,
  normalizeDistanceScore,
  buildDriverRecommendationFeatures,
};
