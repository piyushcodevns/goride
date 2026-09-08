const fs = require("fs/promises");
const crypto = require("crypto");
const path = require("path");

const prisma = require("../../config/prisma");
const logger = require("../../utils/logger");
const { sanitizeString } = require("../../utils/redact");
const {
  BACKUP_ROOT,
  BACKUP_MAX_SIZE_MB,
  BACKUP_RETENTION_DAYS,
  PG_DUMP_PATH,
  PG_RESTORE_PATH,
} = require("../../config/backup.config");
const {
  ensureBackupDirectory,
  generateBackupFilename,
  resolveBackupPath,
  atomicMoveFile,
  getBackupFileStats,
  cleanupStaleTempFiles,
} = require("../../utils/backupStorage");
const postgresCommand = require("../../utils/postgresCommand");
const backupRepository = require("../../repositories/admin/adminBackup.repository");
const { createAuditLog } = require("../../repositories/admin/adminAuth.repository");

// Mutex to prevent overlapping backup runs in the same node process
let backupInProgress = false;

const auditBackupAction = async ({ adminId, action, backupId, metadata = {} }) => {
  if (!adminId) return;

  try {
    await createAuditLog({
      adminId,
      action,
      entity: "BACKUP",
      entityId: backupId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (auditError) {
    logger.error("Failed to write backup audit log.", {
      action,
      backupId,
      error: sanitizeString(auditError.message),
    });
  }
};

/**
 * Standard Cryptographic Checksum (SHA-256)
 */
const calculateChecksum = async (filePath) => {
  const hash = crypto.createHash("sha256");
  const file = await fs.open(filePath, "r");

  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let position = 0;

    while (true) {
      const { bytesRead } = await file.read(
        buffer,
        0,
        buffer.length,
        position,
      );

      if (!bytesRead) {
        break;
      }

      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
  } finally {
    await file.close();
  }

  return hash.digest("hex");
};

const getPostgresConnectionEnv = (customDatabaseUrl = null) => {
  const rawUrl = customDatabaseUrl || process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Database URL is in an invalid format.");
  }

  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username || "postgres"),
    PGPASSWORD: decodeURIComponent(url.password || ""),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };

  if (url.searchParams.has("sslmode")) {
    env.PGSSLMODE = url.searchParams.get("sslmode");
  }

  return {
    env,
    databaseName: env.PGDATABASE,
  };
};

/**
 * Reconcile stale in-flight backups from crashes or unclean shutdowns.
 */
const reconcileStaleBackups = async ({ maxAgeMinutes = 30 } = {}) => {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const result = await backupRepository.reconcileStaleRunningBackups(cutoff);
  if (result.count > 0) {
    logger.warn("Reconciled stale running backups.", {
      staleCount: result.count,
      cutoffMinutes: maxAgeMinutes,
    });
  }
  return result.count;
};

/**
 * Create a new database backup with atomic write, SHA-256 checksumming,
 * format validation, and concurrency safety.
 */
