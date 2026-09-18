const logger = require("../utils/logger");

/**
 * Process scheduled ride jobs (activation and periodic sweeps).
 * Idempotent: safe to re-run; will not re-activate or duplicate transitions.
 */
const processScheduledRideJob = async (job) => {
  const rideService = require("../services/ride.service");
  const jobName = job.name;
  const data = job.data || {};

  logger.info("Processing scheduled ride job.", {
    jobId: job.id,
    jobName,
    data,
  });

  if (jobName === "activate-scheduled-ride") {
    const { rideId } = data;
    if (!rideId) {
      throw new Error("rideId is required to activate scheduled ride.");
    }

    const result = await rideService.activateScheduledRide(rideId);
    logger.info("Scheduled ride activation processed.", {
      rideId,
      result,
    });

    return result;
  }

  if (jobName === "sweep-scheduled-rides") {
    const result = await rideService.processDueScheduledRides();
    logger.info("Scheduled ride sweep completed.", {
      activatedCount: result?.activatedCount || 0,
    });

    return result;
  }

  throw new Error(`Unknown scheduled ride job name: ${jobName}`);
};

module.exports = {
  processScheduledRideJob,
};
