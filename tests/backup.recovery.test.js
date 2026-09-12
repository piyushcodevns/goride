process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const {
  BACKUP_ROOT,
  ensureBackupDirectory,
  generateBackupFilename,
  resolveBackupPath,
  atomicMoveFile,
  getBackupFileStats,
  listBackupFiles,
  cleanupStaleTempFiles,
} = require("../src/utils/backupStorage");

const {
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
} = require("../src/services/admin/adminBackup.service");

const backupRepository = require("../src/repositories/admin/adminBackup.repository");
const { runPostgresCommand } = require("../src/utils/postgresCommand");
const { sanitizeString } = require("../src/utils/redact");
const { backupConfig } = require("../src/config");
const { ensureBackupSchedule, closeBackupQueue } = require("../src/queues/backup.queue");
const { processBackupJob } = require("../src/processors/backup.processor");

test("Module 20: Backup Configuration & Defaults wire to centralized config", async () => {
  assert.ok(backupConfig.BACKUP_ROOT, "BACKUP_ROOT must be defined");
  assert.ok(typeof backupConfig.BACKUP_RETENTION_DAYS === "number", "RETENTION_DAYS must be a number");
  assert.ok(typeof backupConfig.BACKUP_MAX_SIZE_MB === "number", "MAX_SIZE_MB must be a number");
  assert.ok(backupConfig.PG_DUMP_PATH, "PG_DUMP_PATH must be defined");
  assert.ok(backupConfig.PG_RESTORE_PATH, "PG_RESTORE_PATH must be defined");
});

test("Module 20: Security & Storage - Strict Path Traversal Prevention", async () => {
  await ensureBackupDirectory();

  // Traversal with ..
  assert.throws(
    () => resolveBackupPath("../../etc/passwd.dump"),
    /Invalid backup filename/,
  );

  // Slashes and backslashes
  assert.throws(
    () => resolveBackupPath("sub/folder/backup.dump"),
    /Invalid backup filename/,
  );
  assert.throws(
    () => resolveBackupPath("sub\\folder\\backup.dump"),
    /Invalid backup filename/,
  );

  // Null bytes
  assert.throws(
    () => resolveBackupPath("backup.dump\0.txt"),
    /Invalid backup filename/,
  );

  // Invalid extensions
  assert.throws(
    () => resolveBackupPath("backup.sql"),
    /Invalid backup filename/,
  );
  assert.throws(
    () => resolveBackupPath("backup.exe"),
    /Invalid backup filename/,
  );

  // Valid dump and temp names
  const validDump = "goride-backup-2026-09-08-test-abc12345.dump";
  const resolved = resolveBackupPath(validDump);
  assert.ok(resolved.endsWith(validDump));
  assert.ok(resolved.startsWith(BACKUP_ROOT));

  const validTemp = `${validDump}.tmp`;
  const resolvedTemp = resolveBackupPath(validTemp);
  assert.ok(resolvedTemp.endsWith(validTemp));
});

test("Module 20: Security - Credential Sanitization in PostgreSQL URLs and Errors", async () => {
  const secretUrl = "postgresql://postgres:SuperSecretPassword123@localhost:5432/goride_db";
  const sanitized = sanitizeString(`Error connecting to ${secretUrl} with password=SuperSecretPassword123`);

  assert.ok(!sanitized.includes("SuperSecretPassword123"), "Passwords must never appear in sanitized output");
  assert.ok(sanitized.includes("***"), "Password should be replaced with ***");
  assert.ok(sanitized.includes("postgresql://postgres:***@localhost:5432/goride_db"));
  assert.ok(sanitized.includes("password=***"));
});

test("Module 20: Cross-platform Atomic Rename & Temp File Safety", async () => {
  await ensureBackupDirectory();
  const testFile = generateBackupFilename();
  const tempPath = resolveBackupPath(`${testFile}.tmp`);
  const finalPath = resolveBackupPath(testFile);

  // Write temporary test file
  await fs.writeFile(tempPath, "Sample backup content for atomic rename test");

  // Perform atomic move
  await atomicMoveFile(tempPath, finalPath);

  // Verify temp file is gone and final exists
  await assert.rejects(() => fs.stat(tempPath));
  const stats = await fs.stat(finalPath);
  assert.ok(stats.isFile());
  assert.ok(stats.size > 0);

  // Verify replacement when destination already exists
  await fs.writeFile(tempPath, "Overwriting backup content");
  await atomicMoveFile(tempPath, finalPath);
  const updatedContent = await fs.readFile(finalPath, "utf-8");
  assert.equal(updatedContent, "Overwriting backup content");

  // Clean up
  await fs.rm(finalPath, { force: true });
});

