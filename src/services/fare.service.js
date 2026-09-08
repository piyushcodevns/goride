const PricingCacheService = require("./pricing-cache.service");
const PricingEngine = require("./pricing.engine");
const PricingRulesEngine = require("./pricing-rules.engine");
const { getRouteDetails } = require("./openRoute.service");

const DEFAULT_CITY = "DEFAULT";

const validateFareRequest = ({
  vehicleType,
  distanceKm,
  durationMinutes,
  waitingMinutes,
  tollCharge,
  discountAmount,
}) => {
  if (!vehicleType || typeof vehicleType !== "string") {
    throw new Error("Vehicle type is required.");
  }

  const numericFields = [
    { name: "distanceKm", value: distanceKm, allowZero: false, max: 2000 },
    { name: "durationMinutes", value: durationMinutes, allowZero: true, max: 2880 },
    { name: "waitingMinutes", value: waitingMinutes, allowZero: true, max: 1440 },
    { name: "tollCharge", value: tollCharge, allowZero: true, max: 50000 },
    { name: "discountAmount", value: discountAmount, allowZero: true, max: 50000 },
  ];

  for (const field of numericFields) {
    if (
      typeof field.value !== "number" ||
      Number.isNaN(field.value) ||
      !Number.isFinite(field.value)
    ) {
      throw new Error(`${field.name} must be a valid number.`);
    }

    if (field.allowZero) {
      if (field.value < 0) {
        throw new Error(`${field.name} cannot be negative.`);
      }
    } else {
      if (field.value <= 0) {
        throw new Error(`${field.name} must be greater than zero.`);
      }
    }

    if (field.max !== undefined && field.value > field.max) {
      throw new Error(`${field.name} exceeds maximum allowable limit of ${field.max}.`);
    }
  }
};

const normalizeNumber = (value) => Number(value.toFixed(2));

const resolveRouteInputs = async ({
  pickupLatitude,
  pickupLongitude,
  destinationLatitude,
  destinationLongitude,
  distanceKm,
  durationMinutes,
}) => {
  if (
    pickupLatitude !== undefined &&
    pickupLongitude !== undefined &&
    destinationLatitude !== undefined &&
    destinationLongitude !== undefined
  ) {
    const routeDetails = await getRouteDetails(
      { latitude: Number(pickupLatitude), longitude: Number(pickupLongitude) },
      { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) },
    );

    return {
      distanceKm: routeDetails.distance,
      durationMinutes: routeDetails.duration,
    };
  }

  if (distanceKm === undefined || durationMinutes === undefined) {
    throw new Error("Pickup and destination coordinates are required for fare estimation.");
  }

  return {
    distanceKm,
    durationMinutes,
  };
};

const calculateFare = async ({
  city = DEFAULT_CITY,
  vehicleType,

  pickupLatitude,
  pickupLongitude,
  destinationLatitude,
  destinationLongitude,
  distanceKm,
  durationMinutes = 0,

  waitingMinutes = 0,

  tollCharge = 0,

  discountAmount = 0,

  rideDate = new Date(),
}) => {
  const routeInputs = await resolveRouteInputs({
    pickupLatitude,
    pickupLongitude,
    destinationLatitude,
    destinationLongitude,
    distanceKm,
    durationMinutes,
  });

  const resolvedDistanceKm = routeInputs.distanceKm;
  const resolvedDurationMinutes = routeInputs.durationMinutes;

  validateFareRequest({
    vehicleType,
    distanceKm: resolvedDistanceKm,
    durationMinutes: resolvedDurationMinutes,
    waitingMinutes,
    tollCharge,
    discountAmount,
  });

  const normalizedDistanceKm = normalizeNumber(resolvedDistanceKm);
  const normalizedDurationMinutes = normalizeNumber(resolvedDurationMinutes);
  const normalizedWaitingMinutes = normalizeNumber(waitingMinutes);
  const normalizedTollCharge = normalizeNumber(tollCharge);
  const normalizedDiscountAmount = normalizeNumber(discountAmount);

  const pricingConfig = await PricingCacheService.getPricingConfig(
    city,
    vehicleType,
  );

  if (!pricingConfig) {
    throw new Error("Pricing configuration not found.");
  }

  const pricingRules = PricingRulesEngine.evaluate({
    rideDate,
  });

  const fare = PricingEngine.calculateFare({
    pricingConfig,

    distanceKm: normalizedDistanceKm,
    durationMinutes: normalizedDurationMinutes,

    waitingMinutes: normalizedWaitingMinutes,

    tollCharge: normalizedTollCharge,

    isAirportRide: pricingRules.isAirportRide,
    isPeakHour: pricingRules.isPeakHour,
    isNightRide: pricingRules.isNightRide,
    isRaining: pricingRules.isRaining,
    isEventRide: pricingRules.isEventRide,

    discountAmount: normalizedDiscountAmount,
  });

  return {
    city,
    vehicleType,
    pricingConfigId: pricingConfig.id,

    pricingRules,

    ...fare,
  };
};

module.exports = {
  calculateFare,
};
