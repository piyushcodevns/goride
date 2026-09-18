const { DATASET_CONTRACTS } = require("./contracts");

const assessReadiness = (feature, validation) => {
  const contract = DATASET_CONTRACTS[feature];
  if (!contract) throw new Error(`Unknown ML dataset contract: ${feature}`);
  if (contract.requiresTrustedLabels && validation.trustedLabels !== true) {
    return { status: "DATA_BLOCKED", reason: "TRUSTED_LABELS_REQUIRED", ...contract };
  }
  if (!validation.valid) return { status: "INSUFFICIENT_DATA", reason: "DATASET_VALIDATION_FAILED", ...contract };
  if (validation.observations < contract.minimumSamples) {
    return { status: "INSUFFICIENT_DATA", reason: "MINIMUM_SAMPLES_NOT_MET", ...contract };
  }
  if (
    (contract.minimumPositiveSamples && (validation.classBalance?.positive || 0) < contract.minimumPositiveSamples) ||
    (contract.minimumNegativeSamples && (validation.classBalance?.negative || 0) < contract.minimumNegativeSamples)
  ) {
    return { status: "INSUFFICIENT_DATA", reason: "CLASS_BALANCE_NOT_MET", ...contract };
  }
  if (validation.timeCoverageDays < contract.minimumTimeCoverageDays) {
    return { status: "INSUFFICIENT_DATA", reason: "MINIMUM_TIME_COVERAGE_NOT_MET", ...contract };
  }
  return { status: "READY", reason: "DATASET_READY", ...contract };
};

const assessClassBalance = (labels, { minimumPositiveSamples = 0, minimumNegativeSamples = 0 } = {}) => {
  const positive = labels.filter(Boolean).length;
  const negative = labels.length - positive;
  return {
    ready: positive >= minimumPositiveSamples && negative >= minimumNegativeSamples,
    positive,
    negative,
  };
};

module.exports = { assessReadiness, assessClassBalance };
