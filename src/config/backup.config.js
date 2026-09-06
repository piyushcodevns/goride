const path = require("path");

const BACKUP_ROOT = path.resolve(
  process.env.BACKUP_DIR || path.join(process.cwd(), "backups"),
);

const BACKUP_RETENTION_DAYS = Number(
  process.env.BACKUP_RETENTION_DAYS || 30,
);

const BACKUP_MAX_SIZE_MB = Number(
  process.env.BACKUP_MAX_SIZE_MB || 2048,
);

module.exports = {
  BACKUP_ROOT,
  BACKUP_RETENTION_DAYS,
  BACKUP_MAX_SIZE_MB,
};
