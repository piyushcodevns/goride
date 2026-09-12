const fs = require("fs");
const path = require("path");

const MODEL_NOT_AVAILABLE = "MODEL_NOT_AVAILABLE";
const cache = new Map();

const getArtifactDirectory = () => path.resolve(
  process.env.GORIDE_ML_ARTIFACT_DIR || path.join(process.cwd(), "ml", "artifacts"),
);

const assertSafeFeature = (feature) => {
  if (!/^[a-z][a-z0-9-]*$/i.test(feature)) throw new Error("Invalid model feature identifier.");
};

const getModel = (feature) => {
  assertSafeFeature(feature);
  if (cache.has(feature)) return cache.get(feature);

  const artifactPath = path.join(getArtifactDirectory(), `${feature}.json`);
  const relativePath = path.relative(getArtifactDirectory(), artifactPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Unsafe model artifact path.");
  }
  if (!fs.existsSync(artifactPath)) return { status: MODEL_NOT_AVAILABLE, feature };

  const metadata = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  if (!metadata.modelVersion || metadata.trainingStatus !== "TRAINED" || metadata.feature !== feature) {
    throw new Error("Invalid model metadata.");
  }
  const result = { status: "AVAILABLE", feature, artifactPath, metadata };
  cache.set(feature, result);
  return result;
};

const clearCache = () => cache.clear();
const reloadModel = (feature) => {
  cache.delete(feature);
  return getModel(feature);
};

module.exports = { MODEL_NOT_AVAILABLE, getModel, clearCache, reloadModel };