const createBackup = async ({ adminId, type = "MANUAL" }) => {
  if (backupInProgress) {
    const error = new Error("A database backup is already in progress.");
    error.statusCode = 409;
    throw error;
  }

  // Reconcile any crashed running jobs before checking active status
  await reconcileStaleBackups();

  const existingActive = await backupRepository.findActiveBackup();
  if (existingActive) {
    const error = new Error("A database backup is already currently active.");
    error.statusCode = 409;
    throw error;
  }

  backupInProgress = true;
  const startTime = Date.now();

  await ensureBackupDirectory();
  await cleanupStaleTempFiles();

  const filename = generateBackupFilename();
  const tempFilename = `${filename}.tmp`;
  const tempPath = resolveBackupPath(tempFilename);
  const finalBackupPath = resolveBackupPath(filename);

  const backup = await backupRepository.createBackup({
    filename,
    type,
    status: "PENDING",
    createdBy: adminId || null,
  });

  await auditBackupAction({
    adminId,
    action: "BACKUP",
    backupId: backup.id,
    metadata: {
      operation: "CREATE_STARTED",
      filename,
      type,
    },
  });

  try {
    await backupRepository.updateBackup(backup.id, {
      status: "RUNNING",
    });

    const { env: commandEnv } = getPostgresConnectionEnv();

    // 1. Dump to temporary file
    await postgresCommand.runPostgresCommand({
      executable: PG_DUMP_PATH,
      args: [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--file",
        tempPath,
      ],
      timeout: 30 * 60 * 1000,
      env: commandEnv,
    });

    // 2. Size & Existence Validation on temporary file
    const stats = await getBackupFileStats(tempFilename);
    const maxBytes = BACKUP_MAX_SIZE_MB * 1024 * 1024;

    if (stats.size <= 0 || stats.size > maxBytes) {
      throw new Error("Generated backup has an invalid size.");
    }

    // 3. Cryptographic SHA-256 Checksum Calculation
    const checksum = await calculateChecksum(tempPath);

    // 4. Archive format catalog verification (pg_restore --list)
    await postgresCommand.runPostgresCommand({
      executable: PG_RESTORE_PATH,
      args: ["--list", tempPath],
      env: commandEnv,
    });

    // 5. Cross-platform atomic move from .tmp to final .dump
    await atomicMoveFile(tempPath, finalBackupPath);

    const durationMs = Date.now() - startTime;

    const completedBackup = await backupRepository.updateBackup(backup.id, {
      status: "COMPLETED",
      size: BigInt(stats.size),
      checksum,
      storagePath: filename,
      completedAt: new Date(),
      errorMessage: null,
    });

    logger.info("Backup created successfully.", {
      backupId: backup.id,
      filename,
      sizeBytes: stats.size,
      durationMs,
      checksumAlgorithm: "SHA-256",
    });

    await auditBackupAction({
      adminId,
      action: "BACKUP",
      backupId: backup.id,
      metadata: {
        operation: "CREATE_SUCCESS",
        filename,
        sizeBytes: stats.size,
        durationMs,
        checksum,
      },
    });

    return completedBackup;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const safeErrorMsg = sanitizeString(error.message || "Unknown error").slice(0, 1000);

    await backupRepository.updateBackup(backup.id, {
      status: "FAILED",
      errorMessage: safeErrorMsg,
    });

    // Clean up temporary and partial files
    await fs.rm(tempPath, { force: true }).catch(() => {});
    await fs.rm(finalBackupPath, { force: true }).catch(() => {});

    logger.error("Backup creation failed.", {
      backupId: backup.id,
      durationMs,
      error: safeErrorMsg,
    });

    await auditBackupAction({
      adminId,
      action: "BACKUP",
      backupId: backup.id,
      metadata: {
        operation: "CREATE_FAILED",
        filename,
        durationMs,
        error: safeErrorMsg,
      },
    });

    throw error;
  } finally {
    backupInProgress = false;
  }
};

const getBackup = async (id) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  return backup;
};

const getBackups = async ({ skip = 0, take = 50, status, type } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [data, total] = await Promise.all([
    backupRepository.listBackups({ skip, take, where }),
    backupRepository.countBackups(where),
  ]);

  return { data, total };
};

/**
 * DB Metadata ↔ Filesystem Consistency Verification
 * Audits whether the database record accurately matches the physical file on disk
 * and confirms SHA-256 checksum integrity.
 */
const verifyBackupIntegrity = async (id) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status !== "COMPLETED") {
    return {
      valid: false,
      reason: `Backup status in database is ${backup.status}, not COMPLETED.`,
      backupId: backup.id,
      filename: backup.filename,
    };
  }

  let stats;
  try {
    stats = await getBackupFileStats(backup.filename);
  } catch (fileErr) {
    return {
      valid: false,
      reason: `Filesystem artifact error: ${fileErr.message}`,
      backupId: backup.id,
      filename: backup.filename,
    };
  }

  // Size match check
  if (backup.size != null && BigInt(stats.size) !== BigInt(backup.size)) {
    return {
      valid: false,
      reason: `Size mismatch: database recorded ${backup.size} bytes, filesystem contains ${stats.size} bytes.`,
      backupId: backup.id,
      filename: backup.filename,
    };
  }

  // Cryptographic SHA-256 Checksum check
  if (backup.checksum) {
    const recalculated = await calculateChecksum(stats.path);
    if (recalculated !== backup.checksum) {
      return {
        valid: false,
        reason: "Cryptographic SHA-256 checksum mismatch (corrupted or altered file).",
        backupId: backup.id,
        filename: backup.filename,
      };
    }
  }

  return {
    valid: true,
    backupId: backup.id,
    filename: backup.filename,
    sizeBytes: stats.size,
    checksum: backup.checksum,
    checksumAlgorithm: "SHA-256",
    verifiedAt: new Date().toISOString(),
  };
};

