const path = require("path");

const createModelMetadata = ({
  feature,
  modelVersion,
  algorithm,
  featureList,
  target,
  datasetRange,
  sampleCount,
  trainCount,
  validationCount,
  testCount,
  metrics,
  artifactPath,
}) => {
  if (!feature || !modelVersion || !algorithm || !Array.isArray(featureList) || !target) {
    throw new Error("Model metadata is missing required fields.");
  }
  if (![sampleCount, trainCount, validationCount, testCount].every(Number.isInteger)) {
    throw new Error("Model metadata counts must be integers.");
  }
  if (trainCount + validationCount + testCount !== sampleCount) {
    throw new Error("Model metadata split counts must equal sampleCount.");
  }
  if (!datasetRange?.from || !datasetRange?.to || !metrics || !artifactPath) {
    throw new Error("Model metadata requires dataset range, metrics, and artifact path.");
  }

  return {
    feature,
    modelName: `GoRide ${feature} model`,
    modelVersion,
    algorithm,
    featureList: [...featureList],
    target,
    trainingTimestamp: new Date().toISOString(),
    datasetRange: {
      from: new Date(datasetRange.from).toISOString(),
      to: new Date(datasetRange.to).toISOString(),
    },
    sampleCount,
    trainCount,
    validationCount,
    testCount,
    metrics: { ...metrics },
    trainingStatus: "TRAINED",
    artifactPath: path.basename(artifactPath),
  };
};

module.exports = { createModelMetadata };
