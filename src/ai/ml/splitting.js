const chronologicalSplit = (records, { trainRatio = 0.7, validationRatio = 0.15 } = {}) => {
  if (!Array.isArray(records)) throw new TypeError("Records must be an array.");
  if (records.length < 3) throw new Error("At least three records are required for a chronological split.");
  if (trainRatio <= 0 || validationRatio <= 0 || trainRatio + validationRatio >= 1) {
    throw new Error("Split ratios must leave a positive test set.");
  }

  const sorted = [...records].sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
  const trainEnd = Math.max(1, Math.floor(sorted.length * trainRatio));
  const validationEnd = Math.max(trainEnd + 1, Math.floor(sorted.length * (trainRatio + validationRatio)));

  return {
    train: sorted.slice(0, trainEnd),
    validation: sorted.slice(trainEnd, validationEnd),
    test: sorted.slice(validationEnd),
  };
};

const assertChronological = ({ train, validation, test }) => {
  const max = (items) => items.length ? new Date(items[items.length - 1].timestamp || items[items.length - 1].createdAt) : null;
  const min = (items) => items.length ? new Date(items[0].timestamp || items[0].createdAt) : null;
  if (max(train) && min(validation) && max(train) > min(validation)) throw new Error("Training data overlaps validation data.");
  if (max(validation) && min(test) && max(validation) > min(test)) throw new Error("Validation data overlaps test data.");
  return true;
};

module.exports = { chronologicalSplit, assertChronological };
