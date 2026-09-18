const MONITORING_STATUS = Object.freeze({
  READY: "READY",
  NOT_READY: "DRIFT_MONITORING_NOT_READY",
});

const buildPredictionRecord = ({
  feature,
  modelVersion,
  source,
  startedAt,
  completedAt,
}) => {
  if (!feature || !modelVersion || !source || !startedAt || !completedAt) {
    throw new Error("Prediction monitoring requires feature, model, source, and timestamps.");
  }
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new Error("Prediction monitoring timestamps are invalid.");
  }
  return {
    feature,
    modelVersion,
    source,
    predictionTimestamp: end.toISOString(),
    latencyMs: end.getTime() - start.getTime(),
  };
};

const assessDriftReadiness = ({ observations = 0, outcomes = 0 } = {}) => ({
  status: observations >= 30 && outcomes >= 30 ? MONITORING_STATUS.READY : MONITORING_STATUS.NOT_READY,
  observations,
  outcomes,
  reason: observations >= 30 && outcomes >= 30
    ? "SUFFICIENT_MONITORING_HISTORY"
    : "INSUFFICIENT_PREDICTION_OUTCOME_HISTORY",
});

module.exports = { MONITORING_STATUS, buildPredictionRecord, assessDriftReadiness };