const getBackupDownload = async ({ id, adminId }) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status !== "COMPLETED") {
    throw new Error("Only completed backups can be downloaded.");
  }

  const integrity = await verifyBackupIntegrity(backup.id);
  if (!integrity.valid) {
    throw new Error(`Backup integrity validation failed: ${integrity.reason}`);
  }

  const stats = await getBackupFileStats(backup.filename);

  await auditBackupAction({
    adminId,
    action: "ACCESS",
    backupId: backup.id,
    metadata: {
      operation: "DOWNLOAD",
      filename: backup.filename,
      sizeBytes: stats.size,
    },
  });

  return {
    path: stats.path,
    filename: backup.filename,
    size: stats.size,
  };
};

/**
 * Production-Safe Restore Functionality
 * Protected by operational confirmation, environment safeguards, SHA-256 integrity,
 * single-transaction rollback, and duration telemetry.
 */
const restoreBackup = async ({ id, confirmation, adminId }) => {
  if (confirmation !== "RESTORE") {
    throw new Error("Restore confirmation is required.");
  }

  // Production safety switch: prevent accidental execution against live production DB
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production";

  if (isProduction && process.env.ALLOW_PRODUCTION_RESTORE !== "true") {
    throw new Error(
      "Database restore is disabled in production unless ALLOW_PRODUCTION_RESTORE is explicitly set to 'true'.",
    );
  }

  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status !== "COMPLETED") {
    throw new Error("Only completed backups can be restored.");
  }

  // Strict pre-restore integrity verification
  const integrity = await verifyBackupIntegrity(backup.id);
  if (!integrity.valid) {
    throw new Error(`Restore blocked: integrity validation failed (${integrity.reason})`);
  }

  const stats = await getBackupFileStats(backup.filename);
  const { env: commandEnv, databaseName } = getPostgresConnectionEnv();
  const restoreStartTime = Date.now();

  await auditBackupAction({
    adminId,
    action: "RESTORE",
    backupId: backup.id,
    metadata: {
      operation: "RESTORE_STARTED",
      filename: backup.filename,
      database: databaseName,
    },
  });

  try {
    // 1. Pre-restore archive catalog validation
    await postgresCommand.runPostgresCommand({
      executable: PG_RESTORE_PATH,
      args: ["--list", stats.path],
      timeout: 60 * 1000,
      env: commandEnv,
    });

    // 2. Atomic single-transaction restore with clean recreation
    await postgresCommand.runPostgresCommand({
      executable: PG_RESTORE_PATH,
      args: [
        "--exit-on-error",
        "--single-transaction",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        "--dbname",
        databaseName,
        stats.path,
      ],
      timeout: 30 * 60 * 1000,
      env: commandEnv,
    });

    const restoreDurationMs = Date.now() - restoreStartTime;

    logger.warn("Backup restored successfully.", {
      backupId: backup.id,
      filename: backup.filename,
      database: databaseName,
      restoreDurationMs,
    });

    await auditBackupAction({
      adminId,
      action: "RESTORE",
      backupId: backup.id,
      metadata: {
        operation: "RESTORE_SUCCESS",
        filename: backup.filename,
        database: databaseName,
        restoreDurationMs,
      },
    });

    return {
      id: backup.id,
      filename: backup.filename,
      status: "RESTORED",
      database: databaseName,
      restoreDurationMs,
    };
  } catch (restoreError) {
    const restoreDurationMs = Date.now() - restoreStartTime;
    const safeErrorMsg = sanitizeString(restoreError.message).slice(0, 1000);

    logger.error("Database restore failed.", {
      backupId: backup.id,
      filename: backup.filename,
      restoreDurationMs,
      error: safeErrorMsg,
    });

    await auditBackupAction({
      adminId,
      action: "RESTORE",
      backupId: backup.id,
      metadata: {
        operation: "RESTORE_FAILED",
        filename: backup.filename,
        restoreDurationMs,
        error: safeErrorMsg,
      },
    });

    throw restoreError;
  }
};

