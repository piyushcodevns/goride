const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");

const controller = require("../../controllers/admin/adminSupport.controller");

const {
  createTicketSchema,
  listTicketsSchema,
  ticketIdSchema,
  ticketNumberSchema,
  updateStatusSchema,
  replyTicketSchema,
} = require("../../validators/admin/adminSupport.validator");

router.use(adminAuthMiddleware);

/**
 * @swagger
 * tags:
 *   - name: Admin Support
 *     description: Support tickets, complaints, reports, replies, status, and history management
 */

/**
 * @swagger
 * /api/admin/support/stats:
 *   get:
 *     summary: Get support ticket statistics
 *     description: Retrieve aggregated support ticket counts by status and type.
 *     tags:
 *       - Admin Support
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Support statistics fetched successfully.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get("/stats", requirePermission("support:view"), controller.getStats);

/**
 * @swagger
 * /api/admin/support:
 *   get:
 *     summary: Get support tickets
 *     description: Retrieve paginated support tickets with search, type, status, user, driver, ride, and sorting filters.
 *     tags:
 *       - Admin Support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Search by ticket number, subject, description, or related user information.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [GENERAL, COMPLAINT, USER_REPORT, DRIVER_REPORT]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *       - in: query
 *         name: rideId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Support tickets fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get(
  "/",
  requirePermission("support:view"),
  validate(listTicketsSchema),
  controller.getTickets,
);

/**
 * @swagger
 * /api/admin/support:
 *   post:
 *     summary: Create support ticket
 *     description: Create a general ticket, complaint, user report, or driver report.
 *     tags:
 *       - Admin Support
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional related user ID.
 *               driverId:
 *                 type: string
 *                 description: Optional related driver ID.
 *               rideId:
 *                 type: string
 *                 description: Optional related ride ID.
 *               type:
 *                 type: string
 *                 enum: [GENERAL, COMPLAINT, USER_REPORT, DRIVER_REPORT]
 *                 default: GENERAL
 *               subject:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Support ticket created successfully.
 *       400:
 *         description: Invalid ticket data or related reference.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.post(
  "/",
  requirePermission("support:manage"),
  validate(createTicketSchema),
  controller.createTicket,
);

/**
 * @swagger
 * /api/admin/support/number/{ticketNumber}:
 *   get:
 *     summary: Get support ticket by ticket number
 *     description: Retrieve a support ticket using its unique human-readable ticket number.
 *     tags:
 *       - Admin Support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Support ticket fetched successfully.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get(
  "/number/:ticketNumber",
  requirePermission("support:view"),
  validate(ticketNumberSchema),
  controller.getTicketByNumber,
);

/**
 * @swagger
 * /api/admin/support/{id}:
 *   get:
 *     summary: Get support ticket details
 *     description: Retrieve complete support ticket details including related records.
 *     tags:
 *       - Admin Support
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
 *         description: Support ticket details fetched successfully.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get(
  "/:id",
  requirePermission("support:view"),
  validate(ticketIdSchema),
  controller.getTicketById,
);

/**
 * @swagger
 * /api/admin/support/{id}/status:
 *   patch:
 *     summary: Update support ticket status
 *     description: Change a support ticket status while enforcing the module's valid status transition rules.
 *     tags:
 *       - Admin Support
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional status-change message recorded in ticket history.
 *     responses:
 *       200:
 *         description: Support ticket status updated successfully.
 *       400:
 *         description: Invalid status or invalid status transition.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.patch(
  "/:id/status",
  requirePermission("support:manage"),
  validate(updateStatusSchema),
  controller.updateStatus,
);

/**
 * @swagger
 * /api/admin/support/{id}/replies:
 *   post:
 *     summary: Reply to support ticket
 *     description: Add an administrative reply to an open or active support ticket and record the reply in ticket history.
 *     tags:
 *       - Admin Support
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
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Ticket reply created successfully.
 *       400:
 *         description: Invalid reply or ticket cannot receive replies.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.post(
  "/:id/replies",
  requirePermission("support:manage"),
  validate(replyTicketSchema),
  controller.replyToTicket,
);

/**
 * @swagger
 * /api/admin/support/{id}/replies:
 *   get:
 *     summary: Get ticket replies
 *     description: Retrieve all administrative replies associated with a support ticket.
 *     tags:
 *       - Admin Support
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
 *         description: Ticket replies fetched successfully.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get(
  "/:id/replies",
  requirePermission("support:view"),
  validate(ticketIdSchema),
  controller.getTicketReplies,
);

/**
 * @swagger
 * /api/admin/support/{id}/history:
 *   get:
 *     summary: Get ticket history
 *     description: Retrieve the chronological history of ticket creation, status changes, replies, resolution, and closure actions.
 *     tags:
 *       - Admin Support
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
 *         description: Ticket history fetched successfully.
 *       404:
 *         description: Support ticket not found.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Insufficient support permission.
 */
router.get(
  "/:id/history",
  requirePermission("support:view"),
  validate(ticketIdSchema),
  controller.getTicketHistory,
);

module.exports = router;
