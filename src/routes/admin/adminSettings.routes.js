const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const { validate } = require("../../middleware/validate.middleware");

const {
  createSettingSchema,
  updateSettingSchema,
  settingKeyParamSchema,
  getAllSettingsQuerySchema,
} = require("../../validators/admin/adminSettings.validator");

const {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
} = require("../../controllers/admin/adminSettings.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Settings Management
 *   description: Admin system settings management APIs
 */

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all system settings
 *     description: Returns system settings with optional category filtering. Secret values are masked.
 *     tags:
 *       - Admin Settings Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [GENERAL, COMPANY, MAINTENANCE, UPLOAD]
 *     responses:
 *       200:
 *         description: System settings fetched successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  adminAuthMiddleware,
  requirePermission("settings:view"),
  validate(getAllSettingsQuerySchema),
  getAllSettings,
);

/**
 * @swagger
 * /api/admin/settings/{key}:
 *   get:
 *     summary: Get a system setting by key
 *     description: Returns a system setting. Secret values are masked.
 *     tags:
 *       - Admin Settings Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z][A-Z0-9_.-]*$'
 *     responses:
 *       200:
 *         description: System setting fetched successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: System setting not found
 */
router.get(
  "/:key",
  adminAuthMiddleware,
  requirePermission("settings:view"),
  validate(settingKeyParamSchema),
  getSettingByKey,
);

/**
 * @swagger
 * /api/admin/settings:
 *   post:
 *     summary: Create a system setting
 *     description: Creates a new system setting. Secret values are never returned in plain text.
 *     tags:
 *       - Admin Settings Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - category
 *             properties:
 *               key:
 *                 type: string
 *                 example: APP_NAME
 *               category:
 *                 type: string
 *                 enum: [GENERAL, COMPANY, MAINTENANCE, UPLOAD]
 *                 example: GENERAL
 *               value:
 *                 type: string
 *                 nullable: true
 *                 example: GoRide
 *               isSecret:
 *                 type: boolean
 *                 example: false
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Application display name
 *     responses:
 *       201:
 *         description: System setting created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: System setting with this key already exists
 */
router.post(
  "/",
  adminAuthMiddleware,
  requirePermission("settings:manage"),
  validate(createSettingSchema),
  createSetting,
);

/**
 * @swagger
 * /api/admin/settings/{key}:
 *   patch:
 *     summary: Update a system setting
 *     description: Updates an existing system setting. Secret values remain masked in the response.
 *     tags:
 *       - Admin Settings Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z][A-Z0-9_.-]*$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *                 enum: [GENERAL, COMPANY, MAINTENANCE, UPLOAD]
 *               isSecret:
 *                 type: boolean
 *               description:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: System setting updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: System setting not found
 */
router.patch(
  "/:key",
  adminAuthMiddleware,
  requirePermission("settings:manage"),
  validate(updateSettingSchema),
  updateSetting,
);

module.exports = router;
