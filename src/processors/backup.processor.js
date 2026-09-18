const backupService = require("../services/admin/adminBackup.service");
const logger = require("../utils/logger");

/**
 * Process scheduled backup job.
 */
const processBackupJob = async (job) => {
  if (job.name !== "scheduled-backup") {
    throw new Error(`Unknown backup job name: ${job.name}`);
  }

  logger.info("Starting scheduled database backup job.", { jobId: job.id });

  const backup = await backupService.createBackup({
    adminId: null,
    type: "SCHEDULED",
  });

  await backupService.cleanupExpiredBackups();

  logger.info("Scheduled backup job successfully finished.", {
    jobId: job.id,
    backupId: backup.id,
    filename: backup.filename,
  });

  return {
    id: backup.id,
    filename: backup.filename,
    status: backup.status,
  };
};

module.exports = {
  processBackupJob,
};