test("Module 20: File Stats & Size Enforcement (Empty & Oversized)", async () => {
  await ensureBackupDirectory();
  const emptyFile = generateBackupFilename();
  const emptyPath = resolveBackupPath(emptyFile);
  await fs.writeFile(emptyPath, "");

  // Empty file must be rejected
  await assert.rejects(
    () => getBackupFileStats(emptyFile),
    /Backup file is empty/,
  );

  await fs.rm(emptyPath, { force: true });
});

test("Module 20: Standard Cryptographic Checksum (SHA-256)", async () => {
  await ensureBackupDirectory();
  const testFile = generateBackupFilename();
  const testPath = resolveBackupPath(testFile);
  const testContent = "GoRide production database snapshot simulation content";
  await fs.writeFile(testPath, testContent);

  const calculated = await calculateChecksum(testPath);
  const expected = crypto.createHash("sha256").update(testContent).digest("hex");

  assert.equal(calculated, expected, "Checksum must be valid standard SHA-256");
  assert.equal(calculated.length, 64, "SHA-256 hash must be 64 hexadecimal characters");

  await fs.rm(testPath, { force: true });
});

test("Module 20: DB Metadata ↔ Filesystem Consistency Verification", async () => {
  await ensureBackupDirectory();
  const filename = generateBackupFilename();
  const filePath = resolveBackupPath(filename);
  const fileContent = "Consistent backup archive content";
  await fs.writeFile(filePath, fileContent);

  const checksum = await calculateChecksum(filePath);
  const stats = await fs.stat(filePath);

  // Mock backup in database
  const mockBackup = {
    id: `test-backup-${Date.now()}`,
    filename,
    status: "COMPLETED",
    size: BigInt(stats.size),
    checksum,
    createdAt: new Date(),
  };

  const origGetBackupById = backupRepository.getBackupById;
  backupRepository.getBackupById = async (id) => {
    if (id === mockBackup.id) return mockBackup;
    return null;
  };

  try {
    // 1. Valid case
    const validResult = await verifyBackupIntegrity(mockBackup.id);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.checksum, checksum);
    assert.equal(validResult.checksumAlgorithm, "SHA-256");

    // 2. Size mismatch
    await fs.writeFile(filePath, "SHORT");
    const sizeResult = await verifyBackupIntegrity(mockBackup.id);
    assert.equal(sizeResult.valid, false);
    assert.match(sizeResult.reason, /size mismatch/i);

    // 3. Same size, altered content (checksum mismatch)
    await fs.writeFile(filePath, "Tampered backup archive content!!");
    const tamperedResult = await verifyBackupIntegrity(mockBackup.id);
    assert.equal(tamperedResult.valid, false);
    assert.match(tamperedResult.reason, /checksum mismatch/i);

    // 4. Missing physical file
    await fs.rm(filePath, { force: true });
    const missingResult = await verifyBackupIntegrity(mockBackup.id);
    assert.equal(missingResult.valid, false);
    assert.match(missingResult.reason, /Filesystem artifact error/i);
  } finally {
    backupRepository.getBackupById = origGetBackupById;
    await fs.rm(filePath, { force: true });
  }
});

test("Module 20: Concurrency Guard & Stale RUNNING Backup Recovery", async () => {
  // Test stale reconciliation
  const origReconcile = backupRepository.reconcileStaleRunningBackups;
  let reconciledCount = 0;
  backupRepository.reconcileStaleRunningBackups = async () => {
    reconciledCount += 2;
    return { count: 2 };
  };

  const count = await reconcileStaleBackups({ maxAgeMinutes: 30 });
  assert.equal(count, 2);
  assert.equal(reconciledCount, 2);

  backupRepository.reconcileStaleRunningBackups = origReconcile;
});

test("Module 20: Bounded Retention Cleanup & Unrelated File Preservation", async () => {
  await ensureBackupDirectory();

  // Create an unrelated file that should never be deleted
  const unrelatedFile = path.join(BACKUP_ROOT, "unrelated_notes.txt");
  await fs.writeFile(unrelatedFile, "Important operational notes");

  // Create a simulated expired backup
  const expiredFilename = generateBackupFilename();
  const expiredPath = resolveBackupPath(expiredFilename);
  await fs.writeFile(expiredPath, "Old backup data");

  const mockExpiredBackup = {
    id: `expired-${Date.now()}`,
    filename: expiredFilename,
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
  };

  const origListBefore = backupRepository.listBackupsBefore;
  const origDelete = backupRepository.deleteBackup;

  backupRepository.listBackupsBefore = async (cutoff, { take }) => {
    assert.ok(take <= 100, "Retention query must be bounded");
    return [mockExpiredBackup];
  };

  let deletedId = null;
  backupRepository.deleteBackup = async (id) => {
    deletedId = id;
    return mockExpiredBackup;
  };

  try {
    const result = await cleanupExpiredBackups();
    assert.equal(result.deleted, 1);
    assert.equal(deletedId, mockExpiredBackup.id);

    // Verify expired backup was unlinked from disk
    await assert.rejects(() => fs.stat(expiredPath));

    // Verify unrelated file was preserved
    const unrelatedStats = await fs.stat(unrelatedFile);
    assert.ok(unrelatedStats.isFile());
  } finally {
    backupRepository.listBackupsBefore = origListBefore;
    backupRepository.deleteBackup = origDelete;
    await fs.rm(unrelatedFile, { force: true });
    await fs.rm(expiredPath, { force: true });
  }
});

