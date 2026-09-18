const prisma = require("../config/prisma");
const logger = require("../utils/logger");
const adminBackupService = require("../services/admin/adminBackup.service");

/**
 * Clean up expired or revoked admin sessions with bounded limit.
 */
const cleanExpiredAdminSessions = async (batchLimit = 100) => {
  try {
    const expiredSessions = await prisma.adminSession.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true },
        ],
      },
      select: { id: true },
      take: batchLimit,
    });

    if (expiredSessions.length === 0) {
      return 0;
    }

    const ids = expiredSessions.map((s) => s.id);
    const deleteResult = await prisma.adminSession.deleteMany({
      where: { id: { in: ids } },
    });

    logger.info("Expired admin sessions cleaned up.", {
      count: deleteResult.count,
    });

    return deleteResult.count;
  } catch (error) {
    logger.error("Failed to clean up expired admin sessions.", {
      error: error.message,
    });
    return 0;
  }
};

/**
 * Clean up expired password reset and email verification tokens.
 */
const cleanExpiredUserTokens = async (batchLimit = 100) => {
  try {
    const now = new Date();
    const expiredUsers = await prisma.user.findMany({
      where: {
        OR: [
          { passwordResetExpires: { lt: now } },
          { emailVerificationExpires: { lt: now } },
        ],
      },
      select: { id: true },
      take: batchLimit,
    });

    if (expiredUsers.length === 0) {
      return 0;
    }

    const ids = expiredUsers.map((u) => u.id);
    const updateResult = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    logger.info("Expired user verification tokens cleared.", {
      count: updateResult.count,
    });

    return updateResult.count;
  } catch (error) {
    logger.error("Failed to clear expired user tokens.", {
      error: error.message,
    });
    return 0;
  }
};

/**
 * Clean up old sent notifications past 90-day retention window.
 */
const cleanStaleNotifications = async (batchLimit = 200) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const staleNotifications = await prisma.notification.findMany({
      where: {
        status: "SENT",
        createdAt: { lt: ninetyDaysAgo },
      },
      select: { id: true },
      take: batchLimit,
    });

    if (staleNotifications.length === 0) {
      return 0;
    }

    const ids = staleNotifications.map((n) => n.id);
    const deleteResult = await prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });

    logger.info("Stale notifications cleaned up.", {
      count: deleteResult.count,
    });

    return deleteResult.count;
  } catch (error) {
    logger.error("Failed to clean up stale notifications.", {
      error: error.message,
    });
    return 0;
  }
};

/**
 * Process maintenance cleanup job with failure isolation.
 */
const processCleanupJob = async (job) => {
  const type = job.data?.type || "full";
  const startTime = Date.now();

  logger.info("System cleanup job started.", {
    jobId: job.id,
    type,
  });

  const summary = {
    type,
    cleanedSessions: 0,
    cleanedTokens: 0,
    cleanedNotifications: 0,
    cleanedBackups: 0,
    errors: [],
  };

  if (type === "full" || type === "sessions") {
    summary.cleanedSessions = await cleanExpiredAdminSessions();
  }

  if (type === "full" || type === "tokens") {
    summary.cleanedTokens = await cleanExpiredUserTokens();
  }

  if (type === "full" || type === "notifications") {
    summary.cleanedNotifications = await cleanStaleNotifications();
  }

  if (type === "full" || type === "backups") {
    try {
      await adminBackupService.cleanupExpiredBackups();
      summary.cleanedBackups = 1;
    } catch (err) {
      summary.errors.push({ task: "backups", error: err.message });
      logger.error("Backup cleanup failed during system cleanup.", {
        error: err.message,
      });
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info("System cleanup job completed.", {
    jobId: job.id,
    durationMs,
    summary,
  });

  return {
    success: true,
    durationMs,
    summary,
  };
};

module.exports = {
  cleanExpiredAdminSessions,
  cleanExpiredUserTokens,
  cleanStaleNotifications,
  processCleanupJob,
};
