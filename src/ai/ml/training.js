const { DATASET_CONTRACTS } = require("./contracts");
const { assessReadiness, assessClassBalance } = require("./readiness");
const { chronologicalSplit, assertChronological } = require("./splitting");

const prepareTrainingPlan = (feature, records, validation, options = {}) => {
  const readiness = assessReadiness(feature, validation);
  if (readiness.status !== "READY") {
    return { status: readiness.status, feature, reason: readiness.reason, contract: DATASET_CONTRACTS[feature] };
  }
  const split = chronologicalSplit(records, options);
  assertChronological(split);
  return {
    status: "READY",
    feature,
    algorithmFamily: feature === "cancellation" || feature === "fraud" ? "classification" : "regression_or_classification",
    splitCounts: {
      train: split.train.length,
      validation: split.validation.length,
      test: split.test.length,
    },
    split,
  };
};

const validateClassificationReadiness = (labels, contract) =>
  assessClassBalance(labels, contract);

module.exports = { prepareTrainingPlan, validateClassificationReadiness };