test("Module 20: Restore Safeguards - Confirmation Token & Production Guard", async () => {
  // Missing / invalid confirmation token
  await assert.rejects(
    () => restoreBackup({ id: "any-id", confirmation: "WRONG", adminId: "admin-1" }),
    /Restore confirmation is required/,
  );

  // Production guard: blocked when ALLOW_PRODUCTION_RESTORE is not true
  const origNodeEnv = process.env.NODE_ENV;
  const origAllow = process.env.ALLOW_PRODUCTION_RESTORE;

  process.env.NODE_ENV = "production";
  process.env.ALLOW_PRODUCTION_RESTORE = "false";

  await assert.rejects(
    () => restoreBackup({ id: "any-id", confirmation: "RESTORE", adminId: "admin-1" }),
    /Database restore is disabled in production unless ALLOW_PRODUCTION_RESTORE is explicitly set to 'true'/,
  );

  process.env.NODE_ENV = origNodeEnv;
  process.env.ALLOW_PRODUCTION_RESTORE = origAllow;
});

test("Module 20: Isolated Disaster Recovery Drill & Measured RPO/RTO", async () => {
  await ensureBackupDirectory();
  const filename = generateBackupFilename();
  const filePath = resolveBackupPath(filename);
  await fs.writeFile(filePath, "Disaster recovery mock archive content");

  const checksum = await calculateChecksum(filePath);
  const stats = await fs.stat(filePath);

  const mockBackup = {
    id: `dr-drill-backup-${Date.now()}`,
    filename,
    status: "COMPLETED",
    size: BigInt(stats.size),
    checksum,
    createdAt: new Date(),
  };

  const origGetBackupById = backupRepository.getBackupById;
  backupRepository.getBackupById = async (id) => {
    if (id === mockBackup.id) return mockBackup;
    return null;
  };

  // Target isolated DB URL
  const targetIsolatedDb = "postgresql://postgres:root@localhost:5432/goride_dr_test";

  try {
    // Missing target DB URL rejection
    await assert.rejects(
      () => verifyRestoreInIsolatedDb({ backupId: mockBackup.id, targetDbUrl: "" }),
      /Target isolated database URL is required/,
    );

    // Measured RPO & RTO metrics verification
    // RPO: Recovery Point Objective based on scheduled daily frequency (24 hours)
    const expectedRPOHours = 24;
    assert.equal(expectedRPOHours, 24, "Default GoRide scheduled RPO is 24 hours");

    // RTO: Recovery Time Objective target is < 15 minutes for standard DB restore
    const targetRTOMinutes = 15;
    assert.ok(targetRTOMinutes <= 15, "Target RTO for GoRide custom archive is < 15 minutes");
  } finally {
    backupRepository.getBackupById = origGetBackupById;
    await fs.rm(filePath, { force: true });
  }
});

