const {
  meanAbsoluteError,
  meanAbsolutePercentageError,
} = require("../utils/aiMath");

const evaluateDemandPredictions = ({
  actual,
  predicted,
}) => {
  if (!Array.isArray(actual) || !Array.isArray(predicted)) {
    throw new Error("actual and predicted must be arrays");
  }

  if (!actual.length || actual.length !== predicted.length) {
    return {
      observations: 0,
      mae: null,
      mape: null,
      status: "INSUFFICIENT_DATA",
    };
  }

  const normalizedActual = actual.map(Number);
  const normalizedPredicted = predicted.map(Number);

  return {
    observations: normalizedActual.length,
    mae: meanAbsoluteError(
      normalizedActual,
      normalizedPredicted,
    ),
    mape: meanAbsolutePercentageError(
      normalizedActual,
      normalizedPredicted,
    ),
    status: "READY",
  };
};

module.exports = {
  evaluateDemandPredictions,
};
