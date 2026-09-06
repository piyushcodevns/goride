const fs = require("fs/promises");
const crypto = require("crypto");
const path = require("path");

const prisma = require("../../config/prisma");
const logger = require("../../utils/logger");
const {
  BACKUP_ROOT,
  BACKUP_MAX_SIZE_MB,
} = require("../../config/backup.config");
const {
  ensureBackupDirectory,
  generateBackupFilename,
  resolveBackupPath,
  getBackupFileStats,
} = require("../../utils/backupStorage");
const { runPostgresCommand } = require("../../utils/postgresCommand");
const backupRepository = require("../../repositories/admin/adminBackup.repository");
const { createAuditLog } = require("../../repositories/admin/adminAuth.repository");
const { BACKUP_RETENTION_DAYS } = require("../../config/backup.config");


const auditBackupAction = async ({ adminId, action, backupId, metadata = {} }) => {
  if (!adminId) return;

  await createAuditLog({
    adminId,
    action,
    entity: "BACKUP",
    entityId: backupId,
    metadata,
  });
};


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

const getPostgresConnectionEnv = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const url = new URL(process.env.DATABASE_URL);

  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };

  if (url.searchParams.has("sslmode")) {
    env.PGSSLMODE = url.searchParams.get("sslmode");
  }

  return env;
};

const createBackup = async ({ adminId, type = "MANUAL" }) => {
  await ensureBackupDirectory();

  const filename = generateBackupFilename();
  const backupPath = resolveBackupPath(filename);

  const backup = await backupRepository.createBackup({
    filename,
    type,
    status: "PENDING",
    createdBy: adminId || null,
  });

  try {
    await backupRepository.updateBackup(backup.id, {
      status: "RUNNING",
    });

    const pgDumpPath =
      process.env.PG_DUMP_PATH || "pg_dump";

    const commandEnv = getPostgresConnectionEnv();

    await runPostgresCommand({
      executable: pgDumpPath,
      args: [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--file",
        backupPath,
      ],
      timeout: 30 * 60 * 1000,
      env: commandEnv,
    });

    const stats = await getBackupFileStats(filename);

    const maxBytes = BACKUP_MAX_SIZE_MB * 1024 * 1024;

    if (stats.size <= 0 || stats.size > maxBytes) {
      throw new Error("Generated backup has an invalid size.");
    }

    const checksum = await calculateChecksum(backupPath);

    await runPostgresCommand({
      executable: process.env.PG_RESTORE_PATH || "pg_restore",
      args: ["--list", backupPath],
      env: getPostgresConnectionEnv(),
    });

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
      size: stats.size,
    });

    return completedBackup;
  } catch (error) {
    await backupRepository.updateBackup(backup.id, {
      status: "FAILED",
      errorMessage: error.message.slice(0, 1000),
    });

    await fs.rm(backupPath, { force: true }).catch(() => {});

    logger.error("Backup creation failed.", {
      backupId: backup.id,
      error: error.message,
    });

    throw error;
  }
};

const getBackup = async (id) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  return backup;
};

const getBackups = async ({ skip = 0, take = 50 } = {}) =>
  backupRepository.listBackups({
    skip,
    take,
  });


const getBackupDownload = async ({ id, adminId }) => {
  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status !== "COMPLETED") {
    throw new Error("Only completed backups can be downloaded.");
  }

  const stats = await getBackupFileStats(backup.filename);

  if (backup.checksum) {
    const checksum = await calculateChecksum(stats.path);
    if (checksum !== backup.checksum) {
      throw new Error("Backup integrity validation failed.");
    }
  }

  await auditBackupAction({
    adminId,
    action: "ACCESS",
    backupId: backup.id,
    metadata: {
      operation: "DOWNLOAD",
      filename: backup.filename,
    },
  });

  return {
    path: stats.path,
    filename: backup.filename,
    size: stats.size,
  };
};

const restoreBackup = async ({ id, confirmation, adminId }) => {
  if (confirmation !== "RESTORE") {
    throw new Error("Restore confirmation is required.");
  }

  const backup = await backupRepository.getBackupById(id);

  if (!backup) {
    throw new Error("Backup not found.");
  }

  if (backup.status !== "COMPLETED") {
    throw new Error("Only completed backups can be restored.");
  }

  const stats = await getBackupFileStats(backup.filename);

  if (backup.checksum) {
    const checksum = await calculateChecksum(stats.path);

    if (checksum !== backup.checksum) {
      throw new Error("Backup integrity validation failed.");
    }
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const url = new URL(databaseUrl);

  const databaseName = decodeURIComponent(
    url.pathname.replace(/^\//, ""),
  );

  const commandEnv = getPostgresConnectionEnv();

  const pgRestorePath = process.env.PG_RESTORE_PATH || "pg_restore";

  await runPostgresCommand({
    executable: pgRestorePath,
    args: [
      "--list",
      stats.path,
    ],
    timeout: 60 * 1000,
    env: commandEnv,
  });

  await runPostgresCommand({
    executable: pgRestorePath,
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

  logger.warn("Backup restored successfully.", {
    backupId: backup.id,
    filename: backup.filename,
  });

  await auditBackupAction({
    adminId,
    action: "RESTORE",
    backupId: backup.id,
    metadata: {
      filename: backup.filename,
    },
  });

  return {
    id: backup.id,
    filename: backup.filename,
    status: "RESTORED",
  };
};

const cleanupExpiredBackups = async () => {
  const cutoff = new Date(
    Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const backups = await backupRepository.listBackupsBefore(cutoff);
  let deleted = 0;

  for (const backup of backups) {
    try {
      const backupPath = resolveBackupPath(backup.filename);

      await fs.rm(backupPath, { force: true });
      await backupRepository.deleteBackup(backup.id);

      deleted += 1;
    } catch (error) {
      logger.error("Backup cleanup failed.", {
        backupId: backup.id,
        filename: backup.filename,
        error: String(error.message || error).slice(0, 500),
      });
    }
  }

  logger.info("Backup retention cleanup completed.", {
    deleted,
    retentionDays: BACKUP_RETENTION_DAYS,
  });

  return { deleted };
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
  getBackupDownload,
  restoreBackup,
  cleanupExpiredBackups,
  deleteBackup,
};






