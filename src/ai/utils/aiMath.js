const mean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
};

const weightedMean = (values, weights) => {
  if (!values.length || values.length !== weights.length) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  values.forEach((value, index) => {
    const weight = Number(weights[index] || 0);
    weightedSum += Number(value || 0) * weight;
    weightSum += weight;
  });

  return weightSum ? weightedSum / weightSum : 0;
};

const standardDeviation = (values) => {
  if (values.length < 2) return 0;

  const average = mean(values);
  const variance =
    values.reduce((sum, value) => {
      const difference = Number(value || 0) - average;
      return sum + difference * difference;
    }, 0) / values.length;

  return Math.sqrt(variance);
};

const zScore = (value, values) => {
  const sd = standardDeviation(values);
  if (!sd) return 0;
  return (Number(value || 0) - mean(values)) / sd;
};

const percentile = (values, percentage) => {
  if (!values.length) return 0;

  const sorted = [...values]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!sorted.length) return 0;

  const position = (sorted.length - 1) * percentage;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];

  return (
    sorted[lower] +
    (sorted[upper] - sorted[lower]) * (position - lower)
  );
};

const meanAbsoluteError = (actual, predicted) => {
  if (!actual.length || actual.length !== predicted.length) return null;

  return mean(
    actual.map((value, index) =>
      Math.abs(Number(value || 0) - Number(predicted[index] || 0)),
    ),
  );
};

const meanAbsolutePercentageError = (actual, predicted) => {
  if (!actual.length || actual.length !== predicted.length) return null;

  const valid = actual
    .map((value, index) => ({
      actual: Number(value || 0),
      predicted: Number(predicted[index] || 0),
    }))
    .filter((item) => item.actual !== 0);

  if (!valid.length) return null;

  return (
    mean(
      valid.map(
        (item) =>
          Math.abs((item.actual - item.predicted) / item.actual) * 100,
      ),
    )
  );
};

module.exports = {
  mean,
  weightedMean,
  standardDeviation,
  zScore,
  percentile,
  meanAbsoluteError,
  meanAbsolutePercentageError,
};
