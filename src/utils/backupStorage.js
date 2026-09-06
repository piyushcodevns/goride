const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const {
  BACKUP_ROOT,
  BACKUP_MAX_SIZE_MB,
} = require("../config/backup.config");

const ensureBackupDirectory = async () => {
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
};

const generateBackupFilename = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const random = crypto.randomBytes(8).toString("hex");

  return `goride-backup-${timestamp}-${random}.dump`;
};

const resolveBackupPath = (filename) => {
  if (
    typeof filename !== "string" ||
    !/^[a-zA-Z0-9._-]+\.dump$/.test(filename)
  ) {
    throw new Error("Invalid backup filename.");
  }

  const resolved = path.resolve(BACKUP_ROOT, filename);

  if (
    resolved !== BACKUP_ROOT &&
    !resolved.startsWith(`${BACKUP_ROOT}${path.sep}`)
  ) {
    throw new Error("Invalid backup path.");
  }

  return resolved;
};

const getBackupFileStats = async (filename) => {
  const filePath = resolveBackupPath(filename);
  const stats = await fs.stat(filePath);

  if (!stats.isFile()) {
    throw new Error("Backup artifact is not a regular file.");
  }

  const maxBytes = BACKUP_MAX_SIZE_MB * 1024 * 1024;

  if (stats.size > maxBytes) {
    throw new Error("Backup file exceeds configured maximum size.");
  }

  return {
    path: filePath,
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
};

const listBackupFiles = async () => {
  await ensureBackupDirectory();

  const entries = await fs.readdir(BACKUP_ROOT, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^[a-zA-Z0-9._-]+\.dump$/.test(entry.name),
    )
    .map((entry) => entry.name);
};

module.exports = {
  ensureBackupDirectory,
  generateBackupFilename,
  resolveBackupPath,
  getBackupFileStats,
  listBackupFiles,
};
