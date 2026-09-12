const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const PricingEngine = require("../src/services/pricing.engine");
const fareService = require("../src/services/fare.service");

describe("PHASE 9: Enterprise Fare Engine, Multipliers & Boundary Math", () => {
  const samplePricingConfig = {
    baseFare: 50.0,
    pricePerKm: 12.0,
    pricePerMinute: 2.0,
    minimumFare: 80.0,
    platformFee: 15.0,
    bookingFee: 10.0,
    waitingChargePerMinute: 3.0,
    airportCharge: 100.0,
    gstPercentage: 5.0,
    peakMultiplier: 1.25,
    nightMultiplier: 1.20,
    rainMultiplier: 1.30,
    eventMultiplier: 1.40,
    maxSurgeMultiplier: 3.0,
  };

  test("Pricing Engine: Base, distance, and duration fare calculation", () => {
    const distanceKm = 10.5;
    const durationMinutes = 20;

    const baseFare = PricingEngine.calculateBaseFare(samplePricingConfig);
    assert.equal(baseFare, 50.0);

    const distanceFare = PricingEngine.calculateDistanceFare(distanceKm, samplePricingConfig);
    // 10.5 * 12 = 126.0
    assert.equal(distanceFare, 126.0);

    const durationFare = PricingEngine.calculateDurationFare(durationMinutes, samplePricingConfig);
    // 20 * 2 = 40.0
    assert.equal(durationFare, 40.0);
  });

  test("Pricing Engine: Minimum Fare Rule protects floor revenue", () => {
    // Very short trip: 0.5 km (6 INR) + 2 min (4 INR) + base (50 INR) + platform (15) + booking (10) = 85
    // But if base was 10, total 45 < minimumFare (80), it must lift to 80
    const subtotalLow = 45.0;
    const result = PricingEngine.applyMinimumFare(subtotalLow, samplePricingConfig);
    assert.equal(result, 80.0, "Subtotal below minimum fare must be lifted to minimum fare");

    const subtotalHigh = 150.0;
    assert.equal(PricingEngine.applyMinimumFare(subtotalHigh, samplePricingConfig), 150.0);
  });

  test("Pricing Engine: Multi-factor surge compounding and max multiplier cap", () => {
    // 1. Single peak multiplier: 1.25
    const peakSurge = PricingEngine.calculateSurgeMultiplier({
      isPeakHour: true,
      config: samplePricingConfig,
    });
    assert.equal(peakSurge, 1.25);

    // 2. Compounding: peak (1.25) * night (1.20) * rain (1.30) * event (1.40) = 2.73
    const compoundSurge = PricingEngine.calculateSurgeMultiplier({
      isPeakHour: true,
      isNightRide: true,
      isRaining: true,
      isEventRide: true,
      config: samplePricingConfig,
    });
    assert.equal(compoundSurge, 2.73);

    // 3. Cap at maxSurgeMultiplier (3.00)
    const cappedConfig = { ...samplePricingConfig, peakMultiplier: 2.5, rainMultiplier: 2.0, maxSurgeMultiplier: 3.0 };
    const cappedSurge = PricingEngine.calculateSurgeMultiplier({
      isPeakHour: true,
      isRaining: true,
      config: cappedConfig,
    });
    assert.equal(cappedSurge, 3.0);
  });

  test("Pricing Engine: Complete fare calculation consistency (subtotal + GST - discount = finalFare)", () => {
    const fare = PricingEngine.calculateFare({
      pricingConfig: samplePricingConfig,
      distanceKm: 15.0, // 180
      durationMinutes: 30.0, // 60
      waitingMinutes: 5.0, // 15
      tollCharge: 50.0,
      isAirportRide: true, // 100
      isPeakHour: false,
      discountAmount: 25.0,
    });

    // base(50) + dist(180) + dur(60) + plat(15) + book(10) + wait(15) + airport(100) + toll(50) = 480
    assert.equal(fare.estimatedFare, 480.0);
    // GST 5% of 480 = 24.0
    assert.equal(fare.gstAmount, 24.0);
    // Discount applied = 25.0
    assert.equal(fare.discountAmount, 25.0);
    // Final fare = 480 + 24 - 25 = 479.0
    assert.equal(fare.finalFare, 479.0);
    assert.equal(fare.fareBreakdown.finalFare, 479.0);
  });

  test("Pricing Engine: Coupon discount cannot reduce total fare below minimum fare", () => {
    // subtotal = 70 + gst = 73.5, min fare = 80
    const shortConfig = { ...samplePricingConfig, minimumFare: 100.0 };
    const fare = PricingEngine.calculateFare({
      pricingConfig: shortConfig,
      distanceKm: 2.0, // 24
      durationMinutes: 5.0, // 10
      discountAmount: 200.0, // Massive discount attempt
    });

    assert.ok(fare.finalFare >= 100.0, `Final fare ${fare.finalFare} must not drop below minimum fare 100.0`);
  });

  test("Fare Service Validation: Rejects zero distance, negative values, and extreme distance", async () => {
    // 1. Zero distance
    await assert.rejects(
      async () => {
        await fareService.calculateFare({
          vehicleType: "CAR",
          distanceKm: 0,
          durationMinutes: 10,
        });
      },
      (err) => {
        assert.ok(err.message.includes("must be greater than zero"));
        return true;
      },
    );

    // 2. Negative distance
    await assert.rejects(
      async () => {
        await fareService.calculateFare({
          vehicleType: "CAR",
          distanceKm: -5.0,
          durationMinutes: 10,
        });
      },
      (err) => {
        assert.ok(err.message.includes("must be greater than zero"));
        return true;
      },
    );

    // 3. Negative duration
    await assert.rejects(
      async () => {
        await fareService.calculateFare({
          vehicleType: "CAR",
          distanceKm: 10.0,
          durationMinutes: -15,
        });
      },
      (err) => {
        assert.ok(err.message.includes("cannot be negative"));
        return true;
      },
    );

    // 4. Extreme distance (> 2000 km)
    await assert.rejects(
      async () => {
        await fareService.calculateFare({
          vehicleType: "CAR",
          distanceKm: 25000.0,
          durationMinutes: 120,
        });
      },
      (err) => {
        assert.ok(err.message.includes("exceeds maximum allowable limit"));
        return true;
      },
    );
  });

  test("Floating-point precision: Prevents IEEE-754 precision artifacts", () => {
    // 0.1 + 0.2 in JS = 0.30000000000000004
    const moneyVal = PricingEngine.money(0.1 + 0.2);
    assert.equal(moneyVal, 0.3);

    // Multiple decimal calculations are accurately rounded
    const fare = PricingEngine.calculateFare({
      pricingConfig: samplePricingConfig,
      distanceKm: 3.3333333,
      durationMinutes: 7.7777777,
      discountAmount: 3.14159,
    });

    const decimalsOf = (num) => {
      const parts = num.toString().split(".");
      return parts.length > 1 ? parts[1].length : 0;
    };

    assert.ok(decimalsOf(fare.estimatedFare) <= 2);
    assert.ok(decimalsOf(fare.finalFare) <= 2);
    assert.ok(decimalsOf(fare.gstAmount) <= 2);
    assert.ok(decimalsOf(fare.discountAmount) <= 2);
  });

  test("Fare Intelligence Predictor: Handles insufficient data safely and computes bounded metrics", () => {
    const { buildFareIntelligence } = require("../src/ai/predictors/fareIntelligence.predictor");

    // 1. Insufficient data (< 24 rides)
    const sparseResult = buildFareIntelligence({ rides: [] });
    assert.equal(sparseResult.status, "INSUFFICIENT_DATA");
    assert.equal(sparseResult.reason, "INSUFFICIENT_VALID_FARE_HISTORY");

    // 2. 25 synthetic valid rides
    const rides = Array.from({ length: 25 }, (_, i) => ({
      status: "COMPLETED",
      finalFare: 150 + i * 5,
      distance: 10 + i * 0.5,
      vehicleType: "CAR",
      createdAt: new Date(Date.now() - (25 - i) * 3600 * 1000).toISOString(),
    }));

    const result = buildFareIntelligence({ rides });
    assert.equal(result.status, "READY");
    assert.ok(result.metrics.averageFare > 0);
    assert.ok(result.metrics.averageDistance > 0);
    assert.ok(result.metrics.averageFarePerKm > 0);
    assert.ok(["STABLE", "INCREASING", "DECREASING"].includes(result.fareTrend));
  });
});