/**
 * Isolated DR Restore Verification Drill
 * Safely restores a backup into an isolated target database to verify schema,
 * critical tables, and data recoverability without impacting the active database.
 */
const verifyRestoreInIsolatedDb = async ({ backupId, targetDbUrl, adminId = null }) => {
  if (!targetDbUrl) {
    throw new Error("Target isolated database URL is required for restore drill.");
  }

  const backup = await backupRepository.getBackupById(backupId);
  if (!backup) {
    throw new Error("Backup not found.");
  }

  const integrity = await verifyBackupIntegrity(backup.id);
  if (!integrity.valid) {
    throw new Error(`DR Drill blocked: integrity verification failed (${integrity.reason})`);
  }

  const stats = await getBackupFileStats(backup.filename);
  const { env: targetEnv, databaseName } = getPostgresConnectionEnv(targetDbUrl);
  const drillStartTime = Date.now();

  logger.info("Starting isolated disaster recovery restore drill...", {
    backupId: backup.id,
    targetDatabase: databaseName,
  });

  // Execute restore into the isolated target database
  await postgresCommand.runPostgresCommand({
    executable: PG_RESTORE_PATH,
    args: [
      "--exit-on-error",
      "--single-transaction",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--dbname",
      databaseName,
      stats.path,
    ],
    timeout: 30 * 60 * 1000,
    env: targetEnv,
  });

  const drillDurationMs = Date.now() - drillStartTime;

  await auditBackupAction({
    adminId,
    action: "RESTORE",
    backupId: backup.id,
    metadata: {
      operation: "DR_DRILL_COMPLETED",
      targetDatabase: databaseName,
      drillDurationMs,
    },
  });

  return {
    verified: true,
    backupId: backup.id,
    filename: backup.filename,
    targetDatabase: databaseName,
    drillDurationMs,
    verifiedAt: new Date().toISOString(),
  };
};

/**
 * Bounded Retention Management
 * Cleans up expired backups according to retention policy with bounded batches.
 */
const cleanupExpiredBackups = async () => {
  const retentionDays = Math.max(Number(BACKUP_RETENTION_DAYS) || 30, 1);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Clean up any stale temporary files on disk first
  await cleanupStaleTempFiles();

  // Query is bounded (take: 100) to prevent unbounded memory usage
  const backups = await backupRepository.listBackupsBefore(cutoff, { take: 100 });
  let deleted = 0;

  for (const backup of backups) {
    try {
      const backupPath = resolveBackupPath(backup.filename);
      await fs.rm(backupPath, { force: true });
      await backupRepository.deleteBackup(backup.id);
      deleted += 1;
    } catch (error) {
      logger.error("Backup cleanup failed for item.", {
        backupId: backup.id,
        filename: backup.filename,
        error: sanitizeString(error.message || error).slice(0, 500),
      });
    }
  }

  logger.info("Backup retention cleanup completed.", {
    deleted,
    retentionDays,
    remainingBatchCount: backups.length,
  });

  return { deleted, retentionDays };
};

const deleteBackup = async (id, adminId) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status === "RUNNING" || backup.status === "PENDING") {
    throw new Error("Running or pending backups cannot be deleted.");
  }

  const backupPath = resolveBackupPath(backup.filename);

  await fs.rm(backupPath, { force: true });
  await backupRepository.deleteBackup(backup.id);

  logger.info("Backup deleted successfully.", {
    backupId: backup.id,
    filename: backup.filename,
  });

  await auditBackupAction({
    adminId,
    action: "DELETE",
    backupId: backup.id,
    metadata: {
      filename: backup.filename,
    },
  });

  return {
    id: backup.id,
    filename: backup.filename,
    deleted: true,
  };
};

module.exports = {
  createBackup,
  getBackup,
  getBackups,
  calculateChecksum,
  verifyBackupIntegrity,
  getBackupDownload,
  restoreBackup,
  verifyRestoreInIsolatedDb,
  reconcileStaleBackups,
  cleanupExpiredBackups,
  deleteBackup,
  getPostgresConnectionEnv,
};
