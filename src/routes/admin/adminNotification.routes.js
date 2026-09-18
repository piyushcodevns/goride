const express = require("express");
const router = express.Router();
const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");
const {
  createSmsCampaignSchema,
  campaignIdSchema,
  pushNotificationSchema,
  campaignQuerySchema,
} = require("../../validators/admin/adminNotification.validator");
const {
  createSmsCampaign,
  sendSmsCampaign,
  retrySmsCampaign,
  sendPushNotification,
  getSmsCampaign,
  listSmsCampaigns,
} = require("../../controllers/admin/adminNotification.controller");

/**
 * @swagger
 * /api/admin/notifications/campaigns:
 *   post:
 *     summary: Create an SMS campaign
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message, userIds]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               userIds: { type: array, items: { type: string } }
 *               scheduledAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Campaign created }
 *       400: { description: Validation failed }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
  "/campaigns",
  adminAuthMiddleware,
  requirePermission("notification:manage"),
  validate(createSmsCampaignSchema),
  createSmsCampaign,
);

router.get(
  "/campaigns",
  adminAuthMiddleware,
  requirePermission("notification:view"),
  validate(campaignQuerySchema),
  listSmsCampaigns,
);
/**
 * @swagger
 * /api/admin/notifications/campaigns:
 *   get:
 *     summary: List SMS campaigns
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, SCHEDULED, SENDING, SENT, PARTIAL, FAILED] }
 *     responses:
 *       200: { description: Campaign history }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/campaigns/:id",
  adminAuthMiddleware,
  requirePermission("notification:view"),
  validate(campaignIdSchema),
  getSmsCampaign,
);
/**
 * @swagger
 * /api/admin/notifications/campaigns/{id}:
 *   get:
 *     summary: Get SMS campaign details and recipient statuses
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Campaign details }
 *       404: { description: Campaign not found }
 */

/**
 * @swagger
 * /api/admin/notifications/campaigns/{id}/send:
 *   post:
 *     summary: Send an SMS campaign
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/campaigns/:id/send",
  adminAuthMiddleware,
  requirePermission("notification:manage"),
  validate(campaignIdSchema),
  sendSmsCampaign,
);

/**
 * @swagger
 * /api/admin/notifications/campaigns/{id}/retry:
 *   post:
 *     summary: Retry failed SMS campaign deliveries
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/campaigns/:id/retry",
  adminAuthMiddleware,
  requirePermission("notification:manage"),
  validate(campaignIdSchema),
  retrySmsCampaign,
);

/**
 * @swagger
 * /api/admin/notifications/push:
 *   post:
 *     summary: Send a push notification
 *     tags: [Admin Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  "/push",
  adminAuthMiddleware,
  requirePermission("notification:manage"),
  validate(pushNotificationSchema),
  sendPushNotification,
);

module.exports = router;
