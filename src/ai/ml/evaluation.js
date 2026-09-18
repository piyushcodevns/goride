const assertComparable = (actual, predicted) => {
  if (!Array.isArray(actual) || !Array.isArray(predicted) || actual.length === 0 || actual.length !== predicted.length) {
    throw new Error("Actual and predicted arrays must have equal non-zero length.");
  }
};

const evaluateRegression = (actual, predicted) => {
  assertComparable(actual, predicted);
  const pairs = actual.map((value, index) => [Number(value), Number(predicted[index])]);
  if (pairs.some(([a, p]) => !Number.isFinite(a) || !Number.isFinite(p))) throw new Error("Regression values must be finite.");
  const mean = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
  const errors = pairs.map(([a, p]) => a - p);
  const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / pairs.length;
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / pairs.length);
  const nonZero = pairs.filter(([a]) => a !== 0);
  const mape = nonZero.length
    ? nonZero.reduce((sum, [a, p]) => sum + Math.abs((a - p) / a), 0) / nonZero.length * 100
    : null;
  const total = pairs.reduce((sum, [a]) => sum + (a - mean) ** 2, 0);
  const residual = errors.reduce((sum, error) => sum + error ** 2, 0);
  return { mae, rmse, mape, r2: total === 0 ? null : 1 - residual / total, observations: pairs.length };
};

const evaluateBinaryClassification = (actual, predicted) => {
  assertComparable(actual, predicted);
  const pairs = actual.map((value, index) => [Boolean(value), Number(predicted[index])]);
  if (pairs.some(([, probability]) => !Number.isFinite(probability) || probability < 0 || probability > 1)) {
    throw new Error("Classification predictions must be probabilities between 0 and 1.");
  }
  let tp = 0; let fp = 0; let tn = 0; let fn = 0;
  for (const [label, probability] of pairs) {
    const prediction = probability >= 0.5;
    if (prediction && label) tp += 1;
    else if (prediction) fp += 1;
    else if (label) fn += 1;
    else tn += 1;
  }
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision !== null && recall !== null && precision + recall
    ? (2 * precision * recall) / (precision + recall)
    : null;
  return { precision, recall, f1, confusionMatrix: { tp, fp, tn, fn }, observations: pairs.length };
};

module.exports = { evaluateRegression, evaluateBinaryClassification };
