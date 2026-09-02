const PricingCacheService = require("./pricing-cache.service");
const PricingEngine = require("./pricing.engine");
const PricingRulesEngine = require("./pricing-rules.engine");

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
    { name: "distanceKm", value: distanceKm, allowZero: false },
    { name: "durationMinutes", value: durationMinutes, allowZero: true },
    { name: "waitingMinutes", value: waitingMinutes, allowZero: true },
    { name: "tollCharge", value: tollCharge, allowZero: true },
    { name: "discountAmount", value: discountAmount, allowZero: true },
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
  }
};

const normalizeNumber = (value) => Number(value.toFixed(2));

const calculateFare = async ({
  city = DEFAULT_CITY,
  vehicleType,

  distanceKm,
  durationMinutes = 0,

  waitingMinutes = 0,

  tollCharge = 0,

  isAirportRide = false,

  isPeakHour = false,
  isNightRide = false,
  isRaining = false,
  isEventRide = false,

  discountAmount = 0,

  rideDate = new Date(),
}) => {
  validateFareRequest({
    vehicleType,
    distanceKm,
    durationMinutes,
    waitingMinutes,
    tollCharge,
    discountAmount,
  });

  distanceKm = normalizeNumber(distanceKm);
  durationMinutes = normalizeNumber(durationMinutes);
  waitingMinutes = normalizeNumber(waitingMinutes);
  tollCharge = normalizeNumber(tollCharge);
  discountAmount = normalizeNumber(discountAmount);

  const pricingConfig = await PricingCacheService.getPricingConfig(
    city,
    vehicleType,
  );

  if (!pricingConfig) {
    throw new Error("Pricing configuration not found.");
  }

  const pricingRules = PricingRulesEngine.evaluate({
    rideDate,
    isAirportRide,
    isPeakHour,
    isNightRide,
    isRaining,
    isEventRide,
  });

  const fare = PricingEngine.calculateFare({
    pricingConfig,

    distanceKm,
    durationMinutes,

    waitingMinutes,

    tollCharge,

    isAirportRide: pricingRules.isAirportRide,
    isPeakHour: pricingRules.isPeakHour,
    isNightRide: pricingRules.isNightRide,
    isRaining: pricingRules.isRaining,
    isEventRide: pricingRules.isEventRide,

    discountAmount,
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
