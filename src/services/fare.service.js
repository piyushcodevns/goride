const {
  calculateFare: baseFareCalculator,
  COMMON_CHARGES,
} = require("../config/fare.config");


/**
 * Calculate Dynamic Ride Fare
 *
 * Formula:
 *
 * Base Fare
 * + Distance Fare
 * + Duration Fare
 * + Booking Fee
 * + Platform Fee
 * + GST
 *
 * Future:
 * + Surge
 * + Coupon
 * + Toll
 * + AI Pricing
 *
 */
const calculateFare = (
  vehicleType,
  distance,
  duration = 0
) => {

  const fare = baseFareCalculator(
    vehicleType,
    distance,
    duration
  );


  const bookingFee = COMMON_CHARGES.bookingFee;

  const platformFee = COMMON_CHARGES.platformFee;


  const surgeMultiplier = 1;

  const surgeAmount = 0;


  const discount = 0;


  const tollCharges = 0;


  const airportCharges = 0;


  const subtotal = Number(
    (
      fare.totalFare +
      bookingFee +
      platformFee +
      tollCharges +
      airportCharges +
      surgeAmount -
      discount
    ).toFixed(2)
  );


  const gst = Number(
    (
      (subtotal *
        COMMON_CHARGES.gstPercentage) /
      100
    ).toFixed(2)
  );


  const totalFare = Number(
    (
      subtotal +
      gst
    ).toFixed(2)
  );


  return {

    baseFare: fare.baseFare,

    distanceFare: fare.distanceFare,

    durationFare: fare.durationFare,


    bookingFee,

    platformFee,


    surgeMultiplier,

    surgeAmount,


    tollCharges,

    airportCharges,


    discount,


    gst,


    subtotal,


    minimumFareApplied:
      fare.minimumFareApplied,


    totalFare,
  };
};


module.exports = {
  calculateFare,
};