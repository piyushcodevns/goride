process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// 10 Core AI Predictors & Recommenders
const { buildFareIntelligence } = require("../src/ai/predictors/fareIntelligence.predictor");
const { predictDemand } = require("../src/ai/predictors/demandPrediction.predictor");
const { buildCancellationPrediction } = require("../src/ai/predictors/cancellationPrediction.predictor");
const { buildVehicleRecommendation } = require("../src/ai/predictors/vehicleRecommendation.predictor");
const { buildRatingPrediction } = require("../src/ai/predictors/ratingPrediction.predictor");
const { buildRevenueForecast } = require("../src/ai/predictors/revenueForecast.predictor");
const { buildWeatherEffectPrediction } = require("../src/ai/predictors/weatherEffect.predictor");
const { buildFraudRiskPrediction } = require("../src/ai/predictors/fraudRisk.predictor");
const { recommendDrivers } = require("../src/ai/recommenders/driverRecommendation.recommender");
const { calculateDriverPerformanceScore } = require("../src/ai/scoring/driverPerformance.score");

describe("PHASE 16: AI/ML Robustness, Numerical Stability & Business Invariants", () => {
  test("Fare Intelligence: Rejects missing/malformed history and prevents NaN", () => {
    // 1. Missing / null input
    const emptyResult = buildFareIntelligence({ rides: null });
    assert.equal(emptyResult.status, "INSUFFICIENT_DATA");

    // 2. Corrupted data with negative distance and NaN fare
    const corruptedRides = [
      { status: "COMPLETED", finalFare: "not_a_num", distance: -10, createdAt: new Date() },
      { status: "CANCELLED", finalFare: 100, distance: 5, createdAt: new Date() },
    ];
    const corruptedResult = buildFareIntelligence({ rides: corruptedRides });
    assert.equal(corruptedResult.status, "INSUFFICIENT_DATA");
    assert.equal(corruptedResult.reason, "INSUFFICIENT_VALID_FARE_HISTORY");
  });

  test("Demand Prediction: Rejects invalid target dates and hours while bounding outputs", () => {
    // 1. Insufficient ride history
    const sparse = predictDemand({ rides: [], targetDate: "2026-06-01", targetHour: 14 });
    assert.equal(sparse.status, "INSUFFICIENT_DATA");

    // 2. 25 synthetic observations
    const rides = Array.from({ length: 25 }, (_, i) => ({
      id: `r_${i}`,
      createdAt: new Date(Date.now() - (25 - i) * 3600 * 1000).toISOString(),
      distance: 8.0,
      finalFare: 120.0,
      status: "COMPLETED",
    }));

    // Invalid hour < 0 or > 23 throws
    assert.throws(
      () => predictDemand({ rides, targetDate: "2026-06-01", targetHour: 25 }),
      /targetHour must be an integer between 0 and 23/,
    );
    assert.throws(
      () => predictDemand({ rides, targetDate: "invalid-date", targetHour: 12 }),
      /Invalid target date/,
    );

    // Valid prediction
    const valid = predictDemand({ rides, targetDate: "2026-06-01", targetHour: 12 });
    assert.equal(valid.status, "READY");
    assert.ok(Number.isFinite(valid.predictedDemand));
    assert.ok(!Number.isNaN(valid.predictedDemand));
    assert.ok(valid.predictedDemand >= 0);
  });

  test("Cancellation Prediction: Rejects invalid/zero/negative distance and produces finite rate", () => {
    // 1. Invalid distance
    const invalidDist = buildCancellationPrediction({ rideHistory: [], distance: -5 });
    assert.equal(invalidDist.status, "BLOCKED");
    assert.equal(invalidDist.reason, "INVALID_DISTANCE");

    // 2. Insufficient history
    const sparse = buildCancellationPrediction({ rideHistory: [], distance: 10 });
    assert.equal(sparse.status, "INSUFFICIENT_DATA");

    // 3. Sufficient history (35 rides)
    const history = Array.from({ length: 35 }, (_, i) => ({
      status: i % 5 === 0 ? "CANCELLED" : "COMPLETED",
      distance: 5 + (i % 10),
      vehicleType: "CAR",
      createdAt: new Date(Date.now() - (35 - i) * 86400 * 1000).toISOString(),
    }));

    const result = buildCancellationPrediction({
      rideHistory: history,
      vehicleType: "CAR",
      distance: 12,
      isScheduled: false,
    });

    assert.equal(result.status, "READY");
    assert.ok(Number.isFinite(result.prediction));
    assert.ok(!Number.isNaN(result.prediction));
    assert.ok(result.prediction >= 0);
    assert.ok(result.prediction <= 1);
  });

  test("Vehicle Recommendation: Rejects non-positive distance and handles sparse history", () => {
    // 1. Non-positive distance
    const zeroDist = buildVehicleRecommendation({ rides: [], requestedDistance: 0 });
    assert.equal(zeroDist.status, "BLOCKED");
    assert.equal(zeroDist.reason, "INVALID_REQUESTED_DISTANCE");

    // 2. Insufficient history
    const sparse = buildVehicleRecommendation({ rides: [], requestedDistance: 15 });
    assert.equal(sparse.status, "INSUFFICIENT_DATA");

    // 3. Sufficient history (25 rides)
    const rides = Array.from({ length: 25 }, (_, i) => ({
      status: "COMPLETED",
      distance: 5 + (i % 5),
      vehicleType: i % 2 === 0 ? "CAR" : "BIKE",
      finalFare: 100,
    }));

    const valid = buildVehicleRecommendation({ rides, requestedDistance: 7.5 });
    assert.equal(valid.status, "READY");
    assert.ok(valid.recommendation);
    assert.ok(["CAR", "BIKE"].includes(valid.recommendation.vehicleType));
  });

  test("Rating Prediction: Validates distance and duration; clamps rating in [1..5]", () => {
    // 1. Negative distance
    const badDist = buildRatingPrediction({ ratingHistory: [], distance: -1 });
    assert.equal(badDist.status, "BLOCKED");

    // 2. Sufficient history (25 ratings with nested ride object)
    const ratings = Array.from({ length: 25 }, (_, i) => ({
      rating: 4 + (i % 2),
      ride: {
        distance: 10,
        vehicleType: "CAR",
      },
      createdAt: new Date().toISOString(),
    }));

    const valid = buildRatingPrediction({
      ratingHistory: ratings,
      vehicleType: "CAR",
      distance: 10,
      duration: 25,
    });

    assert.equal(valid.status, "READY");
    assert.ok(typeof valid.prediction === "number");
    assert.ok(valid.prediction >= 1.0);
    assert.ok(valid.prediction <= 5.0);
  });

  test("Revenue Forecast: Aggregates daily buckets and projects non-negative forecast", () => {
    // 1. Missing payments
    const empty = buildRevenueForecast({ payments: null });
    assert.equal(empty.status, "INSUFFICIENT_DATA");

    // 2. Sufficient payments across 25 distinct days
    const payments = Array.from({ length: 25 }, (_, i) => ({
      amount: 1000 + i * 50,
      createdAt: new Date(Date.now() - (25 - i) * 86400 * 1000).toISOString(),
    }));

    const forecast = buildRevenueForecast({ payments, forecastDays: 7 });
    assert.equal(forecast.status, "READY");
    assert.equal(forecast.prediction.forecastDays, 7);
    assert.ok(forecast.prediction.totalRevenue > 0);
  });

  test("Weather Effect: Enforces safety invariants and disables pricing adjustments", () => {
    const weather = buildWeatherEffectPrediction({ weatherHistory: [] });
    assert.equal(weather.pricingAdjustmentAllowed, false, "AI weather model cannot arbitrarily alter prices");
    assert.ok(["BLOCKED", "INSUFFICIENT_DATA"].includes(weather.status));
  });

  test("Fraud Risk: Safely computes composite risk signals without throwing on null inputs", () => {
    // All null inputs -> safe INSUFFICIENT_DATA status and 0 score
    const safeNull = buildFraudRiskPrediction();
    assert.equal(safeNull.status, "INSUFFICIENT_DATA");
    assert.equal(safeNull.riskScore, 0);
    assert.equal(safeNull.riskLevel, "UNKNOWN");

    // Composite risk with ready anomaly signals
    const elevated = buildFraudRiskPrediction({
      rideAnomalyResult: { status: "READY", anomalies: [{ id: "anom_1" }] },
      paymentAnomalyResult: { status: "READY", anomalies: [{ id: "anom_2" }] },
    });
    assert.equal(elevated.status, "READY");
    assert.ok(elevated.riskScore >= 70);
    assert.ok(["HIGH", "CRITICAL"].includes(elevated.riskLevel));
  });

  test("Driver Matching Business Invariant: Filters unapproved, busy, or mismatched drivers", () => {
    const ride = { vehicleType: "CAR", pickup: "Point A", destination: "Point B" };
    const candidateDrivers = [
      // 1. Unapproved driver -> excluded
      { id: "d1", status: "PENDING", availability: "AVAILABLE", vehicle: { status: "APPROVED", vehicleType: "CAR" } },
      // 2. Busy driver -> excluded
      { id: "d2", status: "APPROVED", availability: "BUSY", vehicle: { status: "APPROVED", vehicleType: "CAR" } },
      // 3. Driver with active ride -> excluded
      { id: "d3", status: "APPROVED", availability: "AVAILABLE", hasActiveRide: true, vehicle: { status: "APPROVED", vehicleType: "CAR" } },
      // 4. Vehicle type mismatch (BIKE instead of CAR) -> excluded
      { id: "d4", status: "APPROVED", availability: "AVAILABLE", vehicle: { status: "APPROVED", vehicleType: "BIKE" } },
      // 5. Eligible driver -> INCLUDED
      { id: "d5", status: "APPROVED", availability: "AVAILABLE", hasActiveRide: false, vehicle: { status: "APPROVED", vehicleType: "CAR" } },
    ];

    const result = recommendDrivers({ ride, drivers: candidateDrivers });
    assert.equal(result.status, "READY");
    assert.equal(result.totalEligibleDrivers, 1);
    assert.equal(result.recommendations.length, 1);
    assert.equal(result.recommendations[0].driverId, "d5");
  });

  test("Driver Performance Scoring: Calculates bounded [0..100] score and assigns valid grades", () => {
    // 1. Insufficient rides
    const noviceDriver = { id: "d_novice", rides: [{ status: "COMPLETED" }] };
    const noviceScore = calculateDriverPerformanceScore(noviceDriver);
    assert.equal(noviceScore.status, "INSUFFICIENT_DATA");

    // 2. Experienced driver with 20 rides
    const veteranDriver = {
      id: "d_veteran",
      rides: Array.from({ length: 20 }, () => ({ status: "COMPLETED" })),
      averageRating: 4.8,
      experience: 5,
      createdAt: new Date(Date.now() - 365 * 86400 * 1000),
    };

    const veteranScore = calculateDriverPerformanceScore(veteranDriver);
    assert.equal(veteranScore.status, "READY");
    assert.ok(veteranScore.score >= 0 && veteranScore.score <= 100);
    assert.ok(["A+", "A", "B", "C", "D"].includes(veteranScore.grade));
    assert.ok(!Number.isNaN(veteranScore.score));
  });
});
