/**
 * GoRide Fare Configuration
 *
 * Centralized fare rules.
 * Future:
 * - Surge pricing
 * - Discounts
 * - Coupons
 * - Dynamic pricing
 * - AI Fare Prediction
 */

const FARE_CONFIG = {
  BIKE: {
    baseFare: 20,
    perKm: 8,
    minimumFare: 40,
  },

  AUTO: {
    baseFare: 30,
    perKm: 12,
    minimumFare: 60,
  },

  CAR: {
    baseFare: 50,
    perKm: 15,
    minimumFare: 100,
  },

  SUV: {
    baseFare: 80,
    perKm: 20,
    minimumFare: 150,
  },
};

/**
 * Calculate Ride Fare
 */
const calculateFare = (vehicleType, distance) => {
  const config = FARE_CONFIG[vehicleType];

  if (!config) {
    throw new Error("Invalid vehicle type for fare calculation.");
  }

  if (typeof distance !== "number" || distance <= 0) {
    throw new Error("Distance must be greater than zero.");
  }

  const baseFare = config.baseFare;
  const distanceFare = Number((distance * config.perKm).toFixed(2));

  const subtotal = baseFare + distanceFare;

  const totalFare = Math.max(
    Math.ceil(subtotal),
    config.minimumFare
  );

  return {
    baseFare,
    distanceFare,
    subtotal,
    minimumFare: config.minimumFare,
    minimumFareApplied: totalFare === config.minimumFare,
    totalFare,
  };
};

module.exports = {
  FARE_CONFIG,
  calculateFare,
};