const path = require("path");

let envConfig;
try {
  const { config } = require("./env");
  envConfig = config;
} catch {
  envConfig = null;
}

const BACKUP_ROOT =
  envConfig?.backup?.root ||
  path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));

const BACKUP_RETENTION_DAYS = Number(
  envConfig?.backup?.retentionDays || process.env.BACKUP_RETENTION_DAYS || 30,
);

const BACKUP_MAX_SIZE_MB = Number(
  envConfig?.backup?.maxSizeMb || process.env.BACKUP_MAX_SIZE_MB || 2048,
);

const PG_DUMP_PATH =
  envConfig?.backup?.pgDumpPath || process.env.PG_DUMP_PATH || "pg_dump";

const PG_RESTORE_PATH =
  envConfig?.backup?.pgRestorePath || process.env.PG_RESTORE_PATH || "pg_restore";

module.exports = {
  BACKUP_ROOT,
  BACKUP_RETENTION_DAYS,
  BACKUP_MAX_SIZE_MB,
  PG_DUMP_PATH,
  PG_RESTORE_PATH,
};
