const {
  calculateFare: baseFareCalculator,
} = require("../config/fare.config");

/**
 * Calculate Ride Fare
 */
const calculateFare = (vehicleType, distance) => {
  const fare = baseFareCalculator(vehicleType, distance);

  return {
    baseFare: fare.baseFare,
    distanceFare: fare.distanceFare,

    surgeMultiplier: 1,
    surgeAmount: 0,

    durationFare: 0,

    tax: 0,

    discount: 0,

    tollCharges: 0,

    airportCharges: 0,

    subtotal: fare.subtotal,

    minimumFareApplied: fare.minimumFareApplied,

    totalFare: fare.totalFare,
  };
};

module.exports = {
  calculateFare,
};