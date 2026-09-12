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
    filename.trim() === "" ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0") ||
    path.basename(filename) !== filename ||
    !/^[a-zA-Z0-9._-]+\.(?:dump|dump\.tmp)$/.test(filename)
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

const atomicMoveFile = async (sourcePath, destinationPath) => {
  try {
    await fs.rename(sourcePath, destinationPath);
  } catch (err) {
    // Cross-platform handling (Windows NTFS vs POSIX)
    if (err.code === "EEXIST" || err.code === "EPERM") {
      await fs.rm(destinationPath, { force: true });
      await fs.rename(sourcePath, destinationPath);
    } else if (err.code === "EXDEV") {
      await fs.copyFile(sourcePath, destinationPath);
      await fs.rm(sourcePath, { force: true });
    } else {
      throw err;
    }
  }
};

const getBackupFileStats = async (filename) => {
  const filePath = resolveBackupPath(filename);
  const stats = await fs.stat(filePath);

  if (!stats.isFile()) {
    throw new Error("Backup artifact is not a regular file.");
  }

  if (stats.size <= 0) {
    throw new Error("Backup file is empty.");
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

const cleanupStaleTempFiles = async (maxAgeMs = 60 * 60 * 1000) => {
  try {
    await ensureBackupDirectory();
    const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
    const now = Date.now();
    let cleaned = 0;

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".dump.tmp")) {
        const fullPath = path.join(BACKUP_ROOT, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.rm(fullPath, { force: true });
            cleaned += 1;
          }
        } catch {
          // ignore concurrent deletion
        }
      }
    }
    return cleaned;
  } catch {
    return 0;
  }
};

module.exports = {
  BACKUP_ROOT,
  ensureBackupDirectory,
  generateBackupFilename,
  resolveBackupPath,
  atomicMoveFile,
  getBackupFileStats,
  listBackupFiles,
  cleanupStaleTempFiles,
};
