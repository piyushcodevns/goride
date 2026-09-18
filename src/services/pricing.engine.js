const { Prisma } = require("@prisma/client");

class PricingEngine {
  /**
   * Convert value to number safely
   */
  static toNumber(value) {
    if (value === null || value === undefined) return 0;

    if (value instanceof Prisma.Decimal) {
      return Number(value.toString());
    }

    return Number(value);
  }

  /**
   * Round monetary values
   */
  static money(value) {
    return Number(this.toNumber(value).toFixed(2));
  }

  /**
   * Validate pricing configuration
   */
  static validatePricingConfig(config) {
    if (!config) {
      throw new Error("Pricing configuration not found.");
    }

    const requiredFields = [
      "baseFare",
      "pricePerKm",
      "pricePerMinute",
      "minimumFare",
      "platformFee",
      "bookingFee",
      "gstPercentage",
    ];

    for (const field of requiredFields) {
      if (config[field] === null || config[field] === undefined) {
        throw new Error(`Missing pricing field: ${field}`);
      }
    }
  }

  /**
   * Base Fare
   */
  static calculateBaseFare(config) {
    return this.money(config.baseFare);
  }

  /**
   * Distance Fare
   */
  static calculateDistanceFare(distanceKm, config) {
    return this.money(
      this.toNumber(distanceKm) * this.toNumber(config.pricePerKm),
    );
  }

  /**
   * Duration Fare
   */
  static calculateDurationFare(durationMinutes, config) {
    return this.money(
      this.toNumber(durationMinutes) * this.toNumber(config.pricePerMinute),
    );
  }

  /**
   * Platform Fee
   */
  static calculatePlatformFee(config) {
    return this.money(config.platformFee);
  }

  /**
   * Booking Fee
   */
  static calculateBookingFee(config) {
    return this.money(config.bookingFee);
  }

  /**
   * Waiting Charge
   */
  static calculateWaitingCharge(waitingMinutes, config) {
    return this.money(
      this.toNumber(waitingMinutes) *
        this.toNumber(config.waitingChargePerMinute),
    );
  }

  /**
   * Airport Charge
   */
  static calculateAirportCharge(isAirportRide, config) {
    if (!isAirportRide) return 0;

    return this.money(config.airportCharge);
  }

  /**
   * Minimum Fare Rule
   */
  static applyMinimumFare(subtotal, config) {
    const minimumFare = this.toNumber(config.minimumFare);

    return subtotal < minimumFare ? minimumFare : this.money(subtotal);
  }
  /**
   * Toll Charge
   */
  static calculateTollCharge(tollCharge = 0) {
    return this.money(tollCharge);
  }

  /**
   * Peak Hour Multiplier
   */
  static getPeakMultiplier(isPeakHour, config) {
    if (!isPeakHour) return 1;

    return this.toNumber(config.peakMultiplier);
  }

  /**
   * Night Multiplier
   */
  static getNightMultiplier(isNightRide, config) {
    if (!isNightRide) return 1;

    return this.toNumber(config.nightMultiplier);
  }

  /**
   * Rain Multiplier
   */
  static getRainMultiplier(isRaining, config) {
    if (!isRaining) return 1;

    return this.toNumber(config.rainMultiplier);
  }

  /**
   * Event Multiplier
   */
  static getEventMultiplier(isEventRide, config) {
    if (!isEventRide) return 1;

    return this.toNumber(config.eventMultiplier);
  }

  /**
   * Final Surge Multiplier
   */
  static calculateSurgeMultiplier({
    isPeakHour = false,
    isNightRide = false,
    isRaining = false,
    isEventRide = false,
    config,
  }) {
    const peak = this.getPeakMultiplier(isPeakHour, config);
    const night = this.getNightMultiplier(isNightRide, config);
    const rain = this.getRainMultiplier(isRaining, config);
    const event = this.getEventMultiplier(isEventRide, config);

    let multiplier = peak * night * rain * event;

    const maxSurgeMultiplier = this.toNumber(config.maxSurgeMultiplier ?? 3);

    if (multiplier > maxSurgeMultiplier) {
      multiplier = maxSurgeMultiplier;
    }

    return multiplier < 1 ? 1 : this.money(multiplier);
  }

  /**
   * Surge Amount
   */
  static calculateSurgeAmount(subtotal, multiplier) {
    if (multiplier <= 1) return 0;

    return this.money(subtotal * multiplier - subtotal);
  }

