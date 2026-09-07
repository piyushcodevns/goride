# GoRide AI/ML Chat 5

## Current state

Chat 5 adds the ML-readiness infrastructure without manufacturing training data. The
production database currently has one completed ride, no reviews, no payments, no
coupon usages, and no persisted weather or actual trip-duration history. Therefore
no ML artifact is generated and no ML metrics are claimed.

Existing predictors remain the production fallback. Their responses are statistical
or heuristic intelligence, not trained ML.

## Dataset contracts

Contracts live in `src/ai/ml/contracts.js`. They define source fields, target,
availability timestamp, minimum samples, minimum time coverage, and (for
classification) class-balance requirements. `datasetPipeline.js` rejects missing
fields, invalid numbers/dates, future records, unsupported statuses, and duplicate
IDs.

The pipeline is intentionally record-based so it can consume Prisma query results
without copying private user data into a separate store.

## Feature and leakage rules

`featureEngineering.js` only emits fields available at booking/observation time.
Targets and post-outcome fields are rejected by `assertNoTargetLeakage`. Splits in
`splitting.js` are chronological: 70% train, 15% validation, and 15% test.

ETA must use persisted actual trip duration. Maps/ORS estimated duration is never
treated as the target. Weather requires persisted weather observations joined to
ride outcomes. Fraud requires independently confirmed labels.

## Training and evaluation

`training.js` produces a training plan only after the relevant contract is ready.
It does not train on insufficient data. `evaluation.js` provides real regression
(MAE, RMSE, MAPE, R²) and binary-classification (precision, recall, F1, confusion
matrix) metrics for held-out predictions. Metrics are never fabricated.

## Artifacts and fallback

`modelRegistry.js` loads only trusted, configured JSON metadata manifests from
`GORIDE_ML_ARTIFACT_DIR` (default `ml/artifacts`). It rejects unsafe feature names
and metadata that is not marked `TRAINED`; loaded models are cached. There are
currently no artifacts.

The existing AI Core reports capability status using this order:

```text
validated ML artifact -> existing statistical/heuristic fallback -> blocked or insufficient data
```

`/api/admin/ai/status` now includes `mlTrainingStatus` and `capabilityStatuses`
without removing the existing feature status fields.

## Unlock requirements

- ETA: actual completed-trip duration, route/time/traffic context.
- Weather: persisted weather observations joined by time and location.
- Fraud: trusted confirmed fraud labels with legitimate negative examples.
- Churn: enough users with completed future outcome windows.
- All other supervised models: enough historical observations spanning the
  contract's minimum time window and an untouched chronological test set.

## Reproducible data audit

`datasetRepository.js` extracts rides, successful payments, and reviews through
Prisma with explicit selected fields. `availabilityReport.js` combines those
datasets with read-only aggregate counts and reports samples, date ranges,
daily/hourly coverage, vehicle and driver coverage, and per-feature readiness.
Run `node src/scripts/auditAiMlData.js` to produce the current machine-readable
report. The report is generated from live PostgreSQL data; it does not export,
edit, or seed records.

Use `node src/scripts/auditAiMlData.js --human` for a compact human-readable
feature matrix.

## Monitoring

`predictionMonitoring.js` records only feature, trusted model version, source,
timestamp, and latency. Drift monitoring remains
`DRIFT_MONITORING_NOT_READY` until at least 30 predictions and 30 known outcomes
exist. No drift percentage is emitted without those observations.
