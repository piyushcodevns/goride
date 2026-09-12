const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");
const ADMIN_PERMISSIONS = require("../../constants/adminPermissions");
const {
  backupIdSchema,
  backupQuerySchema,
  restoreBackupSchema,
} = require("../../validators/admin/adminBackup.validator");

const {
  createBackup,
  getBackups,
  getBackup,
  downloadBackup,
  verifyBackup,
  restoreBackup,
  deleteBackup,
} = require("../../controllers/admin/adminBackup.controller");

router.use(adminAuthMiddleware);

/**
 * @swagger
 * /api/admin/backups:
 *   post:
 *     summary: Create a manual database backup
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup created successfully
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_CREATE),
  createBackup
);

/**
 * @swagger
 * /api/admin/backups:
 *   get:
 *     summary: Get backup history
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Backup history
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_VIEW),
  validate(backupQuerySchema),
  getBackups
);

/**
 * @swagger
 * /api/admin/backups/{id}:
 *   get:
 *     summary: Get backup details
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup details
 *       404:
 *         description: Backup not found
 *       403:
 *         description: Forbidden
 */
/**
 * @swagger
 * /api/admin/backups/{id}/download:
 *   get:
 *     summary: Download a completed backup
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup archive
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Backup not found
 */
router.get(
  "/:id/download",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_VIEW),
  validate(backupIdSchema),
  downloadBackup
);

/**
 * @swagger
 * /api/admin/backups/{id}/restore:
 *   post:
 *     summary: Restore a database backup
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmation
 *             properties:
 *               confirmation:
 *                 type: string
 *                 example: RESTORE
 *     responses:
 *       200:
 *         description: Backup restored successfully
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Restore confirmation or backup validation failed
 */
router.post(
  "/:id/restore",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_RESTORE),
  validate(restoreBackupSchema),
  restoreBackup
);

/**
 * @swagger
 * /api/admin/backups/{id}:
 *   delete:
 *     summary: Delete a backup
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Backup not found
 */
router.delete(
  "/:id",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_DELETE),
  validate(backupIdSchema),
  deleteBackup
);


/**
 * @swagger
 * /api/admin/backups/{id}/verify:
 *   get:
 *     summary: Verify backup file integrity and SHA-256 checksum
 *     tags: [Admin Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup integrity verification result
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Backup not found
 */
router.get(
  "/:id/verify",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_VIEW),
  validate(backupIdSchema),
  verifyBackup
);

router.get(
  "/:id",
  requirePermission(ADMIN_PERMISSIONS.BACKUP_VIEW),
  validate(backupIdSchema),
  getBackup
);

module.exports = router;


