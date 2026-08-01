/**
 * GoRide Fare Configuration
 *
 * Centralized fare rules.
 *
 * Future Ready:
 * - Surge Pricing
 * - Night Charges
 * - Rain Charges
 * - Coupons
 * - AI Dynamic Pricing
 * - Admin Controlled Pricing
 */

const FARE_CONFIG = {
  BIKE: {
    baseFare: 20,
    perKm: 8,
    perMinute: 1,
    minimumFare: 40,
  },

  AUTO: {
    baseFare: 30,
    perKm: 12,
    perMinute: 1.5,
    minimumFare: 60,
  },

  CAR: {
    baseFare: 50,
    perKm: 15,
    perMinute: 2,
    minimumFare: 100,
  },

  SUV: {
    baseFare: 80,
    perKm: 20,
    perMinute: 3,
    minimumFare: 150,
  },
};


/**
 * Common Ride Charges
 *
 * Later these can move to database.
 */
const COMMON_CHARGES = {
  bookingFee: 5,
  platformFee: 3,
  gstPercentage: 5,
};


/**
 * Calculate Base Ride Fare
 *
 * Formula:
 *
 * Base Fare
 * + Distance Fare
 * + Duration Fare
 *
 */
const calculateFare = (vehicleType, distance, duration = 0) => {

  const config = FARE_CONFIG[vehicleType];

  if (!config) {
    throw new Error("Invalid vehicle type for fare calculation.");
  }


  if (
    typeof distance !== "number" ||
    distance <= 0
  ) {
    throw new Error("Distance must be greater than zero.");
  }


  if (
    typeof duration !== "number" ||
    duration < 0
  ) {
    throw new Error("Duration must be a valid number.");
  }


  const baseFare = config.baseFare;


  const distanceFare = Number(
    (distance * config.perKm).toFixed(2)
  );


  const durationFare = Number(
    (duration * config.perMinute).toFixed(2)
  );


  const subtotal = Number(
    (
      baseFare +
      distanceFare +
      durationFare
    ).toFixed(2)
  );


  const totalFare = Math.max(
    Math.ceil(subtotal),
    config.minimumFare
  );


  return {

    baseFare,

    distanceFare,

    durationFare,

    subtotal,

    minimumFare: config.minimumFare,

    minimumFareApplied:
      totalFare === config.minimumFare,

    totalFare,
  };
};


module.exports = {
  FARE_CONFIG,
  COMMON_CHARGES,
  calculateFare,
};