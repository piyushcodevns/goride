const { DATASET_CONTRACTS } = require("./contracts");

const isValidDate = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const validateDataset = (feature, records, { now = new Date() } = {}) => {
  const contract = DATASET_CONTRACTS[feature];
  if (!contract) throw new Error(`Unknown ML dataset contract: ${feature}`);
  if (!Array.isArray(records)) throw new TypeError("Dataset records must be an array.");

  const errors = [];
  const seenIds = new Set();
  let earliest = null;
  let latest = null;

  records.forEach((record, index) => {
    const prefix = `records[${index}]`;
    if (!record || typeof record !== "object") {
      errors.push({ index, reason: "RECORD_MUST_BE_OBJECT" });
      return;
    }

    for (const field of contract.requiredFields) {
      if (record[field] === undefined || record[field] === null || record[field] === "") {
        errors.push({ index, field, reason: "REQUIRED_FIELD_MISSING" });
      }
    }

    if (!record.id || seenIds.has(record.id)) {
      errors.push({ index, field: "id", reason: seenIds.has(record.id) ? "DUPLICATE_RECORD" : "ID_REQUIRED" });
    } else {
      seenIds.add(record.id);
    }

    if (!isValidDate(record[contract.timestamp])) {
      errors.push({ index, field: contract.timestamp, reason: "INVALID_DATE" });
    } else {
      const timestamp = new Date(record[contract.timestamp]);
      if (timestamp > now) errors.push({ index, field: contract.timestamp, reason: "FUTURE_RECORD" });
      if (!earliest || timestamp < earliest) earliest = timestamp;
      if (!latest || timestamp > latest) latest = timestamp;
    }

    if (contract.allowedStatuses && !contract.allowedStatuses.includes(record.status)) {
      errors.push({ index, field: "status", reason: "UNSUPPORTED_STATUS" });
    }

    for (const field of ["distance", "finalFare", "amount", "rating", "actualDuration"]) {
      if (record[field] !== undefined && !isFiniteNumber(record[field])) {
        errors.push({ index, field, reason: "INVALID_NUMERIC_VALUE" });
      }
    }
  });

  const timeCoverageDays = earliest && latest
    ? (latest.getTime() - earliest.getTime()) / 86400000
    : 0;

  return {
    valid: errors.length === 0,
    errors,
    observations: records.length,
    uniqueObservations: seenIds.size,
    timeCoverageDays: Number(timeCoverageDays.toFixed(4)),
    range: earliest && latest ? { from: earliest.toISOString(), to: latest.toISOString() } : null,
  };
};

const cleanDataset = (feature, records, options = {}) => {
  const validation = validateDataset(feature, records, options);
  const invalidIndexes = new Set(validation.errors.map((error) => error.index));
  const cleanedRecords = records.filter((_, index) => !invalidIndexes.has(index));
  return {
    ...validation,
    cleanedRecords,
    removedRecords: records.length - cleanedRecords.length,
  };
};

module.exports = {
  validateDataset,
  cleanDataset,
  isValidDate,
  isFiniteNumber,
};
