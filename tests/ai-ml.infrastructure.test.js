const assert = require("node:assert/strict");
const test = require("node:test");

const { cleanDataset } = require("../src/ai/ml/datasetPipeline");
const { buildFeatureRow, assertNoTargetLeakage } = require("../src/ai/ml/featureEngineering");
const { chronologicalSplit, assertChronological } = require("../src/ai/ml/splitting");
const { assessReadiness } = require("../src/ai/ml/readiness");
const { evaluateRegression, evaluateBinaryClassification } = require("../src/ai/ml/evaluation");
const {
  getModel,
  clearCache,
  reloadModel,
  MODEL_NOT_AVAILABLE,
} = require("../src/ai/ml/modelRegistry");
const { createModelMetadata } = require("../src/ai/ml/metadata");
const {
  buildPredictionRecord,
  assessDriftReadiness,
} = require("../src/ai/ml/predictionMonitoring");
const { formatAvailabilityReport } = require("../src/ai/ml/availabilityReport");

const ride = (id, daysAgo, status = "COMPLETED") => ({
  id,
  createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  status,
  distance: 4,
  vehicleType: "AUTO",
  finalFare: 100,
  isScheduled: false,
});

test("dataset cleaning rejects duplicates, invalid values, and future records", () => {
  const result = cleanDataset("fare", [
    ride("one", 2),
    { ...ride("one", 1), distance: "not-a-number" },
    { ...ride("future", -1) },
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.cleanedRecords.length, 1);
  assert.ok(result.errors.some((error) => error.reason === "DUPLICATE_RECORD"));
  assert.ok(result.errors.some((error) => error.reason === "FUTURE_RECORD"));
});

test("feature engineering rejects target leakage", () => {
  assert.throws(() => assertNoTargetLeakage("rating", ["rating"]));
  const row = buildFeatureRow("rating", ride("one", 2));
  assert.equal(row.features.finalFare, undefined);
});

test("chronological split keeps future observations out of training", () => {
  const records = [1, 2, 3, 4, 5, 6].map((daysAgo, index) => ({
    id: String(index),
    timestamp: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  }));
  const split = chronologicalSplit(records);
  assertChronological(split);
  assert.ok(new Date(split.train.at(-1).timestamp) <= new Date(split.validation[0].timestamp));
});

test("readiness remains insufficient for the current database scale", () => {
  const result = assessReadiness("fare", {
    valid: true,
    observations: 1,
    timeCoverageDays: 0,
  });
  assert.equal(result.status, "INSUFFICIENT_DATA");
});

test("evaluation returns real held-out metrics", () => {
  const regression = evaluateRegression([1, 2, 3], [1, 3, 2]);
  assert.equal(regression.mae, 2 / 3);
  const classification = evaluateBinaryClassification([true, false, true, false], [0.9, 0.1, 0.4, 0.8]);
  assert.equal(classification.confusionMatrix.tp, 1);
  assert.equal(classification.confusionMatrix.tn, 1);
});

test("model registry reports missing artifacts without accepting arbitrary paths", () => {
  clearCache();
  assert.equal(getModel("fare").status, MODEL_NOT_AVAILABLE);
  assert.throws(() => getModel("../secret"), /Invalid model feature identifier/);
  assert.equal(reloadModel("fare").status, MODEL_NOT_AVAILABLE);
});

test("model metadata requires honest split counts", () => {
  const metadata = createModelMetadata({
    feature: "fare",
    modelVersion: "goride-fare-ml-v1",
    algorithm: "LinearRegression",
    featureList: ["distance"],
    target: "finalFare",
    datasetRange: { from: "2026-01-01", to: "2026-02-01" },
    sampleCount: 10,
    trainCount: 7,
    validationCount: 1,
    testCount: 2,
    metrics: { mae: 1 },
    artifactPath: "fare.json",
  });
  assert.equal(metadata.trainingStatus, "TRAINED");
  assert.equal(metadata.artifactPath, "fare.json");
  assert.throws(() => createModelMetadata({
    feature: "fare",
    modelVersion: "v1",
    algorithm: "LinearRegression",
    featureList: ["distance"],
    target: "finalFare",
    datasetRange: { from: "2026-01-01", to: "2026-02-01" },
    sampleCount: 10,
    trainCount: 7,
    validationCount: 1,
    testCount: 1,
    metrics: { mae: 1 },
    artifactPath: "fare.json",
  }), /split counts/);
});

test("prediction monitoring records timing metadata and honest drift readiness", () => {
  const record = buildPredictionRecord({
    feature: "fare",
    modelVersion: "goride-ai-v1",
    source: "STATISTICAL_BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:00.025Z",
  });
  assert.equal(record.latencyMs, 25);
  assert.equal(
    assessDriftReadiness({ observations: 1, outcomes: 0 }).status,
    "DRIFT_MONITORING_NOT_READY",
  );
});

test("availability reports support a human-readable matrix", () => {
  const output = formatAvailabilityReport({
    generatedAt: "2026-01-01T00:00:00.000Z",
    source: "test",
    features: {
      fare: {
        feature: "fare",
        samples: 1,
        timeCoverageDays: 0,
        status: "INSUFFICIENT_DATA",
        reason: "MINIMUM_SAMPLES_NOT_MET",
      },
    },
  });
  assert.match(output, /Feature\s+Samples/);
  assert.match(output, /fare\s+1/);
});
