const express = require("express");

const notificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  notificationIdSchema,
  notificationQuerySchema,
  pushDeviceSchema,
} = require("../validators/notification.validator");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User Notification APIs
 */

router.use(authenticate);

router.post(
  "/devices",
  validate(pushDeviceSchema),
  notificationController.registerPushDevice,
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Returns paginated notifications for the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/", validate(notificationQuerySchema), notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Returns the total unread notifications of the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get(
    "/unread-count",
    notificationController.getUnreadCount
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Marks a specific notification as read.
 *     tags: [Notifications]
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
 *         description: Notification marked as read.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Notification not found.
 */
router.patch(
    "/:id/read",
    validate(notificationIdSchema),
    notificationController.markAsRead
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read.
 *       401:
 *         description: Unauthorized.
 */
router.patch(
    "/read-all",
    notificationController.markAllAsRead
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     description: Deletes a notification belonging to the authenticated user.
 *     tags: [Notifications]
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
 *         description: Notification deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Notification not found.
 */
router.delete(
    "/:id",
    validate(notificationIdSchema),
    notificationController.deleteNotification
);

module.exports = router;