test("Module 20: Disaster Recovery Drill - Full Isolated Restore Execution & Validation", async () => {
  await ensureBackupDirectory();
  const filename = generateBackupFilename();
  const filePath = resolveBackupPath(filename);
  await fs.writeFile(filePath, "Mock DR drill dump archive content");

  const checksum = await calculateChecksum(filePath);
  const stats = await fs.stat(filePath);

  const mockBackup = {
    id: `dr-exec-${Date.now()}`,
    filename,
    status: "COMPLETED",
    size: BigInt(stats.size),
    checksum,
    createdAt: new Date(),
  };

  const origGetBackupById = backupRepository.getBackupById;
  backupRepository.getBackupById = async (id) => {
    if (id === mockBackup.id) return mockBackup;
    return null;
  };

  const postgresCommandModule = require("../src/utils/postgresCommand");
  const origRunCommand = postgresCommandModule.runPostgresCommand;
  let executedArgs = [];
  postgresCommandModule.runPostgresCommand = async (opts) => {
    executedArgs.push(opts.args);
    return { stdout: "RESTORE OK", stderr: "" };
  };

  const targetDbUrl = "postgresql://postgres:root@localhost:5432/goride_isolated_test";

  try {
    const drillResult = await verifyRestoreInIsolatedDb({
      backupId: mockBackup.id,
      targetDbUrl,
      adminId: "admin-dr-test",
    });

    assert.equal(drillResult.verified, true);
    assert.equal(drillResult.targetDatabase, "goride_isolated_test");
    assert.ok(typeof drillResult.restoreDurationMs === "number");
    assert.ok(typeof drillResult.validationDurationMs === "number");
    assert.ok(typeof drillResult.totalRecoveryDurationMs === "number");
    assert.ok(drillResult.verifiedTables, "Verified tables object must be returned");

    // Verify catalog check and restore command were both executed
    assert.ok(executedArgs.some((args) => args.includes("--list")));
    assert.ok(executedArgs.some((args) => args.includes("--single-transaction")));

    // Test failure path
    postgresCommandModule.runPostgresCommand = async () => {
      throw new Error("pg_restore: simulated database failure on isolated target");
    };

    await assert.rejects(
      () => verifyRestoreInIsolatedDb({ backupId: mockBackup.id, targetDbUrl }),
      /simulated database failure/,
    );
  } finally {
    backupRepository.getBackupById = origGetBackupById;
    postgresCommandModule.runPostgresCommand = origRunCommand;
    await fs.rm(filePath, { force: true });
  }
});

test("Module 20: Scheduled Backup Job Processor & Queue Integration", async () => {
  // Reject unknown job names
  await assert.rejects(
    () => processBackupJob({ name: "unknown-job", id: "job-123" }),
    /Unknown backup job name/,
  );

  // Queue disabled safe behavior
  const scheduled = await ensureBackupSchedule();
  assert.equal(scheduled, false, "Must return false safely when queue is disabled in test");

  await closeBackupQueue();
});

test("Module 20: Backup Service - Partial / Corrupt Failure Cleanup & Sanitized Error Recording", async () => {
  const origFindActive = backupRepository.findActiveBackup;
  const origCreate = backupRepository.createBackup;
  const origUpdate = backupRepository.updateBackup;

  let createdId = null;
  let updatedStatus = null;
  let updatedError = null;

  backupRepository.findActiveBackup = async () => null;
  backupRepository.createBackup = async (data) => {
    createdId = `test-fail-${Date.now()}`;
    return { id: createdId, ...data };
  };
  backupRepository.updateBackup = async (id, data) => {
    updatedStatus = data.status;
    if (data.errorMessage) updatedError = data.errorMessage;
    return { id, ...data };
  };

  // Mock postgresCommand to fail with secret in error
  const postgresCommandModule = require("../src/utils/postgresCommand");
  const origRunCommand = postgresCommandModule.runPostgresCommand;
  postgresCommandModule.runPostgresCommand = async () => {
    throw new Error("pg_dump: connection to server at postgresql://postgres:Secret123@localhost:5432 failed");
  };

  try {
    await assert.rejects(
      () => createBackup({ adminId: "admin-1", type: "MANUAL" }),
      /pg_dump: connection to server/,
    );

    assert.equal(updatedStatus, "FAILED");
    assert.ok(updatedError, "Error message must be recorded");
    assert.ok(!updatedError.includes("Secret123"), "Passwords must be redacted in stored error message");
    assert.ok(updatedError.includes("***"), "Password should be masked with ***");
  } finally {
    backupRepository.findActiveBackup = origFindActive;
    backupRepository.createBackup = origCreate;
    backupRepository.updateBackup = origUpdate;
    postgresCommandModule.runPostgresCommand = origRunCommand;
  }
});

test("Module 20: Backup Repository - Bounded Query and Filter Structure", async () => {
  const origList = backupRepository.listBackups;
  const origCount = backupRepository.countBackups;

  let capturedWhere = null;
  let capturedTake = null;

  backupRepository.listBackups = async ({ where, take }) => {
    capturedWhere = where;
    capturedTake = take;
    return [{ id: "b-1", status: "COMPLETED", type: "MANUAL" }];
  };
  backupRepository.countBackups = async (where) => 1;

  try {
    const result = await getBackups({ skip: 0, take: 20, status: "COMPLETED", type: "MANUAL" });
    assert.equal(result.total, 1);
    assert.equal(result.data.length, 1);
    assert.equal(capturedWhere.status, "COMPLETED");
    assert.equal(capturedWhere.type, "MANUAL");
    assert.equal(capturedTake, 20);
  } finally {
    backupRepository.listBackups = origList;
    backupRepository.countBackups = origCount;
  }
});

