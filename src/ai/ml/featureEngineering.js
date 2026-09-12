const TARGET_FIELDS = Object.freeze({
  fare: ["finalFare"],
  demand: ["rideCount"],
  cancellation: ["status", "cancelled"],
  vehicle: ["vehicleType"],
  rating: ["rating"],
  revenue: ["amount", "dailyRevenue"],
  eta: ["actualDuration", "duration", "estimatedArrival"],
  weather: ["rideOutcome"],
  fraud: ["fraudLabel"],
});

const POST_OUTCOME_FIELDS = new Set([
  "finalFare",
  "rating",
  "fraudLabel",
  "actualDuration",
  "rideOutcome",
  "cancelled",
]);

const assertNoTargetLeakage = (feature, fields) => {
  const targets = new Set(TARGET_FIELDS[feature] || []);
  const leakage = fields.filter((field) => targets.has(field) || POST_OUTCOME_FIELDS.has(field));
  if (leakage.length) {
    throw new Error(`Target leakage detected for ${feature}: ${leakage.join(", ")}`);
  }
  return true;
};

const buildFeatureRow = (feature, record) => {
  const vehicleType = feature === "vehicle" ? undefined : record.vehicleType;
  const fields = {
    hour: new Date(record.createdAt).getUTCHours(),
    dayOfWeek: new Date(record.createdAt).getUTCDay(),
    distance: record.distance === undefined ? undefined : Number(record.distance),
    vehicleType,
    isScheduled: record.isScheduled === true,
  };

  const availableFields = Object.keys(fields).filter((field) => fields[field] !== undefined);
  assertNoTargetLeakage(feature, availableFields);

  return {
    id: record.id,
    timestamp: new Date(record.createdAt).toISOString(),
    features: fields,
    target: feature === "cancellation"
      ? record.status === "CANCELLED"
      : feature === "demand"
        ? 1
        : feature === "vehicle"
          ? record.vehicleType
          : undefined,
  };
};

const buildFeatureRows = (feature, records) => {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  return records
    .map((record) => buildFeatureRow(feature, record))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

module.exports = {
  TARGET_FIELDS,
  POST_OUTCOME_FIELDS,
  assertNoTargetLeakage,
  buildFeatureRow,
  buildFeatureRows,
};
