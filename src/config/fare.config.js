/**
 * GoRide Fare Configuration
 *
 * Centralized fare rules.
 * Future me:
 * - Surge pricing
 * - Discounts
 * - Coupons
 * - Dynamic pricing
 * easily add kar sakte hain.
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
    throw new Error(
      "Invalid vehicle type for fare calculation."
    );
  }

  if (!distance || distance <= 0) {
    throw new Error(
      "Distance must be greater than zero."
    );
  }

  const calculatedFare =
    config.baseFare +
    distance * config.perKm;


  return Math.max(
    Math.ceil(calculatedFare),
    config.minimumFare
  );
};


module.exports = {
  FARE_CONFIG,
  calculateFare,
};