  /**
   * Subtotal Before GST
   */
  static calculateSubtotal({
    baseFare,
    distanceFare,
    durationFare,
    platformFee,
    bookingFee,
    waitingCharge,
    airportCharge,
    tollCharge,
    surgeAmount,
  }) {
    return this.money(
      baseFare +
        distanceFare +
        durationFare +
        platformFee +
        bookingFee +
        waitingCharge +
        airportCharge +
        tollCharge +
        surgeAmount,
    );
  }
  /**
   * GST Amount
   */
  static calculateGST(subtotal, config) {
    return this.money(subtotal * (this.toNumber(config.gstPercentage) / 100));
  }

  /**
   * Coupon Discount
   */
  static calculateDiscount(discountAmount = 0, maxDiscount = 0) {
    const discount = this.money(discountAmount);

    if (discount <= 0) return 0;

    return discount > maxDiscount ? this.money(maxDiscount) : discount;
  }

  /**
   * Final Fare
   */
  static calculateFinalFare({ subtotal, gstAmount, discountAmount, config }) {
    const grossFare = this.money(subtotal + gstAmount);

    const minimumFare = this.toNumber(config.minimumFare);

    // Maximum discount allowed so fare minimum fare se niche na jaaye
    const maxAllowedDiscount =
      grossFare > minimumFare ? grossFare - minimumFare : 0;

    const appliedDiscount = this.calculateDiscount(
      discountAmount,
      maxAllowedDiscount,
    );

    let total = grossFare - appliedDiscount;

    total = this.applyMinimumFare(total, config);

    return {
      finalFare: this.money(total),
      appliedDiscount,
    };
  }

  /**
   * Complete Enterprise Fare Calculation
   */
  static calculateFare({
    pricingConfig,
    distanceKm,
    durationMinutes,
    waitingMinutes = 0,
    tollCharge = 0,
    isAirportRide = false,
    isPeakHour = false,
    isNightRide = false,
    isRaining = false,
    isEventRide = false,
    discountAmount = 0,
  }) {
    this.validatePricingConfig(pricingConfig);

    const baseFare = this.calculateBaseFare(pricingConfig);
    const distanceFare = this.calculateDistanceFare(distanceKm, pricingConfig);
    const durationFare = this.calculateDurationFare(
      durationMinutes,
      pricingConfig,
    );

    const platformFee = this.calculatePlatformFee(pricingConfig);
    const bookingFee = this.calculateBookingFee(pricingConfig);

    const waitingCharge = this.calculateWaitingCharge(
      waitingMinutes,
      pricingConfig,
    );

    const airportCharge = this.calculateAirportCharge(
      isAirportRide,
      pricingConfig,
    );

    const toll = this.calculateTollCharge(tollCharge);

    const surgeMultiplier = this.calculateSurgeMultiplier({
      isPeakHour,
      isNightRide,
      isRaining,
      isEventRide,
      config: pricingConfig,
    });

    const subtotalWithoutSurge =
      baseFare +
      distanceFare +
      durationFare +
      platformFee +
      bookingFee +
      waitingCharge +
      airportCharge +
      toll;

    const surgeAmount = this.calculateSurgeAmount(
      subtotalWithoutSurge,
      surgeMultiplier,
    );

    const subtotal = this.calculateSubtotal({
      baseFare,
      distanceFare,
      durationFare,
      platformFee,
      bookingFee,
      waitingCharge,
      airportCharge,
      tollCharge: toll,
      surgeAmount,
    });

    const gstAmount = this.calculateGST(subtotal, pricingConfig);

    const finalFareResult = this.calculateFinalFare({
      subtotal,
      gstAmount,
      discountAmount,
      config: pricingConfig,
    });

    const finalFare = finalFareResult.finalFare;
    const appliedDiscount = finalFareResult.appliedDiscount;

    return {
      estimatedFare: subtotal,
      baseFare,
      distanceFare,
      durationFare,
      platformFee,
      bookingFee,
      waitingCharge,
      airportCharge,
      tollCharge: toll,
      surgeMultiplier,
      surgeAmount,
      gstAmount,
      discountAmount: appliedDiscount,
      finalFare,

      fareBreakdown: {
        baseFare,

        pricePerKm: this.toNumber(pricingConfig.pricePerKm),
        pricePerMinute: this.toNumber(pricingConfig.pricePerMinute), 

        distanceFare,
        durationFare,
        platformFee,
        bookingFee,
        waitingCharge,
        airportCharge,
        tollCharge: toll,

        subtotalBeforeSurge: this.money(subtotalWithoutSurge),

        surgeMultiplier,
        surgeAmount,

        subtotal,

        gstPercentage: this.toNumber(pricingConfig.gstPercentage),
        gstAmount,

        discountAmount: appliedDiscount,

        minimumFare: this.toNumber(pricingConfig.minimumFare),

        finalFare,

        calculatedAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = PricingEngine;
